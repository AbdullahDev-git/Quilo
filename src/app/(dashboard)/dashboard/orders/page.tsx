"use client"

import * as React from "react"

interface OrderItem {
  id: number
  title: string
  quantity: number
  price: string
  sku: string
}

interface Order {
  id: string
  orderId: string
  orderNumber: string
  customerEmail: string
  customerName: string
  totalAmount: string
  currency: string
  status: string
  financialStatus: string
  fulfillmentStatus: string
  lineItems: string
  returnReason: string
  returnStatus: string
  isFraud: string
  createdAt: string
}

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<Order | null>(null)
  const [syncing, setSyncing] = React.useState(false)
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [storeId, setStoreId] = React.useState<string>("")

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders")
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStoreId = async () => {
    try {
      const res = await fetch("/api/stores")
      if (res.ok) {
        const stores = await res.json()
        if (stores.length > 0) {
          setStoreId(stores[0].id)
        }
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err)
    }
  }

  React.useEffect(() => {
    fetchOrders()
    fetchStoreId()
  }, [])

  const syncOrders = async () => {
    if (!storeId) {
      console.error("No store connected")
      return
    }
    setSyncing(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrders((prev) => [...prev as Order[], ...(data.synced ? [] : [])])
        fetchOrders()
      }
    } catch (err) {
      console.error("Failed to sync orders:", err)
    } finally {
      setSyncing(false)
    }
  }

  const updateStatus = async (id: string, status: string, returnStatus: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, returnStatus }),
    })
    if (res.ok) {
      fetchOrders()
    }
  }

  const analyzeWithAI = async (orderId: string) => {
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const res = await fetch("/api/ai/analyze-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiAnalysis(data)
      }
    } catch {
      setAiAnalysis({ error: "Analysis failed" })
    } finally {
      setAnalyzing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "pending" || s === "refunded" || s === "returned") return "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]"
    if (s === "processing" || s === "in_progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    if (s === "denied" || s === "cancelled") return "bg-[#ffdad6] text-[#93000a] dark:bg-[#ffdad6]/20 dark:text-[#ffdad6]"
    return "bg-muted text-muted-foreground"
  }

  const getReturnBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "auto_approved" || s === "approved") return "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]"
    if (s === "pending" || s === "Pending") return "bg-[#ffdbcc] text-[#7a3003] dark:bg-[#ffdbcc]/20 dark:text-[#ffdbcc]"
    if (s === "flagged") return "bg-[#ffdad6] text-[#93000a] dark:bg-[#ffdad6]/20 dark:text-[#ffdad6]"
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
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Order Tracking</h2>
          <p className="text-body-md text-on-surface-variant">Monitoring {orders.length} return workflows across your stores.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={syncOrders} disabled={syncing} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-body-md font-medium bg-card shadow-sm hover:bg-surface-container-low transition-all">
            <span className="material-symbols-outlined text-[20px]">sync</span>
            {syncing ? "Syncing..." : "Sync Orders"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-border">
            <tr>
              {["Order ID", "Customer", "Financial Status", "Return Status", "Amount", ""].map((h) => (
                <th key={h} className="px-6 py-4 text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {orders.map((order) => (
              <tr key={order.id} onClick={() => { setSelected(order); setAiAnalysis(null) }} className={`hover:bg-muted transition-colors cursor-pointer ${selected?.id === order.id ? "bg-surface-container-low" : ""}`}>
                <td className="px-6 py-4 font-mono text-[13px] font-bold text-primary">{order.orderNumber || order.orderId}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#dce9ff] flex items-center justify-center text-[10px] font-bold text-foreground">
                      {(order.customerName || order.customerEmail || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-body-md font-bold text-foreground">{order.customerName || order.customerEmail || "Unknown"}</p>
                      <p className="text-body-sm text-muted-foreground">{order.customerEmail || ""}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight flex items-center w-fit gap-1 ${getStatusBadge(order.financialStatus || order.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {order.financialStatus || order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight flex items-center w-fit gap-1 ${getReturnBadge(order.returnStatus)}`}>
                    {order.returnStatus}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-body-md">{order.currency} {order.totalAmount}</td>
                <td className="px-6 py-4 text-right">
                  <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-[48px]">shopping_cart</span>
          <p className="text-body-md mt-2">No orders found. Sync your store to pull orders.</p>
          <button onClick={syncOrders} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Sync Orders
          </button>
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-card shadow-2xl border-l border-border transform transition-transform duration-300 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[20px] font-semibold text-foreground">Order Details</h3>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-surface-container-low rounded-lg transition-all">
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/50">
                <div className="w-12 h-12 rounded-full bg-[#dce9ff] flex items-center justify-center text-[14px] font-bold text-foreground">
                  {(selected.customerName || selected.customerEmail || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-body-md">{selected.customerName || "Unknown"}</p>
                  <p className="text-body-sm text-muted-foreground">{selected.customerEmail || ""}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Order Number</p>
                    <p className="font-mono text-[13px] font-bold text-primary">{selected.orderNumber || selected.orderId}</p>
                  </div>
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                    <p className="text-body-md text-foreground">{formatDate(selected.createdAt)}</p>
                  </div>
                </div>

                <div className="bg-background rounded-lg p-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <p className="text-body-md text-foreground">{selected.financialStatus || selected.status}</p>
                </div>

                <div className="bg-background rounded-lg p-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Return Status</p>
                  <p className="text-body-md text-foreground">{selected.returnStatus}</p>
                </div>

                {selected.returnReason && (
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Return Reason</p>
                    <p className="text-body-md text-foreground">{selected.returnReason}</p>
                  </div>
                )}

                <div className="flex items-center justify-between bg-surface-container-low rounded-lg p-3">
                  <p className="font-medium text-foreground">Total Amount</p>
                  <p className="text-[20px] font-bold text-primary">{selected.currency} {selected.totalAmount}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => updateStatus(selected.id, "refunded", "auto_approved")} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all">
                  Process Refund
                </button>
                <button onClick={() => updateStatus(selected.id, selected.status, "flagged")} className="flex-1 px-4 py-2.5 border border-border rounded-lg text-body-md font-medium hover:bg-surface-container-low transition-all">
                  Mark as Fraud
                </button>
              </div>

              <div className="mt-4 border-t border-border/50 pt-4">
                <button
                  onClick={() => analyzeWithAI(selected.id)}
                  disabled={analyzing}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  )}
                  {analyzing ? "Analyzing..." : "AI Fraud Analysis"}
                </button>

                {aiAnalysis && !aiAnalysis.error && (
                  <div className="mt-3 bg-background rounded-lg p-4 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        aiAnalysis.riskScore === "high" ? "bg-red-500" :
                        aiAnalysis.riskScore === "medium" ? "bg-yellow-500" : "bg-green-500"
                      }`} />
                      <span className="text-[13px] font-bold text-foreground">
                        Risk: {aiAnalysis.riskScore?.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({Math.round((aiAnalysis.confidence || 0) * 100)}% confidence)
                      </span>
                    </div>
                    {aiAnalysis.reasons?.length > 0 && (
                      <ul className="text-[12px] text-muted-foreground space-y-1 mb-2">
                        {aiAnalysis.reasons.map((r: string, i: number) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[12px] text-foreground font-medium">{aiAnalysis.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
