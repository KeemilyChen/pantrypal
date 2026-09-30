"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { UtensilsCrossed } from "lucide-react"
import { AiCookingCard } from "@/components/dashboard/ai-cooking-card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AskFab() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const onHome = pathname === "/home" || pathname.startsWith("/home/")

  function openAsk() {
    if (onHome) {
      document.getElementById("cook")?.scrollIntoView({ behavior: "smooth" })
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openAsk}
        aria-label="Ask PantryPal"
        className="fixed right-4 bottom-28 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:right-8 lg:bottom-8"
      >
        <UtensilsCrossed className="size-6" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask PantryPal</DialogTitle>
          </DialogHeader>
          <AiCookingCard />
        </DialogContent>
      </Dialog>
    </>
  )
}
