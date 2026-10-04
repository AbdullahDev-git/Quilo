"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { StatsCard } from "@/components/superadmin/stats-card"
import { SearchInput } from "@/components/superadmin/search-input"
import { DataTable, type Column } from "@/components/superadmin/data-table"
import { StatusBadge } from "@/components/superadmin/status-badge"
import { demoSuperadminStores } from "@/lib/demo-data"

interface Store {
  id: string
  name: string
  domain: string
  status: string
  userId: string
  userName: string | null
  userEmail: string | null
  createdAt: string
  updatedAt: string
  orderCount: number
}

interface StoresResponse {
  stores: Store[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function StoresPage() {
  const router = useRouter()
  const [data, setData] = React.useState<StoresResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    fetchStores()
  }, [search, page])

  async function fetchStores() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))

      const res = await fetch(`/api/superadmin/stores?${params}`, { credentials: "include" })
      // Demo mode: use demo data on 401
      if (res.status === 401) {
        const demoStores: Store[] = demoSuperadminStores.map(s => ({
          id: s.id,
          name: s.name,
          domain: s.domain,
          status: s.status,
          userId: s.id,
          userName: s.owner,
          userEmail: "",
          createdAt: "2026-01-15",
          updatedAt: "2026-03-28",
          orderCount: s.orders,
        }))
        setData({ stores: demoStores, total: demoStores.length, page: 1, limit: 10, totalPages: 1 })
        return
      }
      const json = await res.json()
      // Use demo data if API returns empty
      if (!json || !json.stores || json.stores.length === 0) {
        const demoStores: Store[] = demoSuperadminStores.map(s => ({
          id: s.id,
          name: s.name,
          domain: s.domain,
          status: s.status,
          userId: s.id,
          userName: s.owner,
          userEmail: "",
          createdAt: "2026-01-15",
          updatedAt: "2026-03-28",
          orderCount: s.orders,
        }))
        setData({ stores: demoStores, total: demoStores.length, page: 1, limit: 10, totalPages: 1 })
      } else {
        setData(json)
      }
    } catch {
      // Use demo data on error
      const demoStores: Store[] = demoSuperadminStores.map(s => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        status: s.status,
        userId: s.id,
        userName: s.owner,
        userEmail: "",
        createdAt: "2026-01-15",
        updatedAt: "2026-03-28",
        orderCount: s.orders,
      }))
      setData({ stores: demoStores, total: demoStores.length, page: 1, limit: 10, totalPages: 1 })
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<Store>[] = [
    {
      key: "name",
      label: "Store",
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-[11px] text-muted-foreground">{item.domain}</p>
        </div>
      ),
    },
    {
      key: "userName",
      label: "Owner",
      render: (item) => (
        <div>
          <p className="text-[13px]">{item.userName || "Unknown"}</p>
          <p className="text-[11px] text-muted-foreground">{item.userEmail}</p>
        </div>
      ),
    },
    {
      key: "orderCount",
      label: "Orders",
      render: (item) => <span>{item.orderCount.toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <StatusBadge
          label={item.status}
          variant={
            item.status === "active" ? "success" :
            item.status === "suspended" ? "error" : "warning"
          }
        />
      ),
    },
    {
      key: "createdAt",
      label: "Connected",
      render: (item) => (
        <span className="text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Store Network"
        description={`${data?.total || 0} connected stores`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total Stores" value={data?.total || 0} icon="store" iconColor="bg-blue-50 text-blue-600" />
        <StatsCard
          title="Active Stores"
          value={data?.stores.filter(s => s.status === "active").length || 0}
          icon="check_circle"
          iconColor="bg-green-50 text-green-600"
        />
        <StatsCard
          title="Total Orders"
          value={data?.stores.reduce((sum, s) => sum + s.orderCount, 0).toLocaleString() || "0"}
          icon="shopping_cart"
          iconColor="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search stores..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.stores || []} emptyMessage="No stores found" />

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[12px] text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-[12px] bg-muted rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1.5 text-[12px] bg-muted rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
