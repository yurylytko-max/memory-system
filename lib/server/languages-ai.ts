import "server-only";

import { z } from "zod";

type LanguageAIPurpose = "import" | "tutor";

type LanguageAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StructuredModelInput<T> = {
  schema: z.ZodType<T>;
  purpose: LanguageAIPurpose;
  prompt: string;
  imageBase64s?: string[];
};

type TextModelInput = {
  purpose: LanguageAIPurpose;
  messages: LanguageAIMessage[];
};

function getOllamaModel(purpose: LanguageAIPurpose) {
  if (purpose === "import") {
    return process.env.LANGUAGE_IMPORT_OLLAMA_MODEL || "llama3.2-vision";
  }

  return process.env.LANGUAGE_TUTOR_OLLAMA_MODEL || "llama3.2";
}

function getOllamaBaseUrl() {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/+$/, "");
}

function getProviderSetupError() {
  return "Missing Ollama configuration. Set OLLAMA_BASE_URL for the languages workspace.";
}

function extractOllamaText(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid Ollama response payload.");
  }

  const record = payload as Record<string, unknown>;
  const message =
    typeof record.message === "object" && record.message !== null
      ? (record.message as Record<string, unknown>)
      : null;
  const content = message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (typeof record.response === "string" && record.response.trim()) {
    return record.response.trim();
  }

  throw new Error("Ollama response did not contain text output.");
}

async function callOllamaStructured<T>({
  schema,
  purpose,
  prompt,
  imageBase64s = [],
}: StructuredModelInput<T>) {
  const baseUrl = getOllamaBaseUrl();

  if (!baseUrl) {
    throw new Error(getProviderSetupError());
  }

  const schemaJson = z.toJSONSchema(schema, {
    reused: "inline",
  });

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOllamaModel(purpose),
      stream: false,
      format: schemaJson,
      messages: [
        {
          role: "system",
          content:
            "Return valid JSON only. Do not wrap the answer in markdown fences.",
        },
        {
          role: "user",
          content: prompt,
          images: imageBase64s,
        },
      ],
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama request failed with ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  const rawText = extractOllamaText(await response.json());
  return schema.parse(JSON.parse(rawText));
}

async function callOllamaText({ purpose, messages }: TextModelInput) {
  const baseUrl = getOllamaBaseUrl();

  if (!baseUrl) {
    throw new Error(getProviderSetupError());
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOllamaModel(purpose),
      stream: false,
      messages,
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama request failed with ${response.status}: ${errorText.slice(0, 400)}`
    );
  }

  return extractOllamaText(await response.json());
}

export async function callStructuredLanguageModel<T>(
  input: StructuredModelInput<T>
) {
  return callOllamaStructured(input);
}

export async function callLanguageTextModel(input: TextModelInput) {
  return callOllamaText(input);
}

export function getLanguageAISetupSummary() {
  const baseUrl = getOllamaBaseUrl();

  if (!baseUrl) {
    return getProviderSetupError();
  }

  return `Using Ollama via ${baseUrl}.`;
}
