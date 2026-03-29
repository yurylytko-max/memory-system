const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY не настроен.");
  }

  return apiKey;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function toGeminiError(status: number) {
  if (status === 429) {
    return "Gemini временно перегружен. Повторите через несколько секунд.";
  }

  if (status === 503 || status === 504) {
    return "Gemini временно недоступен. Повторите запрос ещё раз.";
  }

  return "Gemini не ответил.";
}

export async function callStudyThreeGeminiJson(prompt: string, logPrefix: string) {
  const apiKey = getGeminiApiKey();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      console.error(`${logPrefix} ERROR:`, {
        attempt,
        status: response.status,
        raw,
      });

      if (attempt < maxAttempts && isRetryableStatus(response.status)) {
        await sleep(500 * attempt);
        continue;
      }

      throw new Error(toGeminiError(response.status));
    }

    let envelope: any = null;

    try {
      envelope = JSON.parse(raw);
    } catch {
      console.error(`${logPrefix} INVALID GEMINI ENVELOPE:`, raw);

      if (attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }

      throw new Error("Gemini вернул некорректный ответ.");
    }

    const text =
      envelope?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim() ?? "";

    if (!text) {
      console.error(`${logPrefix} EMPTY TEXT:`, envelope);

      if (attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }

      throw new Error("Gemini не вернул содержательный ответ.");
    }

    try {
      return JSON.parse(text);
    } catch {
      console.error(`${logPrefix} INVALID JSON TEXT:`, text);

      if (attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }

      throw new Error("Gemini вернул невалидный JSON.");
    }
  }

  throw new Error("Gemini не ответил.");
}
