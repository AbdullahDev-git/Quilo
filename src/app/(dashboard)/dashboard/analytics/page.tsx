"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { toast } from "@/components/toast"

interface ReturnDistribution {
  exchange: number
  storeCredit: number
  refund: number
  totalUnits: number
}

interface ProfitRecoveryPoint {
  day: string
  actual: number
  projected: number
}

interface TopProduct {
  name: string
  sku: string
  category: string
  quantity: number
  recovery: number
  returnRate: string
}

interface AnalyticsData {
  totalMarginProtected: number
  marginChange: number
  exchangeRate: number
  netRetentionValue: number
  returnDistribution: ReturnDistribution
  profitRecovery: ProfitRecoveryPoint[]
  topReturnedProducts: TopProduct[]
  totalOrders: number
  activeRules: number
  connectedStores: number
}

const DONUT_COLORS = ["#1e3a5f", "#2563eb", "#93c5fd"]

const demoData: AnalyticsData = {
  totalMarginProtected: 2845000,
  marginChange: 18,
  exchangeRate: 42,
  netRetentionValue: 1250000,
  returnDistribution: {
    exchange: 35,
    storeCredit: 25,
    refund: 40,
    totalUnits: 428,
  },
  profitRecovery: [
    { day: "Week 1", actual: 45000, projected: 40000 },
    { day: "Week 2", actual: 52000, projected: 48000 },
    { day: "Week 3", actual: 61000, projected: 55000 },
    { day: "Week 4", actual: 78000, projected: 62000 },
  ],
  topReturnedProducts: [
    { name: "Cotton Kurta", sku: "CK-001", category: "Ethnic Wear", quantity: 89, recovery: 450000, returnRate: "12.5" },
    { name: "Running Shoes", sku: "RS-002", category: "Footwear", quantity: 67, recovery: 380000, returnRate: "8.3" },
    { name: "Premium Jacket", sku: "PJ-003", category: "Outerwear", quantity: 45, recovery: 520000, returnRate: "15.2" },
    { name: "Silk Scarf", sku: "SS-004", category: "Accessories", quantity: 38, recovery: 120000, returnRate: "6.1" },
  ],
  totalOrders: 2847,
  activeRules: 12,
  connectedStores: 3,
}

const dateRanges = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This year", value: "year" },
]

export default function AnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [chartView, setChartView] = React.useState<"Daily" | "Weekly">("Daily")
  const [dateRange, setDateRange] = React.useState("30d")
  const [showDatePicker, setShowDatePicker] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.returnDistribution) setData(data)
        else setData(demoData)
        setLoading(false)
      })
      .catch(() => {
        setData(demoData)
        setLoading(false)
      })
  }, [])

  const exportReport = () => {
    if (!data) return
    const report = {
      period: dateRange,
      totalMarginProtected: data.totalMarginProtected,
      exchangeRate: data.exchangeRate,
      netRetentionValue: data.netRetentionValue,
      returnDistribution: data.returnDistribution,
      topProducts: data.topReturnedProducts,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "analytics-report.json"
    a.click()
    URL.revokeObjectURL(url)
    toast("Analytics report exported successfully", "success")
  }

  if (loading) {
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
      </div>
    )
  }

  const donutData = [
    { name: "Exchange", value: data.returnDistribution.exchange },
    { name: "Store Credit", value: data.returnDistribution.storeCredit },
    { name: "Refund", value: data.returnDistribution.refund },
  ]

  const selectedRangeLabel = dateRanges.find(d => d.value === dateRange)?.label || "Last 30 days"

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Analytics & Reports</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Optimize your return operations with real-time margin insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-body-sm text-foreground hover:bg-surface-container-low transition-all">
              <span className="material-symbols-outlined text-[18px] text-muted-foreground">calendar_today</span>
              <span>{selectedRangeLabel}</span>
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">expand_more</span>
            </button>
            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
                {dateRanges.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => { setDateRange(d.value); setShowDatePicker(false); toast(`Showing data for ${d.label}`, "info") }}
                    className={`w-full text-left px-4 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${dateRange === d.value ? "text-primary font-semibold" : "text-foreground"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={exportReport} className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-body-sm font-medium hover:bg-[#162d4a] transition-all">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Margin Protected */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Margin Protected</p>
          <div className="flex items-end gap-3">
            <p className="text-[32px] font-bold text-foreground tracking-tight">PKR {data.totalMarginProtected.toLocaleString()}</p>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-emerald-600 mb-1">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              +{data.marginChange}%
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-2">Vs. previous 30-day period</p>
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
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeDasharray={`${data.exchangeRate}, 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Net Retention Value */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Net Retention Value</p>
          <p className="text-[32px] font-bold text-foreground tracking-tight">PKR {data.netRetentionValue.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded">savings</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Return Distribution */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Return Distribution</h3>
            <button className="text-muted-foreground hover:text-foreground">
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>
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
              <p className="text-[12px] text-muted-foreground mb-4">Total Units</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a5f]" />
                  <span className="text-[13px] text-foreground">Exchange</span>
                  <span className="text-[13px] font-semibold text-foreground ml-auto">{data.returnDistribution.exchange}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                  <span className="text-[13px] text-foreground">Store Credit</span>
                  <span className="text-[13px] font-semibold text-foreground ml-auto">{data.returnDistribution.storeCredit}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#93c5fd]" />
                  <span className="text-[13px] text-foreground">Refund</span>
                  <span className="text-[13px] font-semibold text-foreground ml-auto">{data.returnDistribution.refund}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Recovery Over Time */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Profit Recovery Over Time</h3>
              <p className="text-[12px] text-muted-foreground">Projected vs Actual Recovery</p>
            </div>
            <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg">
              {["Daily", "Weekly"].map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view as "Daily" | "Weekly")}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${chartView === view ? "bg-card text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.profitRecovery}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#777584" }} axisLine={{ stroke: "#e5eeff" }} />
                <YAxis tick={{ fontSize: 11, fill: "#777584" }} axisLine={{ stroke: "#e5eeff" }} tickFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5eeff", fontSize: "12px" }}
                  formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, ""]}
                />
                <Line type="monotone" dataKey="projected" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Projected" />
                <Line type="monotone" dataKey="actual" stroke="#1e3a5f" strokeWidth={2} dot={{ fill: "#1e3a5f", r: 4 }} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#1e3a5f]" />
              <span className="text-[11px] text-muted-foreground">Actual Recovery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#93c5fd] border-dashed" />
              <span className="text-[11px] text-muted-foreground">Projected Recovery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Returned Products Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Top Returned Products</h3>
          <button onClick={() => toast("Full report view coming soon", "info")} className="text-[13px] font-medium text-primary hover:text-primary/80 transition-all">
            View All Report
          </button>
        </div>
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
                  <td className="px-6 py-4 text-[13px] font-medium text-foreground">PKR {product.recovery.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
