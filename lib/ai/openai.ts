import OpenAI from "openai"

export const OPENAI_MODEL = "gpt-6-luna"

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

export function jsonChatCompletion(
  openai: OpenAI,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
) {
  return openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    reasoning_effort: "none",
    messages,
  })
}
