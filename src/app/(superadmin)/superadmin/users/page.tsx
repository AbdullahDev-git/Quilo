"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { StatsCard } from "@/components/superadmin/stats-card"
import { SearchInput } from "@/components/superadmin/search-input"
import { DataTable, type Column } from "@/components/superadmin/data-table"
import { StatusBadge } from "@/components/superadmin/status-badge"
import { demoSuperadminUsers } from "@/lib/demo-data"

interface User {
  id: string
  email: string
  name: string
  createdAt: string
  lastLoginAt: string | null
  lockedUntil: string | null
  storeCount: number
  orderCount: number
  status: string
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function UsersPage() {
  const router = useRouter()
  const [data, setData] = React.useState<UsersResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    fetchUsers()
  }, [search, page])

  async function fetchUsers() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(page))

      const res = await fetch(`/api/superadmin/users?${params}`, { credentials: "include" })
      // Demo mode: use demo data on 401
      if (res.status === 401) {
        const demoUsers: User[] = demoSuperadminUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.joined,
          lastLoginAt: null,
          lockedUntil: null,
          storeCount: u.stores,
          orderCount: u.orders,
          status: u.status,
        }))
        setData({ users: demoUsers, total: demoUsers.length, page: 1, limit: 10, totalPages: 1 })
        return
      }
      const json = await res.json()
      // Use demo data if API returns empty
      if (!json || !json.users || json.users.length === 0) {
        const demoUsers: User[] = demoSuperadminUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.joined,
          lastLoginAt: null,
          lockedUntil: null,
          storeCount: u.stores,
          orderCount: u.orders,
          status: u.status,
        }))
        setData({ users: demoUsers, total: demoUsers.length, page: 1, limit: 10, totalPages: 1 })
      } else {
        setData(json)
      }
    } catch {
      // Use demo data on error
      const demoUsers: User[] = demoSuperadminUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.joined,
        lastLoginAt: null,
        lockedUntil: null,
        storeCount: u.stores,
        orderCount: u.orders,
        status: u.status,
      }))
      setData({ users: demoUsers, total: demoUsers.length, page: 1, limit: 10, totalPages: 1 })
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "User",
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-[11px] text-muted-foreground">{item.email}</p>
        </div>
      ),
    },
    {
      key: "storeCount",
      label: "Stores",
      render: (item) => <span>{item.storeCount}</span>,
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
          label={item.status === "locked" ? "Locked" : "Active"}
          variant={item.status === "locked" ? "error" : "success"}
        />
      ),
    },
    {
      key: "lastLoginAt",
      label: "Last Login",
      render: (item) => (
        <span className="text-muted-foreground">
          {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
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
        title="User Management"
        description={`${data?.total || 0} total merchants`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total Users" value={data?.total || 0} icon="people" iconColor="bg-blue-50 text-blue-600" />
        <StatsCard title="Active Users" value={data?.users.filter(u => u.status === "active").length || 0} icon="check_circle" iconColor="bg-green-50 text-green-600" />
        <StatsCard title="Locked Users" value={data?.users.filter(u => u.status === "locked").length || 0} icon="lock" iconColor="bg-red-50 text-red-600" />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search users..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.users || []} emptyMessage="No users found" />

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
