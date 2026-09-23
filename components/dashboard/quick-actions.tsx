import Link from "next/link"
import { CalendarPlus, Camera, Plus, Sparkles, Utensils } from "lucide-react"

const ACTIONS = [
  { href: "/fridge?add=1", label: "Add food", icon: Plus },
  { href: "/fridge", label: "Scan receipt", icon: Camera, soon: true },
  { href: "/home#cook", label: "What can I cook?", icon: Sparkles },
  { href: "/recipes?new=1", label: "Add recipe", icon: Utensils },
  { href: "/plan", label: "Create meal plan", icon: CalendarPlus },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="rounded-2xl border border-[#f0e6d6] bg-white px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5"
        >
          <action.icon className="mx-auto size-5 text-primary" />
          <p className="mt-2 text-sm font-medium">{action.label}</p>
          {action.soon ? (
            <p className="text-[11px] text-muted-foreground">Coming after MVP</p>
          ) : null}
        </Link>
      ))}
    </div>
  )
}
