"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { StatsCard } from "@/components/superadmin/stats-card"
import { SearchInput } from "@/components/superadmin/search-input"
import { DataTable, type Column } from "@/components/superadmin/data-table"
import { StatusBadge } from "@/components/superadmin/status-badge"

interface Rule {
  id: string
  name: string
  description: string | null
  status: string
  requiredPlan: string
  triggerCount: number
  lastTriggeredAt: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
  storeName: string | null
}

interface RuleDefinition {
  id: string
  name: string
  displayName: string
  description: string | null
  category: string
  requiredPlan: string
  enabled: string
}

interface RulesResponse {
  rules: Rule[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const plans = ["free", "starter", "pro", "enterprise"]

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
}

export default function RulesMonitorPage() {
  const router = useRouter()
  const [data, setData] = React.useState<RulesResponse | null>(null)
  const [definitions, setDefinitions] = React.useState<RuleDefinition[]>([])
  const [stats, setStats] = React.useState({ totalRules: 0, activeRules: 0, totalTriggers: 0 })
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [tab, setTab] = React.useState<"rules" | "definitions">("rules")

  React.useEffect(() => {
    fetchAll()
  }, [search, page])

  async function fetchAll() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))

      const [rulesRes, defsRes, statsRes] = await Promise.all([
        fetch(`/api/superadmin/rules?${params}`, { credentials: "include" }),
        fetch(`/api/superadmin/rules/definitions`, { credentials: "include" }),
        fetch(`/api/superadmin/rules/stats`, { credentials: "include" }),
      ])

      if (rulesRes.status === 401) {
        router.push("/superadmin/login")
        return
      }

      const rulesData = await rulesRes.json()
      const defsData = await defsRes.json()
      const statsData = await statsRes.json()

      setData(rulesData)
      setDefinitions(defsData.definitions || [])
      setStats(statsData)
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }

  async function toggleDefinition(id: string, currentEnabled: string) {
    try {
      await fetch(`/api/superadmin/rules/definitions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: currentEnabled === "true" ? "false" : "true" }),
      })
      fetchAll()
    } catch {
      // error
    }
  }

  async function updatePlan(id: string, newPlan: string) {
    try {
      await fetch(`/api/superadmin/rules/definitions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requiredPlan: newPlan }),
      })
      fetchAll()
    } catch {
      // error
    }
  }

  const ruleColumns: Column<Rule>[] = [
    {
      key: "name",
      label: "Rule",
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{item.description || "No description"}</p>
        </div>
      ),
    },
    {
      key: "userName",
      label: "Merchant",
      render: (item) => (
        <div>
          <p className="text-[13px]">{item.userName || "Unknown"}</p>
          <p className="text-[11px] text-muted-foreground">{item.storeName}</p>
        </div>
      ),
    },
    {
      key: "requiredPlan",
      label: "Plan",
      render: (item) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${planColors[item.requiredPlan] || planColors.free}`}>
          {item.requiredPlan}
        </span>
      ),
    },
    {
      key: "triggerCount",
      label: "Triggers",
      render: (item) => <span className="font-medium">{item.triggerCount.toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <StatusBadge
          label={item.status}
          variant={item.status === "active" ? "success" : item.status === "paused" ? "warning" : "neutral"}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Rules Monitor"
        description="Manage automation rules and access control"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("rules")}
          className={`px-4 py-1.5 rounded text-[13px] font-medium transition-all ${
            tab === "rules" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Merchant Rules
        </button>
        <button
          onClick={() => setTab("definitions")}
          className={`px-4 py-1.5 rounded text-[13px] font-medium transition-all ${
            tab === "definitions" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Rule Access Control
        </button>
      </div>

      {tab === "rules" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatsCard title="Total Rules" value={stats.totalRules} icon="rule" iconColor="bg-blue-50 text-blue-600" />
            <StatsCard title="Active Rules" value={stats.activeRules} icon="check_circle" iconColor="bg-green-50 text-green-600" />
            <StatsCard title="Total Triggers" value={stats.totalTriggers.toLocaleString()} icon="bolt" iconColor="bg-orange-50 text-orange-600" />
          </div>

          <div className="mb-4">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search rules..." />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
            </div>
          ) : (
            <DataTable columns={ruleColumns} data={data?.rules || []} emptyMessage="No rules found" />
          )}
        </>
      ) : (
        <>
          <p className="text-[13px] text-muted-foreground mb-4">
            Control which rule types are available for each subscription plan.
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
            </div>
          ) : (
            <div className="space-y-3">
              {definitions.map((def) => (
                <div key={def.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[14px] font-medium text-foreground">{def.displayName}</h4>
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">{def.category}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground">{def.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Plan selector */}
                      <select
                        value={def.requiredPlan}
                        onChange={(e) => updatePlan(def.id, e.target.value)}
                        className="px-2 py-1 border border-border rounded text-[12px] bg-white"
                      >
                        {plans.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>

                      {/* Enable/disable toggle */}
                      <button
                        onClick={() => toggleDefinition(def.id, def.enabled)}
                        className={`w-10 h-5 rounded-full transition-all ${
                          def.enabled === "true" ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                          def.enabled === "true" ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
