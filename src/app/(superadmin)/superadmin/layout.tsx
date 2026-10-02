"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const navItems = [
  { label: "Overview", href: "/superadmin", icon: "dashboard" },
  { label: "Users", href: "/superadmin/users", icon: "people" },
  { label: "Stores", href: "/superadmin/stores", icon: "store" },
  { label: "Billing", href: "/superadmin/billing", icon: "credit_card" },
  { label: "Analytics", href: "/superadmin/analytics", icon: "analytics" },
  { label: "Rule Monitor", href: "/superadmin/rules-monitor", icon: "rule" },
  { label: "Audit Log", href: "/superadmin/audit-log", icon: "shield" },
  { label: "Support Tools", href: "/superadmin/support", icon: "support_agent" },
  { label: "Configuration", href: "/superadmin/configuration", icon: "settings" },
]

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  const isActive = (href: string) => {
    if (href === "/superadmin") return pathname === "/superadmin"
    return pathname.startsWith(href)
  }

  // Login page - no sidebar/header, just the children
  if (pathname === "/superadmin/login") {
    return <>{children}</>
  }

  return (
    <div className="superadmin min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-[180px]" : "w-[56px]"} bg-superadmin-sidebar flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="h-12 flex items-center px-3 border-b border-superadmin-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-superadmin-navy text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            </div>
            {sidebarOpen && (
              <span className="text-white font-medium text-[13px]">Quilo</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[12px] font-medium transition-all ${
                isActive(item.href)
                  ? "bg-superadmin-accent text-white"
                  : "text-superadmin-sidebar-muted-foreground hover:text-white hover:bg-superadmin-sidebar-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-12 bg-white border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-muted-foreground">menu</span>
            </button>
            <h2 className="text-[13px] font-medium text-foreground">Superadmin Console</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-superadmin-navy text-white rounded text-[12px] font-medium">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              Admin
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}