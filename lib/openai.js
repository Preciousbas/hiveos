import OpenAI from "openai";

let client = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Copy .env.local.example to .env.local and add your key."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function chatCompletion({
  system,
  user,
  temperature = 0.4,
  json = false,
}) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model,
    temperature,
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty completion.");
  }
  return content.trim();
}

export function parseJsonLoose(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
