"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"

type ProfileItem = {
  contentType: "recipe" | "meal_plan"
  id: string
  name: string
  description: string
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<{ name: string; postCount: number; isSelf?: boolean } | null>(null)
  const [posts, setPosts] = useState<ProfileItem[]>([])
  const [topTags, setTopTags] = useState<Array<{ name: string; slug: string }>>([])

  useEffect(() => {
    void fetch(`/api/profiles/${id}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? "Profile not found.")
        setProfile(data.profile)
        setPosts(data.posts ?? [])
        setTopTags(data.topTags ?? [])
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load profile.")
      })
  }, [id])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/explore" className="text-sm text-muted-foreground">
        ← Explore
      </Link>
      <header>
        <h1 className="font-heading text-3xl font-semibold">{profile?.name ?? "Profile"}</h1>
        <p className="text-sm text-muted-foreground">{profile?.postCount ?? 0} public posts</p>
      </header>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {topTags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {topTags.map((tag) => (
            <span key={tag.slug} className="rounded-full bg-[#fff6ea] px-2 py-0.5 text-[11px] font-medium">
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
      {!posts.length ? <p className="text-sm text-muted-foreground">This kitchen has not posted yet.</p> : null}
      <div className="grid gap-3">
        {posts.map((item) => (
          <Link
            key={`${item.contentType}-${item.id}`}
            href={item.contentType === "meal_plan" ? `/explore/plans/${item.id}` : `/explore/${item.id}`}
            className="rounded-3xl border border-[#f0e6d6] bg-white p-4"
          >
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {item.contentType === "meal_plan" ? "Meal plan" : "Recipe"}
            </p>
            <p className="font-heading text-lg font-semibold">{item.name}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
