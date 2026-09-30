import * as ImageManipulator from 'expo-image-manipulator'

const DATA_URL_LIMIT = 3_500_000
const MAX_EDGE = 1600

export async function receiptDataUrlFromAsset(asset) {
  if (!asset?.uri) throw new Error('Please choose a photo of a receipt.')

  const width = asset.width || MAX_EDGE
  const height = asset.height || MAX_EDGE
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const actions =
    scale < 1
      ? [{ resize: { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) } }]
      : []

  const first = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.72,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  })
  if (!first.base64) throw new Error('Could not prepare that photo.')

  let dataUrl = `data:image/jpeg;base64,${first.base64}`
  if (dataUrl.length <= DATA_URL_LIMIT) return dataUrl

  const tighter = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.5,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  })
  if (!tighter.base64) throw new Error('Could not prepare that photo.')
  dataUrl = `data:image/jpeg;base64,${tighter.base64}`
  if (dataUrl.length > DATA_URL_LIMIT) {
    throw new Error('Receipt photo is too large. Try a closer, smaller photo.')
  }
  return dataUrl
}

export async function parseReceiptOnServer(image) {
  const url = process.env.EXPO_PUBLIC_RECEIPT_PARSE_URL
  if (!url) {
    throw new Error('Receipt scanning is not configured on this phone yet.')
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image }),
    })
  } catch {
    throw new Error('Could not reach the receipt scanner. Check your connection and try again.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Could not read that receipt. Try another photo.')
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Could not read that receipt. Try another photo.')
  }
  if (!data || !Array.isArray(data.items)) {
    throw new Error('Could not read that receipt. Try another photo.')
  }
  return data
}
