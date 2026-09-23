export async function compressReceiptImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a photo of a receipt.")
  }

  const bitmap = await createImageBitmap(file)
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not prepare that photo.")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL("image/jpeg", 0.72)
  if (dataUrl.length > 3_500_000) {
    const tighter = canvas.toDataURL("image/jpeg", 0.5)
    if (tighter.length > 3_500_000) {
      throw new Error("Receipt photo is too large. Try a closer, smaller photo.")
    }
    return tighter
  }
  return dataUrl
}
