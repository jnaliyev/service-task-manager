import { NextResponse } from "next/server";
import OpenAI from "openai";

const ALLOWED_CATEGORIES = [
  "Construction",
  "Systems",
  "Furniture",
  "HVAC",
  "Electrical",
  "Plumbing",
  "Painting",
  "Other",
] as const;

const ALLOWED_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;

type AnalyzeTaskRequest = {
  issue?: string;
  category?: string;
  priority?: string;
  attachments?: string[];
};

type AnalyzeTaskResponse = {
  ai_category: string;
  ai_priority: string;
  ai_summary: string;
  ai_confidence: number;
};

function normalizeCategory(value: unknown): string {
  if (typeof value !== "string") return "Other";

  const match = ALLOWED_CATEGORIES.find(
    (category) => category.toLowerCase() === value.trim().toLowerCase()
  );

  return match || "Other";
}

function normalizePriority(value: unknown): string {
  if (typeof value !== "string") return "Normal";

  const match = ALLOWED_PRIORITIES.find(
    (priority) => priority.toLowerCase() === value.trim().toLowerCase()
  );

  return match || "Normal";
}

function normalizeConfidence(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return 0;

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

function normalizeSummary(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, 500);
}

function normalizeImageUrls(attachments?: string[]): string[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

function buildSystemPrompt(hasImages: boolean): string {
  const basePrompt = `You analyze retail maintenance task requests.

Return JSON with exactly these keys:
- ai_category: one of ${ALLOWED_CATEGORIES.join(", ")}
- ai_priority: one of ${ALLOWED_PRIORITIES.join(", ")}
- ai_summary: a short practical summary for technicians (max 2 sentences)
- ai_confidence: integer from 0 to 100 indicating confidence in the classification

Use "Other" only when the task does not clearly fit another category.
Use "Normal" priority unless the issue clearly indicates otherwise.`;

  if (hasImages) {
    return `${basePrompt}

When images are attached, analyze BOTH the issue description and the photos together.
Use visible equipment, damage, leaks, wiring, structural issues, and other visual clues
to determine ai_category, ai_priority, ai_summary, and ai_confidence.
Increase confidence when text and images support the same conclusion.`;
  }

  return `${basePrompt}

No images are attached. Analyze the issue description text only.`;
}

function buildUserContent(
  issue: string,
  category?: string,
  priority?: string,
  attachments: string[] = []
): string | OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const contextLines = [
    "Analyze this maintenance task request.",
    "",
    `Issue: ${issue}`,
  ];

  if (category) {
    contextLines.push(`Submitted category: ${category}`);
  }

  if (priority) {
    contextLines.push(`Submitted priority: ${priority}`);
  }

  if (attachments.length === 0) {
    return contextLines.join("\n");
  }

  contextLines.push(
    "",
    `Attached images (${attachments.length}): analyze these photos together with the issue text.`,
    "Consider visible damage, affected equipment, safety risks, and urgency shown in the images."
  );

  return [
    {
      type: "text",
      text: contextLines.join("\n"),
    },
    ...attachments.map((url) => ({
      type: "image_url" as const,
      image_url: {
        url,
        detail: "high" as const,
      },
    })),
  ];
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as AnalyzeTaskRequest;
    const issue = body.issue?.trim();

    if (!issue) {
      return NextResponse.json({ error: "Missing required field: issue" }, { status: 400 });
    }

    const attachments = normalizeImageUrls(body.attachments);
    const hasImages = attachments.length > 0;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(hasImages),
        },
        {
          role: "user",
          content: buildUserContent(
            issue,
            body.category,
            body.priority,
            attachments
          ),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "No analysis returned from AI service" },
        { status: 502 }
      );
    }

    let parsed: Partial<AnalyzeTaskResponse>;

    try {
      parsed = JSON.parse(rawContent) as Partial<AnalyzeTaskResponse>;
    } catch {
      return NextResponse.json(
        { error: "Invalid analysis response from AI service" },
        { status: 502 }
      );
    }

    const response: AnalyzeTaskResponse = {
      ai_category: normalizeCategory(parsed.ai_category),
      ai_priority: normalizePriority(parsed.ai_priority),
      ai_summary: normalizeSummary(parsed.ai_summary),
      ai_confidence: normalizeConfidence(parsed.ai_confidence),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analyze task API error:", error);

    return NextResponse.json(
      { error: "Error while analyzing task" },
      { status: 500 }
    );
  }
}
