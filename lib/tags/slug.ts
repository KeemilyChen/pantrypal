import { TAG_KINDS, type TagKind } from "@/lib/types"

export const MAX_TAGS_PER_RECIPE = 12

export function slugifyTag(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || null
}

export function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, " ")
}

export function normalizeTagKind(kind: string | null | undefined): TagKind {
  if (kind && (TAG_KINDS as readonly string[]).includes(kind)) return kind as TagKind
  return "other"
}

export type TagDraft = {
  name: string
  slug: string
  kind: TagKind
  source?: "ai" | "user" | "ingredient"
}

export function dedupeTags(
  tags: Array<{ name?: string | null; kind?: string | null; source?: TagDraft["source"] }>,
  cap = MAX_TAGS_PER_RECIPE,
): TagDraft[] {
  const seen = new Set<string>()
  const out: TagDraft[] = []
  for (const tag of tags) {
    const name = normalizeTagName(tag.name ?? "")
    const slug = slugifyTag(name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push({
      name: name.slice(0, 48),
      slug,
      kind: normalizeTagKind(tag.kind),
      source: tag.source,
    })
    if (out.length >= cap) break
  }
  return out
}
