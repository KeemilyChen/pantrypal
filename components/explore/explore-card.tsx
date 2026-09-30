"use client"

import Link from "next/link"
import { Heart, Bookmark } from "lucide-react"
import { formatNutrition } from "@/lib/recipes/explore-rank"
import { cn } from "@/lib/utils"

export type ExploreCardItem = {
  contentType: "recipe" | "meal_plan"
  id: string
  userId?: string
  creatorName?: string
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  calories?: number | null
  proteinG?: number | null
  nutritionSource?: string | null
  avgCalories?: number | null
  avgProtein?: number | null
  mealCount?: number
  dayCount?: number
  likeCount?: number
  liked?: boolean
  saved?: boolean
  haveCount?: number
  needCount?: number
  imageUrl?: string | null
  tags?: Array<{ slug: string; name: string }>
}

export function ExploreCard({
  item,
  onTag,
  onLike,
  onSave,
}: {
  item: ExploreCardItem
  onTag: (slug: string) => void
  onLike: () => void
  onSave: () => void
}) {
  const href = item.contentType === "meal_plan" ? `/explore/plans/${item.id}` : `/explore/${item.id}`
  const nutrition =
    item.contentType === "recipe"
      ? formatNutrition(item)
      : item.avgCalories != null
        ? { text: `avg ${item.avgCalories} kcal/meal`, estimated: true }
        : null

  return (
    <article className="overflow-hidden rounded-3xl border border-[#f0e6d6] bg-white shadow-sm">
      <Link href={href} className="block">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-40 w-full object-cover" />
        ) : null}
        <div className="space-y-2 p-5">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {item.contentType === "meal_plan" ? "Meal plan" : "Recipe"}
          </p>
          <p className="font-heading text-xl font-semibold">{item.name}</p>
          {item.creatorName ? <p className="text-sm text-primary">{item.creatorName}</p> : null}
          <p className="text-xs text-muted-foreground">
            {item.contentType === "recipe"
              ? `${(item.prepTime || 0) + (item.cookTime || 0)} min`
              : `${item.mealCount ?? 0} meals · ${item.dayCount ?? 0} days`}
            {item.needCount ? ` · You have ${item.haveCount}/${item.needCount} ingredients` : ""}
          </p>
          {nutrition ? (
            <p className="text-xs text-muted-foreground">
              {nutrition.estimated ? "Estimated nutrition — " : ""}
              {nutrition.text}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {(item.tags ?? []).map((tagItem) => (
          <button
            key={tagItem.slug}
            type="button"
            className="rounded-full bg-[#fff6ea] px-2 py-0.5 text-[11px] font-medium"
            onClick={() => onTag(tagItem.slug)}
          >
            {tagItem.name}
          </button>
        ))}
      </div>
      {item.userId ? (
        <div className="px-5 pb-2">
          <Link href={`/profile/${item.userId}`} className="text-xs text-muted-foreground">
            View kitchen
          </Link>
        </div>
      ) : null}
      <div className="flex gap-2 px-5 pb-5">
        <button
          type="button"
          onClick={onLike}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium",
            item.liked ? "bg-primary text-white" : "bg-[#fff6ea] text-foreground",
          )}
        >
          <Heart className={cn("size-4", item.liked ? "fill-current" : "")} />
          {item.liked ? "Liked" : "Like"}
          {item.likeCount ? ` ${item.likeCount}` : ""}
        </button>
        <button
          type="button"
          onClick={onSave}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium",
            item.saved ? "bg-[#2d6a4f] text-white" : "bg-[#fff6ea] text-foreground",
          )}
        >
          <Bookmark className={cn("size-4", item.saved ? "fill-current" : "")} />
          {item.saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  )
}
