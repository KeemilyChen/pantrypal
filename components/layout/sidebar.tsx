"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDays,
  Home,
  Refrigerator,
  ShoppingCart,
  Soup,
  UtensilsCrossed,
} from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/fridge", label: "Fridge", icon: Refrigerator },
  { href: "/recipes", label: "Recipes", icon: Soup },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await fetch("/api/demo/session", { method: "DELETE" })
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#f0e6d6] bg-white/80 px-5 py-6 lg:flex">
      <Link href="/home" className="mb-8 flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
          <UtensilsCrossed className="size-5" />
        </span>
        <div>
          <p className="font-heading text-lg font-semibold tracking-tight">PantryPal</p>
          <p className="text-xs text-muted-foreground">Your kitchen companion</p>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-[#4a5a61] hover:bg-[#fff6ea]",
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          )
        })}
      </nav>
      <button
        type="button"
        onClick={signOut}
        className="mt-auto text-left text-sm text-muted-foreground hover:text-foreground"
      >
        Sign out
      </button>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f0e6d6] bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <link.icon className={cn("size-5", active && "stroke-[2.4]")} />
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
