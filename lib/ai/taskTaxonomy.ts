export const DEPARTMENTS = [
  "Construction",
  "MEP",
  "Systems",
  "Inventory",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const TAXONOMY: Record<Department, readonly string[]> = {
  Construction: [
    "Civil",
    "Painting",
    "Flooring",
    "Ceiling",
    "Furniture",
    "Glass",
    "Doors",
    "Signage",
  ],
  MEP: ["Electrical", "HVAC", "Plumbing", "Fire Fighting"],
  Systems: ["EAS", "CCTV", "Access Control", "Audio", "Low Voltage"],
  Inventory: ["Inventory"],
};

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

const DEFAULT_CATEGORY: Record<Department, string> = {
  Construction: "Civil",
  MEP: "Electrical",
  Systems: "Low Voltage",
  Inventory: "Inventory",
};

type ClassificationRule = {
  keywords: string[];
  department: Department;
  category: string;
};

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    keywords: [
      "detacher",
      "deactivator",
      "antenna",
      "antennas",
      "anten",
      "antena",
      "pedestal",
      "gate",
      "sensormatic",
      "checkpoint",
      "eas",
      "article surveillance",
      "loss prevention",
    ],
    department: "Systems",
    category: "EAS",
  },
  {
    keywords: [
      "camera",
      "cctv",
      "nvr",
      "dvr",
      "recording",
      "surveillance camera",
      "surveillance",
    ],
    department: "Systems",
    category: "CCTV",
  },
  {
    keywords: [
      "door access",
      "access card",
      "card reader",
      "fingerprint",
      "turnstile",
      "maglock",
      "door controller",
      "access control",
    ],
    department: "Systems",
    category: "Access Control",
  },
  {
    keywords: [
      "speaker",
      "speakers",
      "music system",
      "background music",
      "amplifier",
      "microphone",
      "musiqi",
      "səsgücləndirici",
      "sesguclendirici",
      "dinamik",
    ],
    department: "Systems",
    category: "Audio",
  },
  {
    keywords: [
      "internet",
      "wifi",
      "router",
      "switch",
      "network",
      "lan",
      "cat6",
      "patch panel",
      "rack",
      "data outlet",
      "low voltage",
      "cabling",
    ],
    department: "Systems",
    category: "Low Voltage",
  },
  {
    keywords: [
      "electricity",
      "socket",
      "power",
      "lighting",
      "breaker",
      "distribution board",
      "electrical",
      "outlet",
    ],
    department: "MEP",
    category: "Electrical",
  },
  {
    keywords: [
      "air conditioner",
      "air conditioning",
      "ac unit",
      "hvac",
      "ventilation",
      "fan coil",
    ],
    department: "MEP",
    category: "HVAC",
  },
  {
    keywords: ["water", "pipe", "leak", "drain", "sink", "toilet", "plumbing"],
    department: "MEP",
    category: "Plumbing",
  },
  {
    keywords: [
      "sprinkler",
      "fire alarm",
      "fire fighting",
      "smoke detector",
    ],
    department: "MEP",
    category: "Fire Fighting",
  },
  {
    keywords: ["painting", "paint", "touch-up", "touch up"],
    department: "Construction",
    category: "Painting",
  },
  {
    keywords: ["tile", "floor", "flooring", "ceramic", "vinyl", "parquet"],
    department: "Construction",
    category: "Flooring",
  },
  {
    keywords: ["ceiling", "gypsum", "plasterboard"],
    department: "Construction",
    category: "Ceiling",
  },
  {
    keywords: ["glass", "mirror"],
    department: "Construction",
    category: "Glass",
  },
  {
    keywords: ["door", "lock repair", "hinge", "doors"],
    department: "Construction",
    category: "Doors",
  },
  {
    keywords: ["cabinet", "shelf", "furniture", "drawer", "shelving"],
    department: "Construction",
    category: "Furniture",
  },
  {
    keywords: ["civil", "masonry", "partition", "drywall", "concrete"],
    department: "Construction",
    category: "Civil",
  },
  {
    keywords: ["sign", "lightbox", "branding", "logo", "wayfinding", "signage"],
    department: "Construction",
    category: "Signage",
  },
  {
    keywords: ["inventory", "stock", "warehouse"],
    department: "Inventory",
    category: "Inventory",
  },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

