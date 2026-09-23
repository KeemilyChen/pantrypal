import { expirationTone } from "@/lib/inventory/expiration"
import { cn } from "@/lib/utils"

const TONE_CLASS = {
  fresh: "bg-[#06D6A0]",
  soon: "bg-[#FFD166]",
  urgent: "bg-[#FF6B4A]",
  expired: "bg-[#e11d48]",
  unknown: "bg-[#c5d0d4]",
}

export function ExpirationDot({ date, className }: { date: string | null; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", TONE_CLASS[expirationTone(date)], className)}
      aria-hidden
    />
  )
}
