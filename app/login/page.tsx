"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserSupabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type AuthMode = "signin" | "signup"

function authErrorMessage(error: { message: string; code?: string }) {
  const code = error.code ?? ""
  const message = error.message.toLowerCase()

  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "That email or password is incorrect."
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "An account with that email already exists. Sign in instead."
  }
  if (code === "email_address_invalid" || message.includes("invalid email") || message.includes("unable to validate email")) {
    return "Please enter a valid email address."
  }
  if (
    code === "weak_password" ||
    message.includes("password should be") ||
    message.includes("password is too") ||
    (message.includes("password") && (message.includes("least") || message.includes("characters") || message.includes("weak")))
  ) {
    return "Password is too short. Use at least 6 characters."
  }
  if (code === "email_not_confirmed" || message.includes("not confirmed")) {
    return "Check your email to confirm your account, then sign in."
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "This project’s confirmation-email limit was reached. Wait about an hour, or add the test user in Supabase (Authentication → Users → Add user, Auto Confirm User), then sign in here."
  }

  return error.message || "Something went wrong. Please try again."
}

async function clearDemoCookie() {
  await fetch("/api/demo/session", { method: "DELETE" })
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>("signin")
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

  async function enterAuthenticatedHome() {
    await clearDemoCookie()
    router.push("/home")
    router.refresh()
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) {
      toast.error("Cloud sign-in is not available right now.")
      return
    }

    setLoading(true)

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) {
        toast.error(authErrorMessage(error))
        return
      }
      await enterAuthenticatedHome()
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      toast.error(authErrorMessage(error))
      return
    }

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      toast.error("An account with that email already exists. Sign in instead.")
      setMode("signin")
      return
    }

    if (data.session) {
      await enterAuthenticatedHome()
      return
    }

    toast.success("Check your email to confirm your account, then sign in.")
    setMode("signin")
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
        <p className="my-4 text-center text-xs text-muted-foreground">or use your account</p>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-[#fff6ea] p-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => setMode("signin")}
            className={cn(
              "h-10 rounded-full text-sm font-medium",
              mode === "signin" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setMode("signup")}
            className={cn(
              "h-10 rounded-full text-sm font-medium",
              mode === "signup" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            Create account
          </button>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 w-full rounded-full" disabled={loading}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
    </main>
  )
}