const EAS_DEVICE_KEYWORDS = [
  "antenna",
  "antennas",
  "anten",
  "antena",
  "eas",
  "detacher",
  "deactivator",
  "sensormatic",
  "checkpoint",
  "pedestal",
  "gate",
];

const EAS_SOUND_KEYWORDS = [
  "sound",
  "beeping",
  "beep",
  "alarm",
  "buzz",
  "buzzing",
  "ringing",
  "noise",
  "səs",
  "ses",
  "salır",
  "salir",
  "verir",
];

function matchesEasOverAudio(text: string) {
  const hasEasDevice = EAS_DEVICE_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );
  const hasSoundSignal = EAS_SOUND_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );

  return hasEasDevice && hasSoundSignal;
}

function isCategoryValid(department: Department, category: string) {
  return TAXONOMY[department].some(
    (item) => item.toLowerCase() === category.toLowerCase()
  );
}

function getCanonicalCategory(department: Department, category: string) {
  const match = TAXONOMY[department].find(
    (item) => item.toLowerCase() === category.trim().toLowerCase()
  );

  return match || null;
}

export function classifyByKeywords(text: string): ClassificationRule | null {
  const lowered = normalizeText(text);

  if (matchesEasOverAudio(lowered)) {
    return {
      keywords: [],
      department: "Systems",
      category: "EAS",
    };
  }

  for (const rule of CLASSIFICATION_RULES) {
    if (
      rule.keywords.some((keyword) =>
        lowered.includes(keyword.trim().toLowerCase())
      )
    ) {
      return rule;
    }
  }

  return null;
}

export function normalizeDepartment(value: unknown): Department {
  if (typeof value !== "string") return "Construction";

  const match = DEPARTMENTS.find(
    (department) => department.toLowerCase() === value.trim().toLowerCase()
  );

  return match || "Construction";
}

export function normalizeCategory(
  value: unknown,
  department: Department,
  issueText = ""
): string {
  const combinedText = [typeof value === "string" ? value : "", issueText]
    .filter(Boolean)
    .join(" ");

  if (typeof value === "string") {
    const canonical = getCanonicalCategory(department, value);

    if (canonical) return canonical;
  }

  const keywordMatch = classifyByKeywords(combinedText);

  if (
    keywordMatch &&
    keywordMatch.department === department &&
    isCategoryValid(department, keywordMatch.category)
  ) {
    return keywordMatch.category;
  }

  if (keywordMatch && isCategoryValid(keywordMatch.department, keywordMatch.category)) {
    return keywordMatch.category;
  }

  return DEFAULT_CATEGORY[department];
}

export function normalizeClassification(
  departmentValue: unknown,
  categoryValue: unknown,
  issueText: string
): { department: Department; category: string } {
  const keywordMatch = classifyByKeywords(
    [issueText, typeof categoryValue === "string" ? categoryValue : ""]
      .filter(Boolean)
      .join(" ")
  );

  let department = normalizeDepartment(departmentValue);

  if (keywordMatch) {
    department = keywordMatch.department;
  }

  let category = normalizeCategory(categoryValue, department, issueText);

  if (keywordMatch && keywordMatch.department === department) {
    category = keywordMatch.category;
  }

  if (!isCategoryValid(department, category)) {
    category = DEFAULT_CATEGORY[department];
  }

  return { department, category: getCanonicalCategory(department, category)! };
}

export function normalizePriority(value: unknown): string {
  if (typeof value !== "string") return "Medium";

  const normalized = value.trim().toLowerCase();

  if (normalized === "normal") return "Medium";
  if (normalized === "urgent") return "Critical";

  const match = PRIORITIES.find(
    (priority) => priority.toLowerCase() === normalized
  );

  return match || "Medium";
}

export function normalizeConfidence(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return 0;

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

export function buildTaxonomyPrompt(): string {
  const taxonomyLines = DEPARTMENTS.map((department) => {
    return `- ${department}: ${TAXONOMY[department].join(", ")}`;
  });

  return taxonomyLines.join("\n");
}
