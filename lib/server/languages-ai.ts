import "server-only";

import { z } from "zod";

type LanguageAIPurpose = "import" | "tutor";

type LanguageAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StructuredModelInput<T> = {
  schema: z.ZodType<T>;
  name: string;
  purpose: LanguageAIPurpose;
  prompt: string;
  imageBase64s?: string[];
};

type TextModelInput = {
  purpose: LanguageAIPurpose;
  messages: LanguageAIMessage[];
};

function getLanguageAIProvider() {
  const explicit = process.env.LANGUAGE_AI_PROVIDER?.trim().toLowerCase();

  if (explicit === "ollama" || explicit === "openai") {
    return explicit;
  }

  if (process.env.OLLAMA_BASE_URL) {
    return "ollama";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return null;
}

function getOpenAIModel(purpose: LanguageAIPurpose) {
  if (purpose === "import") {
    return process.env.LANGUAGE_IMPORT_OPENAI_MODEL || "gpt-4o-mini";
  }

  return process.env.LANGUAGE_TUTOR_OPENAI_MODEL || "gpt-4o-mini";
}

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
  return (
    "Missing AI provider configuration. Set OLLAMA_BASE_URL for local/self-hosted Ollama " +
    "or OPENAI_API_KEY for OpenAI."
  );
}

function formatOpenAIError(status: number, errorText: string) {
  const truncated = errorText.slice(0, 500);

  if (status === 429 && truncated.includes("insufficient_quota")) {
    return (
      "OpenAI API quota is unavailable for this project. " +
      "Add API billing/credits or configure OLLAMA_BASE_URL for a local/self-hosted Ollama provider."
    );
  }

  return `OpenAI request failed with ${status}: ${truncated}`;
}

async function extractOpenAIText(payload: unknown): Promise<string> {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid OpenAI response payload.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const output = Array.isArray(record.output) ? record.output : [];

  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const contentItem of content) {
      if (typeof contentItem !== "object" || contentItem === null) {
        continue;
      }

      const asRecord = contentItem as Record<string, unknown>;
      const candidate =
        typeof asRecord.text === "string"
          ? asRecord.text
          : typeof asRecord.value === "string"
            ? asRecord.value
            : null;

      if (candidate) {
        return candidate;
      }
    }
  }

  throw new Error("OpenAI response did not contain text output.");
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

async function callOpenAIStructured<T>({
  schema,
  name,
  purpose,
  prompt,
  imageBase64s = [],
}: StructuredModelInput<T>) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const schemaJson = z.toJSONSchema(schema, {
    reused: "inline",
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAIModel(purpose),
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...imageBase64s.map((imageBase64) => ({
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "high",
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name,
          schema: schemaJson,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatOpenAIError(response.status, errorText));
  }

  const rawText = await extractOpenAIText(await response.json());
  return schema.parse(JSON.parse(rawText));
}

async function callOllamaStructured<T>({
  schema,
  purpose,
  prompt,
  imageBase64s = [],
}: StructuredModelInput<T>) {
  const baseUrl = getOllamaBaseUrl();

  if (!baseUrl) {
    throw new Error("Missing OLLAMA_BASE_URL.");
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

async function callOpenAIText({ purpose, messages }: TextModelInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAIModel(purpose),
      input: messages.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }],
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatOpenAIError(response.status, errorText));
  }

  return extractOpenAIText(await response.json());
}

async function callOllamaText({ purpose, messages }: TextModelInput) {
  const baseUrl = getOllamaBaseUrl();

  if (!baseUrl) {
    throw new Error("Missing OLLAMA_BASE_URL.");
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
  const provider = getLanguageAIProvider();

  if (!provider) {
    throw new Error(getProviderSetupError());
  }

  if (provider === "ollama") {
    return callOllamaStructured(input);
  }

  return callOpenAIStructured(input);
}

export async function callLanguageTextModel(input: TextModelInput) {
  const provider = getLanguageAIProvider();

  if (!provider) {
    throw new Error(getProviderSetupError());
  }

  if (provider === "ollama") {
    return callOllamaText(input);
  }

  return callOpenAIText(input);
}

export function getLanguageAISetupSummary() {
  const provider = getLanguageAIProvider();

  if (!provider) {
    return getProviderSetupError();
  }

  if (provider === "ollama") {
    return `Using Ollama via ${getOllamaBaseUrl()}.`;
  }

  return "Using OpenAI API.";
}
