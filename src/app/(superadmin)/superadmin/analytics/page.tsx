"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { StatsCard } from "@/components/superadmin/stats-card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface AnalyticsData {
  totals: {
    users: number
    stores: number
    rules: number
    activity: number
    triggers: number
  }
  charts: {
    userGrowth: Array<{ date: string; count: number }>
    storeGrowth: Array<{ date: string; count: number }>
    ruleGrowth: Array<{ date: string; count: number }>
    activityGrowth: Array<{ date: string; count: number }>
  }
  topRules: Array<{ name: string; triggerCount: number; status: string }>
  activityByType: Array<{ event: string; count: number }>
}

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"]

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<AnalyticsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [days, setDays] = React.useState(30)

  React.useEffect(() => {
    fetchAnalytics()
  }, [days])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/analytics?days=${days}`, { credentials: "include" })
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

  const chartConfig = {
    stroke: "#f59e0b",
    fill: "#f59e0b",
  }

  return (
    <div>
      <PageHeader
        title="Platform Analytics"
        description="Growth metrics and usage statistics"
        action={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Users" value={data?.totals.users || 0} icon="people" iconColor="bg-blue-50 text-blue-600" />
        <StatsCard title="Stores" value={data?.totals.stores || 0} icon="store" iconColor="bg-green-50 text-green-600" />
        <StatsCard title="Rules" value={data?.totals.rules || 0} icon="rule" iconColor="bg-purple-50 text-purple-600" />
        <StatsCard title="Triggers" value={data?.totals.triggers || 0} icon="bolt" iconColor="bg-orange-50 text-orange-600" />
        <StatsCard title="Activity" value={data?.totals.activity || 0} icon="activity" iconColor="bg-cyan-50 text-cyan-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* User Growth */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-[13px] font-medium text-foreground mb-4">User Growth</h3>
          <div className="h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.charts.userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Store Growth */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Store Growth</h3>
          <div className="h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.storeGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Rules */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Top Rules by Triggers</h3>
          <div className="h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topRules || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="triggerCount" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity by Type */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-[13px] font-medium text-foreground mb-4">Activity by Event Type</h3>
          <div className="h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.activityByType || []}
                    dataKey="count"
                    nameKey="event"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(data?.activityByType || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
