"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { StatsCard } from "@/components/superadmin/stats-card"

interface BillingData {
  stats: {
    totalUsers: number
    totalSubscriptions: number
  }
  planCounts: Array<{ plan: string; count: number }>
  statusCounts: Array<{ status: string; count: number }>
}

const planLabels: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

const planColors: Record<string, string> = {
  free: "bg-gray-100",
  starter: "bg-blue-100",
  pro: "bg-purple-100",
  enterprise: "bg-amber-100",
}

const statusColors: Record<string, string> = {
  active: "bg-green-100",
  cancelled: "bg-red-100",
  past_due: "bg-yellow-100",
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = React.useState<BillingData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetchBilling()
  }, [])

  async function fetchBilling() {
    setLoading(true)
    try {
      const res = await fetch("/api/superadmin/billing", { credentials: "include" })
      if (res.status === 401) {
        router.push("/superadmin/login")
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Billing" description="Platform revenue and subscriptions" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total Users" value={data?.stats.totalUsers || 0} icon="people" iconColor="bg-blue-50 text-blue-600" />
        <StatsCard title="Subscriptions" value={data?.stats.totalSubscriptions || 0} icon="subscriptions" iconColor="bg-green-50 text-green-600" />
        <StatsCard title="Paid Users" value={data?.planCounts.filter(p => p.plan !== "free").reduce((sum, p) => sum + (p.count || 0), 0) || 0} icon="payments" iconColor="bg-purple-50 text-purple-600" />
      </div>

      {/* Plans Breakdown */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <h3 className="text-[13px] font-medium text-foreground mb-4">Users by Plan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.planCounts.map((item) => (
            <div key={item.plan} className={`p-4 rounded-lg ${planColors[item.plan] || "bg-gray-100"}`}>
              <p className="text-[20px] font-bold text-foreground">{item.count}</p>
              <p className="text-[12px] text-muted-foreground">{planLabels[item.plan] || item.plan}</p>
            </div>
          ))}
          {(!data?.planCounts || data.planCounts.length === 0) && (
            <p className="text-[13px] text-muted-foreground col-span-4">No subscription data yet</p>
          )}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-[13px] font-medium text-foreground mb-4">Subscription Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.statusCounts.map((item) => (
            <div key={item.status} className={`p-4 rounded-lg ${statusColors[item.status] || "bg-gray-100"}`}>
              <p className="text-[20px] font-bold text-foreground">{item.count}</p>
              <p className="text-[12px] text-muted-foreground capitalize">{item.status?.replace("_", " ")}</p>
            </div>
          ))}
          {(!data?.statusCounts || data.statusCounts.length === 0) && (
            <p className="text-[13px] text-muted-foreground col-span-4">No status data yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
