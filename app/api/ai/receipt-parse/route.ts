import { getOpenAI } from "@/lib/ai/openai"
import {
  assertReceiptImageSize,
  receiptParseRequestSchema,
  receiptParseSchema,
} from "@/lib/ai/receipt-parser"

export const maxDuration = 60

const SYSTEM_PROMPT = `You are PantryPal. Extract grocery and food items from a receipt photo.
Return JSON matching:
{store_name: string, purchase_date: string|null, total_amount: number|null, items:[{name, quantity, unit, price, category}]}
Rules:
- Only include edible grocery/food items. Skip tax, bags, coupons, lottery, gift cards, and fees.
- Use a short kitchen name (e.g. "Chicken breast", "Milk"), not a store SKU.
- quantity is a number when printed, otherwise null. unit is like "count", "lb", "oz", "gal", or null.
- category is one of: produce, meat, seafood, dairy, grains, pantry, frozen, beverages, protein, other.
- purchase_date is YYYY-MM-DD only if clearly printed. Otherwise null.
- Never invent expiration dates. Do not include expiration fields.
- Do not invent items that are not on the receipt. If you cannot read the receipt, return items: [].`

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null)
  const parsed = receiptParseRequestSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Please send a receipt photo." }, { status: 400 })
  }

  try {
    assertReceiptImageSize(parsed.data.image)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Photo is too large." },
      { status: 413 },
    )
  }

  const openai = getOpenAI()
  if (!openai) {
    return Response.json(
      {
        error:
          "Receipt scanning needs OPENAI_API_KEY on the server. Use Add food to enter items by hand for now.",
      },
      { status: 503 },
    )
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this receipt and return the JSON object described in the system prompt.",
          },
          { type: "image_url", image_url: { url: parsed.data.image } },
        ],
      },
    ],
  })

  const content = completion.choices[0]?.message.content
  if (!content) {
    return Response.json({ error: "Could not read that receipt. Try another photo." }, { status: 422 })
  }

  let candidate: unknown
  try {
    candidate = JSON.parse(content)
  } catch {
    return Response.json({ error: "Could not read that receipt. Try another photo." }, { status: 422 })
  }

  const validated = receiptParseSchema.safeParse(candidate)
  if (!validated.success) {
    return Response.json({ error: "Could not read that receipt. Try another photo." }, { status: 422 })
  }

  return Response.json(validated.data)
}
