"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserSupabase()

  async function enterDemo() {
    setLoading(true)
    await fetch("/api/demo/session", { method: "POST" })
    router.push("/home")
    router.refresh()
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) {
      toast.error("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use cloud auth.")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    router.push("/home")
    router.refresh()
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white">
          <UtensilsCrossed className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-semibold">PantryPal</h1>
          <p className="text-sm text-muted-foreground">What should we do with the food you have?</p>
        </div>
      </div>
      <div className="rounded-3xl border border-[#f0e6d6] bg-white p-6 shadow-sm">
        <Button className="h-11 w-full rounded-full" onClick={enterDemo} disabled={loading}>
          Continue with demo kitchen
        </Button>
        <p className="my-4 text-center text-xs text-muted-foreground">or sign in with Supabase</p>
        <form className="space-y-3" onSubmit={signIn}>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </main>
  )
}
