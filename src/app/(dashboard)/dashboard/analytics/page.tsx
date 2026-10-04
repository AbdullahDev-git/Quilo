"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface ReturnDistribution {
  exchange: number
  storeCredit: number
  refund: number
  flagged: number
  totalUnits: number
  counts: { exchange: number; storeCredit: number; refund: number; flagged: number }
}

interface ProfitRecoveryPoint {
  day: string
  actual: number
  projected: number
  count: number
}

interface TopProduct {
  name: string
  sku: string
  category: string
  quantity: number
  recovery: number
  returnRate: string
}

interface ActionTypePerf {
  type: string
  count: number
  success: number
  failed: number
}

interface ActionPerformance {
  total: number
  successful: number
  failed: number
  verified: number
  successRate: string
  verificationRate: string
  byType: ActionTypePerf[]
}

interface AnalyticsData {
  period: { days: number; start: string; end: string; chart: string }
  totalMarginProtected: number
  marginChange: number
  previousMarginProtected: number
  exchangeRate: number
  netRetentionValue: number
  returnDistribution: ReturnDistribution
  profitRecovery: ProfitRecoveryPoint[]
  topReturnedProducts: TopProduct[]
  actionPerformance: ActionPerformance
  totalOrders: number
  periodOrders: number
  activeRules: number
  connectedStores: number
}

const DONUT_COLORS = ["#1f108e", "#62fae3", "#f59e0b", "#ef4444"]
const ACTION_TYPE_LABELS: Record<string, string> = {
  refund: "Refund",
  exchange: "Exchange",
  "offer exchange": "Exchange",
  issue_store_credit: "Store Credit",
  "issue store credit": "Store Credit",
  issue_discount: "Discount",
  flag_for_review: "Flagged for Review",
  "flag for manual review": "Flagged for Review",
  escalate: "Escalated",
  deny: "Denied",
  pause_automation: "Paused",
  send_email: "Email Sent",
  send_sms: "SMS Sent",
  create_ticket: "Ticket Created",
}

function labelActionType(type: string): string {
  if (ACTION_TYPE_LABELS[type]) return ACTION_TYPE_LABELS[type]
  const lower = type.toLowerCase()
  if (lower.includes("exchange")) return "Exchange"
  if (lower.includes("refund")) return "Refund"
  if (lower.includes("credit") || lower.includes("discount")) return "Store Credit"
  if (lower.includes("flag") || lower.includes("review")) return "Flagged for Review"
  return type
}

