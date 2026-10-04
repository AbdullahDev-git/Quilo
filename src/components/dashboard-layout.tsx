"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/lib/auth-context"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Rules", href: "/dashboard/rules", icon: "rule" },
  { label: "Approval Queue", href: "/dashboard/approval-queue", icon: "pending_actions" },
  { label: "Orders", href: "/dashboard/orders", icon: "shopping_bag" },
  { label: "Chatbot", href: "/dashboard/chatbot", icon: "chat" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useTheme()
  const { user, loading } = useAuth()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (loading || !user) {
    return null
  }

  return (
    <div className={`min-h-screen bg-background flex ${theme === "dark" ? "dark" : ""}`}>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`fixed left-0 top-0 h-full ${collapsed ? "md:w-16" : "md:w-60"} w-60 bg-[#1f108e] shadow-xl z-50 flex flex-col gap-2 p-4 transition-all duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className={`flex items-center gap-3 px-2 py-4 mb-4 ${collapsed ? "md:hidden" : ""}`}>
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <span className="material-symbols-outlined text-[#1f108e] text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>rocket_launch</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-[24px] font-black text-white leading-tight tracking-tight whitespace-nowrap">Quilo</h1>
            <p className="text-[10px] text-white/60 tracking-widest uppercase whitespace-nowrap">Automation Platform</p>
          </div>
        </div>
        <div className={`flex items-center justify-center py-4 mb-4 ${collapsed ? "" : "md:hidden"} hidden`}>
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <span className="material-symbols-outlined text-[#1f108e] text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>rocket_launch</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center py-2.5 rounded-lg transition-all duration-200 ${
                  collapsed ? "md:justify-center md:px-0" : "md:justify-start md:gap-3 md:px-3"
                } justify-center px-3 ${
                  isActive
                    ? "bg-[#3730a3] text-white font-bold shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-[#c3c0ff]/10"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="material-symbols-outlined text-[22px] shrink-0">{item.icon}</span>
                <span className={`text-[12px] leading-4 tracking-[0.05em] font-medium whitespace-nowrap ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-full py-2 text-white/50 hover:text-white hover:bg-[#c3c0ff]/10 rounded-lg transition-all mt-auto"
        >
          <span className="material-symbols-outlined text-[20px]">{collapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
      </aside>

      <main className={`flex-1 min-h-screen flex flex-col text-foreground transition-all duration-300 ${collapsed ? "md:ml-16" : "md:ml-60"}`}>
        <header className="sticky top-0 z-40 bg-card border-b border-border flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-all">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="relative group hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-[20px]">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-surface-container-low rounded-full border-none focus:ring-2 focus:ring-primary/20 w-48 lg:w-64 text-[14px] text-foreground transition-all duration-200 placeholder:text-muted-foreground"
                placeholder="Search orders, rules, or data..."
                type="text"
              />
            </div>
            <nav className="hidden md:flex gap-4 lg:gap-6">
              <a className="text-primary font-bold border-b-2 border-primary pb-1 text-[12px] tracking-[0.05em]" href="/dashboard/stores">All Stores</a>
              <a className="text-on-surface-variant font-medium hover:text-primary transition-colors text-[12px] tracking-[0.05em]" href="/dashboard/orders">Returns Hub</a>
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            <button className="p-1.5 sm:p-2 text-muted-foreground hover:bg-muted rounded-full transition-all active:scale-90">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">notifications</span>
            </button>
            <div className="hidden sm:flex items-center gap-1 sm:gap-2 lg:gap-4">
              <button className="p-1.5 sm:p-2 text-muted-foreground hover:bg-muted rounded-full transition-all active:scale-90">
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]">help_outline</span>
              </button>
              <div className="h-8 w-px bg-border mx-1" />
            </div>
            <div className="flex items-center gap-1 sm:gap-3 cursor-pointer hover:bg-muted p-1 pr-1 sm:pr-3 rounded-full transition-all">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#c3c0ff] flex items-center justify-center overflow-hidden">
                <span className="material-symbols-outlined text-primary text-[16px] sm:text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
              </div>
              <span className="text-[12px] text-foreground font-semibold tracking-[0.05em] hidden sm:inline">{user?.name || "Account"}</span>
            </div>
          </div>
        </header>
        <section className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-[1440px] mx-auto w-full">
          {children}
        </section>
      </main>
    </div>
  )
}
