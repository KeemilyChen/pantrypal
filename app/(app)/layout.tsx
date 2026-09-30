import { AskFab } from "@/components/layout/ask-fab"
import { Sidebar, MobileNav } from "@/components/layout/sidebar"
import { KitchenProvider } from "@/components/providers/kitchen-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <KitchenProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <main className="flex-1 px-4 pb-32 pt-6 sm:px-8 lg:pb-10">{children}</main>
          <MobileNav />
          <AskFab />
        </div>
      </div>
    </KitchenProvider>
  )
}
