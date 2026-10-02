"use client"

import * as React from "react"

interface Webhook {
  id: string
  topic: string
  endpoint: string
  status: string
  lastDeliveryAt: string
  createdAt: string
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCreate, setShowCreate] = React.useState(false)
  const [topic, setTopic] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/webhooks")
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data)
      }
    } catch (err) {
      console.error("Failed to fetch webhooks:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchWebhooks()
  }, [])

  const createWebhook = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, endpoint, status: "active" }),
      })
      if (res.ok) {
        setTopic("")
        setEndpoint("")
        setShowCreate(false)
        fetchWebhooks()
      }
    } catch (err) {
      console.error("Failed to create webhook:", err)
    } finally {
      setCreating(false)
    }
  }

  const deleteWebhook = async (id: string) => {
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" })
    if (res.ok) fetchWebhooks()
  }

  const statusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "active") return "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]"
    if (s === "paused") return "bg-[#ffdbcc] text-[#7a3003] dark:bg-[#ffdbcc]/20 dark:text-[#ffdbcc]"
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
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Webhooks</h2>
          <p className="text-body-md text-on-surface-variant">Manage incoming webhooks from your connected stores.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Webhook
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-semibold text-foreground">Add Webhook</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mb-4">
              <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30" placeholder="orders/create" />
            </div>
            <div className="mb-6">
              <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Endpoint URL</label>
              <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30" placeholder="https://your-server.com/webhook" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-body-md font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
              <button onClick={createWebhook} disabled={creating || !topic.trim() || !endpoint.trim()} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50">
                {creating ? "Creating..." : "Create Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-[48px]">webhook</span>
          <p className="text-body-md mt-2">No webhooks configured yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">webhook</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground font-mono text-[13px]">{wh.topic}</p>
                      <span className={`px-3 py-0.5 text-[11px] font-bold uppercase tracking-tight rounded-full ${statusBadge(wh.status)}`}>{wh.status}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground">{wh.endpoint}</p>
                    <p className="text-body-sm text-muted-foreground">Last delivery: {wh.lastDeliveryAt ? new Date(wh.lastDeliveryAt).toLocaleString() : "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 border border-border rounded-lg text-body-sm font-medium hover:bg-surface-container-low transition-all">Configure</button>
                  <button onClick={() => deleteWebhook(wh.id)} className="px-4 py-2 border border-border rounded-lg text-body-sm font-medium text-destructive hover:bg-[#ffdad6] transition-all">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
