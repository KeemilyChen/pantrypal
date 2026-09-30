"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/fridge", label: "Fridge" },
  { href: "/plan", label: "Plan" },
  { href: "/shopping", label: "Shopping" },
]

export function KitchenSubnav() {
  const pathname = usePathname()

  return (
    <div className="mb-6 flex gap-1 rounded-full bg-[#fff6ea] p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-full py-2 text-center text-sm font-semibold",
              active ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