function formatDateRange(days: number): string {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

export default function AnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [days, setDays] = React.useState(30)
  const [chartView, setChartView] = React.useState<"Daily" | "Weekly">("Daily")
  const [exporting, setExporting] = React.useState(false)

  const fetchData = React.useCallback(async (periodDays: number, chart: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?days=${periodDays}&chart=${chart.toLowerCase()}`)
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData(days, chartView)
  }, [days, chartView, fetchData])

  // Export CSV
  const handleExport = () => {
    if (!data) return
    setExporting(true)
    try {
      const rows: string[] = []
      rows.push("Metric,Value")
      rows.push(`Period (days),${data.period.days}`)
      rows.push(`Total Margin Protected,${data.totalMarginProtected}`)
      rows.push(`Margin Change (%),${data.marginChange}`)
      rows.push(`Previous Period Margin,${data.previousMarginProtected}`)
      rows.push(`Exchange Rate (%),${data.exchangeRate}`)
      rows.push(`Net Retention Value,${data.netRetentionValue}`)
      rows.push(`Total Orders,${data.totalOrders}`)
      rows.push(`Period Orders,${data.periodOrders}`)
      rows.push(`Active Rules,${data.activeRules}`)
      rows.push(`Connected Stores,${data.connectedStores}`)
      rows.push("")
      rows.push("Return Distribution,%")
      rows.push(`Exchange,${data.returnDistribution.exchange}`)
      rows.push(`Store Credit,${data.returnDistribution.storeCredit}`)
      rows.push(`Refund,${data.returnDistribution.refund}`)
      rows.push(`Flagged,${data.returnDistribution.flagged}`)
      rows.push("")
      if (data.actionPerformance.total > 0) {
        rows.push("Action Performance,Count")
        rows.push(`Total Actions,${data.actionPerformance.total}`)
        rows.push(`Successful,${data.actionPerformance.successful}`)
        rows.push(`Failed,${data.actionPerformance.failed}`)
        rows.push(`Verified,${data.actionPerformance.verified}`)
        rows.push(`Success Rate (%),${data.actionPerformance.successRate}`)
        rows.push("")
        rows.push("Action Type,Count,Success,Failed")
        data.actionPerformance.byType.forEach((a) => {
          rows.push(`${labelActionType(a.type)},${a.count},${a.success},${a.failed}`)
        })
        rows.push("")
      }
      if (data.topReturnedProducts.length > 0) {
        rows.push("Top Returned Products")
        rows.push("Product,SKU,Quantity,Recovery,Return Rate (%)")
        data.topReturnedProducts.forEach((p) => {
          rows.push(`${p.name},${p.sku},${p.quantity},${p.recovery},${p.returnRate}`)
        })
      }

      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quilo-analytics-${days}d.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-body-md">No analytics data available yet.</p>
        <p className="text-body-sm mt-2">Connect a store and process some returns to see insights.</p>
      </div>
    )
  }

  const donutData = [
    { name: "Exchange", value: data.returnDistribution.counts.exchange },
    { name: "Store Credit", value: data.returnDistribution.counts.storeCredit },
    { name: "Refund", value: data.returnDistribution.counts.refund },
    { name: "Flagged", value: data.returnDistribution.counts.flagged },
  ].filter((d) => d.value > 0)

  const marginTrendUp = data.marginChange >= 0

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Analytics & Reports</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Optimize your return operations with real-time margin insights.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
                  days === d ? "bg-primary text-primary-foreground" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-body-sm text-foreground">
            <span className="material-symbols-outlined text-[16px] text-muted-foreground">calendar_today</span>
            <span className="text-[12px]">{formatDateRange(days)}</span>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f108e] text-white rounded-lg text-body-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">{exporting ? "hourglass_empty" : "download"}</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Margin Protected */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Margin Protected</p>
          <div className="flex items-end gap-3">
            <p className="text-[32px] font-bold text-foreground tracking-tight">${data.totalMarginProtected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <span className={`flex items-center gap-1 text-[13px] font-semibold mb-1 ${marginTrendUp ? "text-emerald-600" : "text-red-500"}`}>
              <span className="material-symbols-outlined text-[16px]">{marginTrendUp ? "trending_up" : "trending_down"}</span>
              {marginTrendUp ? "+" : ""}{data.marginChange}%
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">
            Vs. previous {days}-day period (${data.previousMarginProtected.toLocaleString()})
          </p>
        </div>

        {/* Exchange Rate */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Exchange Rate</p>
          <div className="flex items-center justify-between">
            <p className="text-[32px] font-bold text-foreground tracking-tight">{data.exchangeRate}%</p>
            <div className="w-16 h-16 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5eeff"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1f108e"
                  strokeWidth="3"
                  strokeDasharray={`${Math.min(data.exchangeRate, 100)}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Net Retention Value */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Net Retention Value</p>
          <p className="text-[32px] font-bold text-foreground tracking-tight">${data.netRetentionValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded">savings</span>
            <span className="text-[11px] text-muted-foreground">from exchanges & store credits</span>
          </div>
        </div>
      </div>

      {/* Action Performance Banner */}
      {data.actionPerformance.total > 0 && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Automation Performance</h3>
            <span className="text-[12px] text-muted-foreground">{data.actionPerformance.total} actions in last {days} days</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Success Rate</p>
              <p className="text-[24px] font-bold text-emerald-600">{data.actionPerformance.successRate}%</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Verified</p>
              <p className="text-[24px] font-bold text-foreground">{data.actionPerformance.verified}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Failed</p>
              <p className="text-[24px] font-bold text-red-500">{data.actionPerformance.failed}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Verification Rate</p>
              <p className="text-[24px] font-bold text-foreground">{data.actionPerformance.verificationRate}%</p>
            </div>
          </div>
          {data.actionPerformance.byType.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action Type</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Success</th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.actionPerformance.byType.map((a) => (
                    <tr key={a.type}>
                      <td className="px-4 py-2 text-[13px] text-foreground font-medium">{labelActionType(a.type)}</td>
                      <td className="px-4 py-2 text-[13px] text-foreground">{a.count}</td>
                      <td className="px-4 py-2 text-[13px] text-emerald-600">{a.success}</td>
                      <td className="px-4 py-2 text-[13px] text-red-500">{a.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Return Distribution */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Return Distribution</h3>
          </div>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-body-sm">
              No return data yet for this period.
            </div>
          ) : (
            <div className="flex items-center gap-8">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <p className="text-[28px] font-bold text-foreground">{data.returnDistribution.totalUnits.toLocaleString()}</p>
                <p className="text-[12px] text-muted-foreground mb-4">Total Return Units</p>
                <div className="space-y-2">
                  {[
                    { label: "Exchange", value: data.returnDistribution.exchange, count: data.returnDistribution.counts.exchange, color: "#1f108e" },
                    { label: "Store Credit", value: data.returnDistribution.storeCredit, count: data.returnDistribution.counts.storeCredit, color: "#62fae3" },
                    { label: "Refund", value: data.returnDistribution.refund, count: data.returnDistribution.counts.refund, color: "#f59e0b" },
                    { label: "Flagged", value: data.returnDistribution.flagged, count: data.returnDistribution.counts.flagged, color: "#ef4444" },
                  ].filter((item) => item.count > 0).map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[13px] text-foreground">{item.label}</span>
                      <span className="text-[13px] font-semibold text-foreground ml-auto">{item.value}% ({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profit Recovery Over Time */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Profit Recovery Over Time</h3>
              <p className="text-[12px] text-muted-foreground">Actual recovery with running average projection</p>
            </div>
            <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg">
              {(["Daily", "Weekly"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${chartView === view ? "bg-card text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          {data.profitRecovery.length === 0 || data.profitRecovery.every((p) => p.actual === 0) ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-body-sm">
              No recovery data yet for this period.
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.profitRecovery}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#777584" }} axisLine={{ stroke: "#e5eeff" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#777584" }} axisLine={{ stroke: "#e5eeff" }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5eeff", fontSize: "12px" }}
                      formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                    />
                    <Line type="monotone" dataKey="projected" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Projected" />
                    <Line type="monotone" dataKey="actual" stroke="#1f108e" strokeWidth={2} dot={{ fill: "#1f108e", r: 4 }} name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#1f108e]" />
                  <span className="text-[11px] text-muted-foreground">Actual Recovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#93c5fd] border-dashed" />
                  <span className="text-[11px] text-muted-foreground">Projected (Running Avg)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Returned Products Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Top Returned Products</h3>
          <span className="text-[12px] text-muted-foreground">Last {days} days</span>
        </div>
        {data.topReturnedProducts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-body-sm">
            No returned products in this period yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Return Rate</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Potential Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.topReturnedProducts.map((product, i) => (
                  <tr key={i} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground">{product.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground font-mono">{product.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(parseFloat(product.returnRate), 100)}%` }}
                          />
                        </div>
                        <span className="text-[13px] font-medium text-foreground">{product.returnRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-foreground">{product.quantity.toLocaleString()} Units</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-foreground">${product.recovery.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
