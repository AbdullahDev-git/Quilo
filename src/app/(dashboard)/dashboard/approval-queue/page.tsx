"use client"

import * as React from "react"
import { toast } from "@/components/toast"

interface ApprovalItem {
  id: string
  orderId: string
  customerName: string
  customerEmail: string
  item: string
  amount: string
  reason: string
  risk: string
  riskBg: string
  status: string
  date: string
  returnStatus: string
}

export default function ApprovalQueuePage() {
  const [items, setItems] = React.useState<ApprovalItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState<"all" | "fraud" | "pending">("all")

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals")
      if (res.ok) {
        const data = await res.json()
        const allItems: ApprovalItem[] = [
          ...(data.pending || []).map((o: any) => ({
            id: o.id,
            orderId: o.orderNumber || o.orderId,
            customerName: o.customerName || o.customerEmail || "Unknown",
            customerEmail: o.customerEmail || "",
            item: o.lineItems ? JSON.parse(o.lineItems).map((i: any) => i.title).join(", ") || "N/A" : "N/A",
            amount: `${o.currency || "$"}${o.totalAmount}`,
            reason: o.returnReason || o.reason || "N/A",
            risk: "Low",
            riskBg: "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]",
            status: o.returnStatus === "pending" ? "Pending" : o.returnStatus,
            date: new Date(o.createdAt).toLocaleDateString(),
            returnStatus: o.returnStatus,
          })),
          ...(data.flagged || []).map((o: any) => ({
            id: o.id,
            orderId: o.orderNumber || o.orderId,
            customerName: o.customerName || o.customerEmail || "Unknown",
            customerEmail: o.customerEmail || "",
            item: o.lineItems ? JSON.parse(o.lineItems).map((i: any) => i.title).join(", ") || "N/A" : "N/A",
            amount: `${o.currency || "$"}${o.totalAmount}`,
            reason: o.returnReason || o.reason || "Multiple returns from same IP",
            risk: "High",
            riskBg: "bg-[#ffdad6] text-[#93000a] dark:bg-[#ffdad6]/20 dark:text-[#ffdad6]",
            status: "Flagged",
            date: new Date(o.createdAt).toLocaleDateString(),
            returnStatus: o.returnStatus,
          })),
        ]
        setItems(allItems)
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchApprovals()
  }, [])

  const approve = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    toast("Return approved successfully", "success")
    try {
      await fetch(`/api/approvals/${id}/approve`, { method: "POST" })
    } catch {}
  }

  const reject = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    toast("Return rejected", "info")
    try {
      await fetch(`/api/approvals/${id}/reject`, { method: "POST" })
    } catch {}
  }

  const filteredItems = React.useMemo(() => {
    if (filter === "fraud") return items.filter(i => i.risk === "High")
    if (filter === "pending") return items.filter(i => i.status === "Pending")
    return items
  }, [items, filter])

  const statusIcons: Record<string, string> = {
    Pending: "hourglass_empty",
    Flagged: "report",
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-[32px] font-semibold text-foreground mb-1 tracking-tight">Approval Queue</h1>
          <p className="text-body-md text-on-surface-variant">Review and manage pending return requests requiring manual verification.</p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-xl">
          <button onClick={() => setFilter("all")} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all ${filter === "all" ? "text-primary bg-card shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>All</button>
          <button onClick={() => setFilter("fraud")} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all ${filter === "fraud" ? "text-primary bg-card shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>Fraud Risk</button>
          <button onClick={() => setFilter("pending")} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all ${filter === "pending" ? "text-primary bg-card shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>Pending</button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-[48px]">check_circle</span>
          <p className="text-body-md mt-2">{items.length === 0 ? "No items in the approval queue." : "No items match this filter."}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                    <span className="material-symbols-outlined text-primary">{statusIcons[item.status] || "assignment"}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-bold text-primary">{item.orderId}</span>
                      <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-tight rounded-full ${item.riskBg}`}>
                        {item.risk} Risk
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-body-sm text-muted-foreground">Customer</p>
                        <p className="text-body-md font-medium text-foreground">{item.customerName}</p>
                      </div>
                      <div>
                        <p className="text-body-sm text-muted-foreground">Item</p>
                        <p className="text-body-md font-medium text-foreground">{item.item}</p>
                      </div>
                      <div>
                        <p className="text-body-sm text-muted-foreground">Amount</p>
                        <p className="text-body-md font-medium text-foreground">{item.amount}</p>
                      </div>
                      <div>
                        <p className="text-body-sm text-muted-foreground">Reason</p>
                        <p className="text-body-md text-on-surface-variant">{item.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => approve(item.id)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[12px] font-bold hover:opacity-90 transition-all">
                    Approve
                  </button>
                  <button onClick={() => reject(item.id)} className="px-4 py-2 border border-border text-on-surface-variant rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-all">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
