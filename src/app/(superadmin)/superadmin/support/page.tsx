"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { StatsCard } from "@/components/superadmin/stats-card"
import { StatusBadge } from "@/components/superadmin/status-badge"
import { ConfirmDialog } from "@/components/superadmin/confirm-dialog"

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  targetPlans: string[] | string
  status: string
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface Ticket {
  id: string
  subject: string
  message: string
  category: string
  priority: string
  status: string
  adminResponse: string | null
  respondedAt: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
}

interface Feature {
  id: string
  name: string
  displayName: string
  description: string | null
  enabled: string
  requiredPlan: string | null
  createdAt: string
}

const typeColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-red-100 text-red-700",
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
}

export default function SupportPage() {
  const router = useRouter()
  const [tab, setTab] = React.useState<"tickets" | "announcements" | "features">("tickets")
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [ticketStats, setTicketStats] = React.useState({ total: 0, openCount: 0, pendingCount: 0 })
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [features, setFeatures] = React.useState<Feature[]>([])
  const [loading, setLoading] = React.useState(true)
  const [respondingTicket, setRespondingTicket] = React.useState<Ticket | null>(null)
  const [responseText, setResponseText] = React.useState("")

  // New announcement form
  const [showNewAnnouncement, setShowNewAnnouncement] = React.useState(false)
  const [newAnnouncement, setNewAnnouncement] = React.useState({ title: "", message: "", type: "info", status: "draft" })

  // New feature form
  const [showNewFeature, setShowNewFeature] = React.useState(false)
  const [newFeature, setNewFeature] = React.useState({ name: "", displayName: "", description: "" })

  React.useEffect(() => { fetchAll() }, [tab])

  async function fetchAll() {
    setLoading(true)
    try {
      if (tab === "tickets") {
        const res = await fetch("/api/superadmin/support/tickets", { credentials: "include" })
        if (res.status === 401) { router.push("/superadmin/login"); return }
        const data = await res.json()
        setTickets(data.tickets || [])
        setTicketStats({ total: data.total || 0, openCount: data.openCount || 0, pendingCount: data.pendingCount || 0 })
      } else if (tab === "announcements") {
        const res = await fetch("/api/superadmin/support/announcements", { credentials: "include" })
        if (res.status === 401) { router.push("/superadmin/login"); return }
        const data = await res.json()
        setAnnouncements(data.announcements || [])
      } else {
        const res = await fetch("/api/superadmin/support/features", { credentials: "include" })
        if (res.status === 401) { router.push("/superadmin/login"); return }
        const data = await res.json()
        setFeatures(data.features || [])
      }
    } catch { /* */ } finally { setLoading(false) }
  }

  async function createAnnouncement() {
    await fetch("/api/superadmin/support/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newAnnouncement),
    })
    setShowNewAnnouncement(false)
    setNewAnnouncement({ title: "", message: "", type: "info", status: "draft" })
    fetchAll()
  }

  async function toggleAnnouncementStatus(id: string, current: string) {
    const newStatus = current === "published" ? "archived" : "published"
    await fetch(`/api/superadmin/support/announcements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    })
    fetchAll()
  }

  async function deleteAnnouncement(id: string) {
    await fetch(`/api/superadmin/support/announcements/${id}`, { method: "DELETE", credentials: "include" })
    fetchAll()
  }

  async function respondToTicket() {
    if (!respondingTicket || !responseText.trim()) return
    await fetch(`/api/superadmin/support/tickets/${respondingTicket.id}/respond`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ adminResponse: responseText, status: "pending" }),
    })
    setRespondingTicket(null)
    setResponseText("")
    fetchAll()
  }

  async function closeTicket(id: string) {
    await fetch(`/api/superadmin/support/tickets/${id}/close`, { method: "PUT", credentials: "include" })
    fetchAll()
  }

  async function createFeature() {
    await fetch("/api/superadmin/support/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newFeature),
    })
    setShowNewFeature(false)
    setNewFeature({ name: "", displayName: "", description: "" })
    fetchAll()
  }

  async function toggleFeature(id: string, current: string) {
    await fetch(`/api/superadmin/support/features/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ enabled: current === "true" ? "false" : "true" }),
    })
    fetchAll()
  }

  async function deleteFeature(id: string) {
    await fetch(`/api/superadmin/support/features/${id}`, { method: "DELETE", credentials: "include" })
    fetchAll()
  }

  return (
    <div>
      <PageHeader title="Support Tools" description="Manage tickets, announcements, and features" />

      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        <button onClick={() => setTab("tickets")} className={`px-4 py-1.5 rounded text-[13px] font-medium transition-all ${tab === "tickets" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
          Tickets {ticketStats.openCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{ticketStats.openCount}</span>}
        </button>
        <button onClick={() => setTab("announcements")} className={`px-4 py-1.5 rounded text-[13px] font-medium transition-all ${tab === "announcements" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
          Announcements
        </button>
        <button onClick={() => setTab("features")} className={`px-4 py-1.5 rounded text-[13px] font-medium transition-all ${tab === "features" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
          Feature Flags
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
        </div>
      ) : (
        <>
          {/* Tickets Tab */}
          {tab === "tickets" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatsCard title="Total Tickets" value={ticketStats.total} icon="support" iconColor="bg-blue-50 text-blue-600" />
                <StatsCard title="Open" value={ticketStats.openCount} icon="pending" iconColor="bg-orange-50 text-orange-600" />
                <StatsCard title="Pending Response" value={ticketStats.pendingCount} icon="schedule" iconColor="bg-yellow-50 text-yellow-600" />
              </div>

              {tickets.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <span className="material-symbols-outlined text-muted-foreground text-[48px]">support_agent</span>
                  <p className="text-[14px] text-muted-foreground mt-2">No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-[14px] font-medium text-foreground">{ticket.subject}</h4>
                          <p className="text-[12px] text-muted-foreground">{ticket.userName} ({ticket.userEmail})</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${priorityColors[ticket.priority] || priorityColors.normal}`}>
                            {ticket.priority}
                          </span>
                          <StatusBadge
                            label={ticket.status}
                            variant={ticket.status === "open" ? "error" : ticket.status === "pending" ? "warning" : "success"}
                          />
                        </div>
                      </div>
                      <p className="text-[13px] text-muted-foreground mb-3">{ticket.message}</p>

                      {ticket.adminResponse && (
                        <div className="bg-muted rounded-lg p-3 mb-3">
                          <p className="text-[11px] text-muted-foreground mb-1">Admin Response:</p>
                          <p className="text-[13px]">{ticket.adminResponse}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {ticket.status !== "closed" && (
                          <>
                            <button onClick={() => setRespondingTicket(ticket)} className="px-3 py-1 text-[12px] bg-superadmin-accent text-white rounded-lg hover:opacity-90">
                              Respond
                            </button>
                            <button onClick={() => closeTicket(ticket.id)} className="px-3 py-1 text-[12px] bg-muted text-foreground rounded-lg hover:bg-muted/80">
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Announcements Tab */}
          {tab === "announcements" && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowNewAnnouncement(true)} className="px-4 py-2 text-[13px] bg-superadmin-accent text-white rounded-lg hover:opacity-90">
                  New Announcement
                </button>
              </div>

              {showNewAnnouncement && (
                <div className="bg-card rounded-xl border border-border p-4 mb-4">
                  <h4 className="text-[14px] font-medium mb-3">New Announcement</h4>
                  <input value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 text-[13px] border border-border rounded-lg mb-2" />
                  <textarea value={newAnnouncement.message} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })} placeholder="Message" rows={3} className="w-full px-3 py-2 text-[13px] border border-border rounded-lg mb-2" />
                  <div className="flex gap-3 mb-3">
                    <select value={newAnnouncement.type} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })} className="px-3 py-2 text-[13px] border border-border rounded-lg">
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                    <select value={newAnnouncement.status} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, status: e.target.value })} className="px-3 py-2 text-[13px] border border-border rounded-lg">
                      <option value="draft">Draft</option>
                      <option value="published">Publish</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createAnnouncement} className="px-4 py-1.5 text-[13px] bg-superadmin-accent text-white rounded-lg">Save</button>
                    <button onClick={() => setShowNewAnnouncement(false)} className="px-4 py-1.5 text-[13px] bg-muted text-foreground rounded-lg">Cancel</button>
                  </div>
                </div>
              )}

              {announcements.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <span className="material-symbols-outlined text-muted-foreground text-[48px]">campaign</span>
                  <p className="text-[14px] text-muted-foreground mt-2">No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-[14px] font-medium text-foreground">{ann.title}</h4>
                          <p className="text-[12px] text-muted-foreground">{new Date(ann.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${typeColors[ann.type] || typeColors.info}`}>
                            {ann.type}
                          </span>
                          <StatusBadge
                            label={ann.status}
                            variant={ann.status === "published" ? "success" : ann.status === "draft" ? "neutral" : "warning"}
                          />
                        </div>
                      </div>
                      <p className="text-[13px] text-muted-foreground mb-3">{ann.message}</p>
                      <div className="flex gap-2">
                        <button onClick={() => toggleAnnouncementStatus(ann.id, ann.status)} className="px-3 py-1 text-[12px] bg-muted text-foreground rounded-lg hover:bg-muted/80">
                          {ann.status === "published" ? "Archive" : "Publish"}
                        </button>
                        <button onClick={() => deleteAnnouncement(ann.id)} className="px-3 py-1 text-[12px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Feature Flags Tab */}
          {tab === "features" && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowNewFeature(true)} className="px-4 py-2 text-[13px] bg-superadmin-accent text-white rounded-lg hover:opacity-90">
                  New Feature Flag
                </button>
              </div>

              {showNewFeature && (
                <div className="bg-card rounded-xl border border-border p-4 mb-4">
                  <h4 className="text-[14px] font-medium mb-3">New Feature Flag</h4>
                  <input value={newFeature.name} onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })} placeholder="Internal name (snake_case)" className="w-full px-3 py-2 text-[13px] border border-border rounded-lg mb-2" />
                  <input value={newFeature.displayName} onChange={(e) => setNewFeature({ ...newFeature, displayName: e.target.value })} placeholder="Display name" className="w-full px-3 py-2 text-[13px] border border-border rounded-lg mb-2" />
                  <input value={newFeature.description || ""} onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })} placeholder="Description (optional)" className="w-full px-3 py-2 text-[13px] border border-border rounded-lg mb-3" />
                  <div className="flex gap-2">
                    <button onClick={createFeature} className="px-4 py-1.5 text-[13px] bg-superadmin-accent text-white rounded-lg">Save</button>
                    <button onClick={() => setShowNewFeature(false)} className="px-4 py-1.5 text-[13px] bg-muted text-foreground rounded-lg">Cancel</button>
                  </div>
                </div>
              )}

              {features.length === 0 ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <span className="material-symbols-outlined text-muted-foreground text-[48px">flag</span>
                  <p className="text-[14px] text-muted-foreground mt-2">No feature flags yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {features.map((feat) => (
                    <div key={feat.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-[14px] font-medium text-foreground">{feat.displayName}</h4>
                        <p className="text-[12px] text-muted-foreground">{feat.description || feat.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleFeature(feat.id, feat.enabled)} className={`w-10 h-5 rounded-full transition-all ${feat.enabled === "true" ? "bg-green-500" : "bg-gray-300"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${feat.enabled === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                        <button onClick={() => deleteFeature(feat.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Respond Modal */}
      {respondingTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRespondingTicket(null)}>
          <div className="bg-white rounded-xl p-6 w-[480px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-1">Respond to Ticket</h3>
            <p className="text-[13px] text-muted-foreground mb-4">{respondingTicket.subject}</p>
            <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type your response..." rows={5} className="w-full px-3 py-2 text-[13px] border border-border rounded-lg mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRespondingTicket(null)} className="px-4 py-1.5 text-[13px] bg-muted text-foreground rounded-lg">Cancel</button>
              <button onClick={respondToTicket} className="px-4 py-1.5 text-[13px] bg-superadmin-accent text-white rounded-lg">Send Response</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
