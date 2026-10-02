"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

interface Store {
  id: string
  name: string
  domain: string
  accessToken: string
  shopifyStoreId: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export default function StoresPage() {
  const router = useRouter()
  const [stores, setStores] = React.useState<Store[]>([])
  const [loading, setLoading] = React.useState(true)
  const [connecting, setConnecting] = React.useState(false)
  const [showConnect, setShowConnect] = React.useState(false)
  const [storeUrl, setStoreUrl] = React.useState("")
  const [accessToken, setAccessToken] = React.useState("")
  const [error, setError] = React.useState("")

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const data = await res.json()
        setStores(data)
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchStores()
  }, [])

  const handleConnect = async () => {
    if (!storeUrl || !accessToken) {
      setError("Store URL and Access Token are required")
      return
    }
    setConnecting(true)
    setError("")
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeUrl.replace(".myshopify.com", ""),
          domain: storeUrl,
          accessToken,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to connect store")
      }
      setShowConnect(false)
      setStoreUrl("")
      setAccessToken("")
      fetchStores()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this store?")) return
    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" })
      if (res.ok) fetchStores()
    } catch (err) {
      console.error("Failed to disconnect store:", err)
    }
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "active") return "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]"
    if (s === "error") return "bg-[#ffdad6] text-[#93000a] dark:bg-[#ffdad6]/20 dark:text-[#ffdad6]"
    return "bg-muted text-muted-foreground"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Connected Stores</h2>
          <p className="text-body-md text-on-surface-variant">Manage your Shopify store connections.</p>
        </div>
        <button onClick={() => setShowConnect(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Connect Store
        </button>
      </div>

      {showConnect && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowConnect(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-semibold text-foreground">Connect Shopify Store</h3>
              <button onClick={() => setShowConnect(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mb-4">
              <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Store URL</label>
              <input
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                placeholder="https://mystore.myshopify.com"
              />
            </div>
            <div className="mb-6">
              <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Access Token</label>
              <input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                placeholder="shpat_..."
              />
            </div>
            {error && <p className="text-destructive text-body-sm mb-4">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConnect(false)} className="px-5 py-2.5 text-body-md font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
              <button onClick={handleConnect} disabled={connecting} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50">
                {connecting ? "Connecting..." : "Connect Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stores.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-[48px]">store</span>
          <p className="text-body-md mt-2">No stores connected yet.</p>
          <button onClick={() => setShowConnect(true)} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Connect your first store
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map((store) => (
            <div key={store.id} className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#e2dfff] dark:bg-[#3730a3]/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[28px]">store</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{store.name}</p>
                      <span className={`px-3 py-0.5 text-[11px] font-bold uppercase tracking-tight rounded-full ${getStatusBadge(store.status)}`}>{store.status}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">{store.domain}</p>
                    <div className="mt-1 flex gap-4 text-body-sm text-muted-foreground">
                      <span>Connected {formatDate(store.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 border border-border rounded-lg text-body-sm font-medium hover:bg-surface-container-low transition-all">View Details</button>
                  <button onClick={() => handleDisconnect(store.id)} className="px-4 py-2 border border-destructive text-destructive rounded-lg text-body-sm font-medium hover:bg-[#ffdad6] transition-all">Disconnect</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}