import { z } from "zod"

export const receiptParseSchema = z.object({
  store_name: z.string(),
  purchase_date: z.string().nullable(),
  total_amount: z.number().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      price: z.number().nullable(),
      category: z.string(),
    }),
  ),
})

/** Vision extraction only. Application code inserts after user review. */
export type ParsedReceipt = z.infer<typeof receiptParseSchema>

export const receiptParseRequestSchema = z.object({
  image: z
    .string()
    .min(1)
    .refine(
      (value) => /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value),
      "Image must be a JPEG, PNG, or WebP data URL",
    ),
})

const DATA_URL_LIMIT = 3_500_000

export function assertReceiptImageSize(image: string) {
  if (image.length > DATA_URL_LIMIT) {
    throw new Error("Receipt photo is too large. Try a closer, smaller photo.")
  }
}
