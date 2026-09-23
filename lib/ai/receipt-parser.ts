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

/** Phase 5: vision extraction only. Application code inserts after user review. */
export type ParsedReceipt = z.infer<typeof receiptParseSchema>
