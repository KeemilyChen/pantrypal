"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type ProfileItem = {
  contentType: "recipe" | "meal_plan"
  id: string
  name: string
  description: string
}

type Tab = "posts" | "saved" | "liked"

export default function MyProfilePage() {
  const [tab, setTab] = useState<Tab>("posts")
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<{ name: string; postCount: number } | null>(null)
  const [posts, setPosts] = useState<ProfileItem[]>([])
  const [saved, setSaved] = useState<ProfileItem[]>([])
  const [liked, setLiked] = useState<ProfileItem[]>([])

  useEffect(() => {
    void fetch("/api/profiles/me")
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? "Could not load profile.")
        setProfile(data.profile)
        setPosts(data.posts ?? [])
        setSaved(data.saved ?? [])
        setLiked(data.liked ?? [])
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load profile.")
      })
  }, [])

  const items = tab === "posts" ? posts : tab === "saved" ? saved : liked

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold">Me</h1>
        <p className="text-sm text-muted-foreground">
          {profile?.name ?? "Your kitchen"} · {profile?.postCount ?? 0} public posts
        </p>
        <p className="mt-2 text-sm">
          <Link href="/recipes" className="text-primary font-medium">
            My recipes
          </Link>
        </p>
      </header>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        {(["posts", "saved", "liked"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === item ? "bg-primary text-white" : "bg-[#fff6ea]"}`}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {tab === "posts" && !posts.length ? (
        <p className="text-sm text-muted-foreground">
          No posts yet.{" "}
          <Link href="/home" className="text-primary">
            Ask PantryPal
          </Link>{" "}
          or{" "}
          <Link href="/plan" className="text-primary">
            share a meal plan
          </Link>
          .
        </p>
      ) : null}
      <div className="grid gap-3">
        {items.map((item) => (
          <Link
            key={`${item.contentType}-${item.id}`}
            href={item.contentType === "meal_plan" ? `/explore/plans/${item.id}` : `/explore/${item.id}`}
            className="rounded-3xl border border-[#f0e6d6] bg-white p-4"
          >
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {item.contentType === "meal_plan" ? "Meal plan" : "Recipe"}
            </p>
            <p className="font-heading text-lg font-semibold">{item.name}</p>
            {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  )
}
