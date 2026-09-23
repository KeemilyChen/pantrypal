export function foodEmoji(name: string) {
  const value = name.toLowerCase()
  if (value.includes("spinach") || value.includes("lettuce") || value.includes("kale")) return "🥬"
  if (value.includes("chicken")) return "🍗"
  if (value.includes("beef") || value.includes("steak")) return "🥩"
  if (value.includes("milk")) return "🥛"
  if (value.includes("cheese")) return "🧀"
  if (value.includes("egg")) return "🥚"
  if (value.includes("broccoli")) return "🥦"
  if (value.includes("carrot")) return "🥕"
  if (value.includes("rice")) return "🍚"
  if (value.includes("dumpling")) return "🥟"
  if (value.includes("garlic") || value.includes("onion")) return "🧅"
  if (value.includes("soy") || value.includes("oil") || value.includes("sauce")) return "🫙"
  if (value.includes("berry") || value.includes("fruit")) return "🍓"
  if (value.includes("fish") || value.includes("salmon")) return "🐟"
  if (value.includes("bread")) return "🍞"
  if (value.includes("pasta") || value.includes("noodle")) return "🍜"
  if (value.includes("tomato")) return "🍅"
  return "🥗"
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
