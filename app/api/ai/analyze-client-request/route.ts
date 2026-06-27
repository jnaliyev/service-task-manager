import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildTaxonomyPrompt,
  normalizeClassification,
  normalizeConfidence,
  normalizePriority,
  PRIORITIES,
} from "@/lib/ai/taskTaxonomy";

type AnalyzeClientRequest = {
  issue?: string;
  attachments?: string[];
};

type AnalyzeClientResponse = {
  ai_category: string;
  ai_department: string;
  ai_priority: string;
  ai_summary: string;
  ai_confidence: number;
};

function normalizeImageUrls(attachments?: string[]): string[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

function normalizeSummaryValue(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, 500);
}

function buildSystemPrompt(hasImages: boolean): string {
  const basePrompt = `You analyze retail maintenance requests submitted by store clients.

You must NEVER invent departments or categories.
Always choose exactly ONE Department and exactly ONE Category from the approved taxonomy below.
Never return values outside this list.

APPROVED TAXONOMY:
${buildTaxonomyPrompt()}

Return JSON with exactly these keys:
- ai_department: one approved Department
- ai_category: one approved Category that belongs to the chosen Department
- ai_priority: one of ${PRIORITIES.join(", ")}
- ai_summary: a short practical summary written ONLY in Azerbaijani language (Azərbaycan dili). Maximum 2 sentences. Do not use English or other languages in ai_summary.
- ai_confidence: integer from 0 to 100

MAPPING EXAMPLES:
- detacher, deactivator, antenna/anten/antena, pedestal, gate, sensormatic, checkpoint, eas, article surveillance, loss prevention equipment -> Systems / EAS
- If EAS equipment (antenna, anten, antena, eas, detacher, deactivator, sensormatic, checkpoint, pedestal, gate) AND sound/alarm/beeping (sound, alarm, beeping, səs, ses, salır, verir) appear together -> Systems / EAS, never Audio
- speaker, music system, background music, amplifier, microphone, musiqi, səsgücləndirici, dinamik -> Systems / Audio (store music/speaker systems only; NOT EAS antenna alarms)
- camera, cctv, nvr, dvr, recording, surveillance camera -> Systems / CCTV
- door access, access card, card reader, fingerprint, turnstile, maglock, door controller -> Systems / Access Control
- internet, wifi, router, switch, network, lan, cat6, patch panel, rack, data outlet, low voltage cable -> Systems / Low Voltage
- electricity, socket, power, lighting, breaker, distribution board -> MEP / Electrical
- air conditioner, ac, hvac, ventilation, fan coil -> MEP / HVAC
- water, pipe, leak, drain, sink, toilet, plumbing -> MEP / Plumbing
- sprinkler, fire alarm, fire fighting -> MEP / Fire Fighting
- painting, paint, wall, touch-up -> Construction / Painting
- tile, floor, ceramic, vinyl, parquet -> Construction / Flooring
- ceiling, gypsum, plasterboard -> Construction / Ceiling
- glass, mirror -> Construction / Glass
- door, lock repair, hinge -> Construction / Doors
- cabinet, shelf, furniture, drawer -> Construction / Furniture
- civil, masonry, partition, drywall, concrete -> Construction / Civil
- sign, lightbox, branding, logo, wayfinding -> Construction / Signage
- inventory -> Inventory / Inventory

Use "Medium" priority unless safety, revenue impact, or complete outage clearly requires otherwise.`;

  if (hasImages) {
    return `${basePrompt}

Photos are attached. Analyze BOTH the client description and all images together.
Use visible equipment, damage, leaks, wiring, and safety clues to improve classification and confidence.`;
  }

  return `${basePrompt}

No photos are attached. Analyze the client description text only.`;
}

function buildUserContent(
  issue: string,
  attachments: string[] = []
): string | OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const contextLines = [
    "Analyze this client maintenance request.",
    "",
    `Client description: ${issue}`,
  ];

  if (attachments.length === 0) {
    return contextLines.join("\n");
  }

  contextLines.push(
    "",
    `Attached photos (${attachments.length}): analyze these together with the description.`
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

    const body = (await request.json()) as AnalyzeClientRequest;
    const issue = body.issue?.trim();

    if (!issue) {
      return NextResponse.json(
        { error: "Missing required field: issue" },
        { status: 400 }
      );
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
          content: buildUserContent(issue, attachments),
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

    let parsed: Partial<
      AnalyzeClientResponse & {
        department?: string;
        category?: string;
        priority?: string;
        summary?: string;
        confidence?: number;
      }
    >;

    try {
      parsed = JSON.parse(rawContent) as Partial<
        AnalyzeClientResponse & {
          department?: string;
          category?: string;
          priority?: string;
          summary?: string;
          confidence?: number;
        }
      >;
    } catch {
      return NextResponse.json(
        { error: "Invalid analysis response from AI service" },
        { status: 502 }
      );
    }

    const departmentInput = parsed.ai_department ?? parsed.department;
    const categoryInput = parsed.ai_category ?? parsed.category;
    const priorityInput = parsed.ai_priority ?? parsed.priority;
    const summaryInput = parsed.ai_summary ?? parsed.summary;
    const confidenceInput = parsed.ai_confidence ?? parsed.confidence;

    const { department, category } = normalizeClassification(
      departmentInput,
      categoryInput,
      issue
    );

    const ai_summary = normalizeSummaryValue(summaryInput);

    if (!ai_summary) {
      return NextResponse.json(
        { error: "AI summary was empty" },
        { status: 502 }
      );
    }

    const response: AnalyzeClientResponse = {
      ai_category: category,
      ai_department: department,
      ai_priority: normalizePriority(priorityInput),
      ai_summary,
      ai_confidence: normalizeConfidence(confidenceInput),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analyze client request API error:", error);

    return NextResponse.json(
      { error: "Error while analyzing client request" },
      { status: 500 }
    );
  }
}
