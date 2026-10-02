"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

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

export default function AnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [chartView, setChartView] = React.useState<"Daily" | "Weekly">("Daily")

  React.useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Analytics & Reports</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Optimize your return operations with real-time margin insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-body-sm text-foreground">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">calendar_today</span>
            <span>Oct 1, 2023 - Oct 31, 2023</span>
            <span className="material-symbols-outlined text-[16px] text-muted-foreground">expand_more</span>
          </div>
          <button className="flex items-center gap-2 px-5 py-2 bg-[#1e3a5f] text-white rounded-lg text-body-sm font-medium hover:bg-[#162d4a] transition-all">
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
            <p className="text-[32px] font-bold text-foreground tracking-tight">${data.totalMarginProtected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
          <p className="text-[32px] font-bold text-foreground tracking-tight">${data.netRetentionValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <YAxis tick={{ fontSize: 11, fill: "#777584" }} axisLine={{ stroke: "#e5eeff" }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5eeff", fontSize: "12px" }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
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
          <button className="text-[13px] font-medium text-primary hover:text-primary/80 transition-all">
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
                  <td className="px-6 py-4 text-[13px] font-medium text-foreground">${product.recovery.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}