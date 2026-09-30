"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { dedupeTags, slugifyTag } from "@/lib/tags/slug"

export type ChipTag = { name: string; kind?: string; source?: "ai" | "user" | "ingredient" }

export function TagChips(props: {
  tags: ChipTag[]
  onChange?: (tags: ChipTag[]) => void
  onAddRemote?: (name: string) => Promise<void>
  light?: boolean
}) {
  const [draft, setDraft] = useState("")
  const editable = Boolean(props.onChange || props.onAddRemote)

  async function addTag() {
    const name = draft.trim()
    if (!name) return
    const slug = slugifyTag(name)
    if (!slug) return
    if (props.tags.some((tag) => slugifyTag(tag.name) === slug)) {
      setDraft("")
      return
    }
    if (props.onAddRemote) {
      await props.onAddRemote(name)
    } else if (props.onChange) {
      props.onChange(dedupeTags([...props.tags, { name, kind: "other", source: "user" }]))
    }
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {props.tags.map((tag) => (
          <span
            key={slugifyTag(tag.name) ?? tag.name}
            className={
              props.light
                ? "rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium"
                : "rounded-full bg-[#fff6ea] px-2 py-0.5 text-[11px] font-medium text-[#4a5a61]"
            }
          >
            {tag.name}
          </span>
        ))}
      </div>
      {editable ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void addTag()
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a tag"
            className={props.light ? "h-8 border-white/30 bg-white/15 text-white placeholder:text-white/70" : "h-8"}
          />
          <Button type="submit" size="sm" variant={props.light ? "secondary" : "outline"} className="h-8">
            Add
          </Button>
        </form>
      ) : null}
    </div>
  )
}
