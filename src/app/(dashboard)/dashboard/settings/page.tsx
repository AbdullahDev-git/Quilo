"use client"

import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import { toast } from "@/components/toast"

const tabs = ["Profile", "Preferences", "Integrations", "Spend Caps", "Billing", "Team Members"]

interface Integration {
  id: string
  name: string
  type: string
  connected: boolean
  config: Record<string, any> | null
}

interface SpendCap {
  storeId: string
  storeName: string
  limit: string
  used: string
  percentage: number
}

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  invitedAt: string
  joinedAt: string | null
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = React.useState("Profile")
  const [emailNotif, setEmailNotif] = React.useState(true)
  const [errorReports, setErrorReports] = React.useState(true)
  const [integrations, setIntegrations] = React.useState<Integration[]>([
    { id: "1", name: "Shopify", type: "shopify", connected: true, config: null },
    { id: "2", name: "Stripe", type: "stripe", connected: false, config: null },
    { id: "3", name: "Slack", type: "slack", connected: false, config: null },
  ])
  const [spendCaps, setSpendCaps] = React.useState<SpendCap[]>([])
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
  const [loading, setLoading] = React.useState<Record<string, boolean>>({})
  const [profile, setProfile] = React.useState({ name: "", email: "", phone: "", timezone: "" })
  const [saving, setSaving] = React.useState<Record<string, boolean>>({})

  const fetchIntegrations = async () => {
    setLoading(prev => ({ ...prev, integrations: true }))
    try {
      const res = await fetch("/api/integrations")
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data)
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err)
    } finally {
      setLoading(prev => ({ ...prev, integrations: false }))
    }
  }

  const fetchSpendCaps = async () => {
    setLoading(prev => ({ ...prev, spendCaps: true }))
    try {
      const res = await fetch("/api/spend-caps")
      if (res.ok) {
        const data = await res.json()
        setSpendCaps(data)
      }
    } catch (err) {
      console.error("Failed to fetch spend caps:", err)
    } finally {
      setLoading(prev => ({ ...prev, spendCaps: false }))
    }
  }

  const fetchTeamMembers = async () => {
    setLoading(prev => ({ ...prev, teamMembers: true }))
    try {
      const res = await fetch("/api/team-members")
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data)
      }
    } catch (err) {
      console.error("Failed to fetch team members:", err)
    } finally {
      setLoading(prev => ({ ...prev, teamMembers: false }))
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/users/me")
      if (res.ok) {
        const data = await res.json()
        setProfile({ name: data.user?.name || "", email: data.user?.email || "", phone: "", timezone: "" })
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err)
    }
  }

  React.useEffect(() => {
    fetchProfile()
    fetchIntegrations()
    fetchSpendCaps()
    fetchTeamMembers()
  }, [])

  const handleIntegrationConnect = async (type: string) => {
    setIntegrations(prev => prev.map(i => i.type === type ? { ...i, connected: true } : i))
    toast(`${type.charAt(0).toUpperCase() + type.slice(1)} connected successfully`, "success")
    try {
      await fetch(`/api/integrations/${type}/connect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: {} }) })
    } catch {}
  }

  const handleIntegrationDisconnect = async (type: string) => {
    setIntegrations(prev => prev.map(i => i.type === type ? { ...i, connected: false } : i))
    toast(`${type.charAt(0).toUpperCase() + type.slice(1)} disconnected`, "info")
    try {
      await fetch(`/api/integrations/${type}`, { method: "DELETE" })
    } catch {}
  }

  const handleSpendCapUpdate = async (storeId: string, limit: number) => {
    setSaving(prev => ({ ...prev, [storeId]: true }))
    try {
      const res = await fetch(`/api/spend-caps/${storeId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit }) })
      if (res.ok) fetchSpendCaps()
    } catch (err) {
      console.error("Failed to update spend cap:", err)
    } finally {
      setSaving(prev => ({ ...prev, [storeId]: false }))
    }
  }

  const handleInviteMember = async (email: string, role: string) => {
    setSaving(prev => ({ ...prev, invite: true }))
    try {
      const res = await fetch("/api/team-members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) })
      if (res.ok) fetchTeamMembers()
    } catch (err) {
      console.error("Failed to invite member:", err)
    } finally {
      setSaving(prev => ({ ...prev, invite: false }))
    }
  }

  const handleUpdateMemberRole = async (id: string, role: string) => {
    setSaving(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/team-members/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) })
      if (res.ok) fetchTeamMembers()
    } catch (err) {
      console.error("Failed to update member:", err)
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Remove this team member?")) return
    setSaving(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/team-members/${id}`, { method: "DELETE" })
      if (res.ok) fetchTeamMembers()
    } catch (err) {
      console.error("Failed to remove member:", err)
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleSaveProfile = async () => {
    setSaving(prev => ({ ...prev, profile: true }))
    toast("Profile saved successfully", "success")
    setTimeout(() => setSaving(prev => ({ ...prev, profile: false })), 500)
    try {
      await fetch("/api/users/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) })
    } catch {}
  }

  const handleToggleNotif = (label: string, value: boolean, setter: (v: boolean) => void) => {
    setter(!value)
    toast(`${label} ${!value ? "enabled" : "disabled"}`, "success")
  }

  const toggleSwitch = (val: boolean, set: (v: boolean) => void) => (
    <button onClick={() => set(!val)} className={`relative w-11 h-6 rounded-full transition-colors ${val ? "bg-primary" : "bg-muted"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow-sm transition-transform ${val ? "translate-x-5" : ""}`} />
    </button>
  )

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Settings</h2>
        <p className="text-body-md text-on-surface-variant">Manage your account, integrations, and billing.</p>
      </div>

      <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl w-fit mb-8 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all ${tab === t ? "bg-card text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>{t}</button>
        ))}
      </div>

      <div className="space-y-6">
        {/* Profile */}
        {tab === "Profile" && (
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-fixed rounded-lg">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <h3 className="font-semibold text-foreground">Profile</h3>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">{profile.name?.charAt(0).toUpperCase() || "A"}</div>
              <div>
                <p className="font-semibold text-foreground">{profile.name || "User"}</p>
                <p className="text-body-sm text-muted-foreground">{profile.email}</p>
                <button className="text-body-sm font-medium text-primary mt-1">Change avatar</button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Full Name</label>
                <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30" />
              </div>
              <div>
                <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Email</label>
                <input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30" />
              </div>
              <div>
                <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Phone</label>
                <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30" placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Timezone</label>
                <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30">
                  <option value="">Select timezone</option>
                  <option value="America/New_York">Eastern Time (UTC-5)</option>
                  <option value="America/Chicago">Central Time (UTC-6)</option>
                  <option value="America/Denver">Mountain Time (UTC-7)</option>
                  <option value="America/Los_Angeles">Pacific Time (UTC-8)</option>
                  <option value="Europe/London">London (UTC+0)</option>
                  <option value="Europe/Paris">Paris (UTC+1)</option>
                  <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                </select>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={saving.profile} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50">
              {saving.profile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* Preferences */}
        {tab === "Preferences" && (
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#62fae3]/30 dark:bg-[#62fae3]/15 rounded-lg">
                <span className="material-symbols-outlined text-[#006b5f] dark:text-[#62fae3]">tune</span>
              </div>
              <h3 className="font-semibold text-foreground">Preferences</h3>
            </div>
            <div className="space-y-4">
              {([
                { label: "Dark Mode", desc: "Toggle dark mode theme", value: theme === "dark", isTheme: true },
                { label: "Email Notifications", desc: "Receive email alerts for rule triggers", value: emailNotif, isTheme: false },
                { label: "Error Reports", desc: "Send error reports to Sentry", value: errorReports, isTheme: false },
              ] as const).map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-body-md font-medium text-foreground">{item.label}</p>
                    <p className="text-body-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (item.isTheme) {
                        toggleTheme()
                      } else if (item.label === "Email Notifications") {
                        handleToggleNotif(item.label, emailNotif, setEmailNotif)
                      } else {
                        handleToggleNotif(item.label, errorReports, setErrorReports)
                      }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow-sm transition-transform ${item.value ? "translate-x-5" : ""}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrations */}
        {tab === "Integrations" && (
          <div className="grid gap-4">
            {integrations.length === 0 && loading.integrations ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              integrations.map(int => (
                <div key={int.type} className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[24px]">{int.type === "shopify" ? "storefront" : int.type === "stripe" ? "credit_card" : int.type === "slack" ? "forum" : int.type === "shipstation" ? "local_shipping" : "support_agent"}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{int.name}</p>
                      <p className="text-body-sm text-muted-foreground">{int.type === "shopify" ? "Sync orders and products" : int.type === "stripe" ? "Process refunds and payments" : int.type === "slack" ? "Return alerts to your channel" : int.type === "shipstation" ? "Auto-generate return labels" : "Sync tickets with return requests"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${int.connected ? "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]" : "bg-surface-container-low text-muted-foreground"}`}>
                      {int.connected ? "Connected" : "Not connected"}
                    </span>
                    <button
                      onClick={int.connected ? () => handleIntegrationDisconnect(int.type) : () => handleIntegrationConnect(int.type)}
                      disabled={saving[int.type]}
                      className={`px-4 py-2 rounded-lg text-body-sm font-bold shadow-sm transition-all ${int.connected ? "border border-border hover:bg-surface-container-low" : "bg-primary text-primary-foreground hover:opacity-90"} disabled:opacity-50`}
                    >
                      {saving[int.type] ? "..." : int.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Spend Caps */}
        {tab === "Spend Caps" && (
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#ffdbcc] dark:bg-[#ffdbcc]/20 rounded-lg">
                <span className="material-symbols-outlined text-[#752c00] dark:text-[#ffdbcc]">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Spend Caps</h3>
                <p className="text-body-sm text-muted-foreground">Set monthly auto-refund limits per store.</p>
              </div>
            </div>
            {spendCaps.length === 0 && loading.spendCaps ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : spendCaps.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <span className="material-symbols-outlined text-[48px]">account_balance_wallet</span>
                <p className="text-body-md mt-2">No stores connected</p>
                <p className="text-body-sm mt-1">Connect a store to set spend caps</p>
              </div>
            ) : (
              <div className="space-y-4">
                {spendCaps.map(s => (
                  <div key={s.storeId} className="border border-border/50 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <p className="font-medium text-foreground text-body-md">{s.storeName}</p>
                      <p className="text-body-sm text-muted-foreground">{parseFloat(s.used).toFixed(2)} / {parseFloat(s.limit).toFixed(2)}</p>
                    </div>
                    <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${s.percentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-body-sm text-muted-foreground">{s.percentage}% of monthly cap used</span>
                      <button
                        onClick={() => {
                          const newLimit = prompt(`Enter new monthly limit for ${s.storeName}:`, s.limit)
                          if (newLimit) handleSpendCapUpdate(s.storeId, parseFloat(newLimit))
                        }}
                        disabled={saving[s.storeId]}
                        className="text-body-sm font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {saving[s.storeId] ? "Saving..." : "Edit cap"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Billing */}
        {tab === "Billing" && (
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-fixed rounded-lg">
                <span className="material-symbols-outlined text-primary">credit_card</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Billing & Plan</h3>
                <p className="text-body-sm text-muted-foreground">You are on the Pro plan — $49/mo.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              {[{ plan: "Starter", price: "$19", users: "2 users", feature: "500 returns/mo", label: "", current: false }, { plan: "Pro", price: "$49", users: "10 users", feature: "Unlimited returns", label: "Current", current: true }, { plan: "Enterprise", price: "$149", users: "Unlimited", feature: "Custom rules", label: "", current: false }].map(p => (
                <div key={p.plan} className={`border rounded-xl p-4 text-center ${p.current ? "border-[#1f108e] dark:border-[#818cf8] bg-primary-fixed/30" : "border-border"}`}>
                  <p className="font-semibold text-foreground">{p.plan}</p>
                  <p className="text-[28px] font-bold text-primary">{p.price}<span className="text-body-md text-muted-foreground">/mo</span></p>
                  <p className="text-body-sm text-muted-foreground">{p.users}</p>
                  <p className="text-body-sm text-muted-foreground mb-3">{p.feature}</p>
                  {p.current ? <span className="inline-block px-3 py-1 text-[11px] font-bold bg-primary text-primary-foreground rounded-full">Current</span> : <button className="text-body-sm font-medium text-primary">Upgrade</button>}
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 pt-4">
              <p className="font-medium text-foreground mb-2">Payment Method</p>
              <div className="flex items-center justify-between bg-surface-container-low rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">credit_card</span>
                  <span className="text-body-md">Visa ending in 4242</span>
                </div>
                <button className="text-body-sm font-medium text-primary">Change</button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-body-sm text-muted-foreground">
              <span>Next billing date: Aug 18, 2026</span>
              <button className="font-medium text-destructive">Cancel Subscription</button>
            </div>
          </div>
        )}

        {/* Team Members */}
        {tab === "Team Members" && (
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#62fae3]/30 dark:bg-[#62fae3]/15 rounded-lg">
                  <span className="material-symbols-outlined text-[#006b5f] dark:text-[#62fae3]">group</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Team Members</h3>
                  <p className="text-body-sm text-muted-foreground">Manage who has access to your Quilo workspace.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const email = prompt("Enter email to invite:")
                  const role = prompt("Enter role (admin/member/viewer):", "member")
                  if (email && role) handleInviteMember(email, role)
                }}
                disabled={saving.invite}
                className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-body-sm font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Invite
              </button>
            </div>
            {teamMembers.length === 0 && loading.teamMembers ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <span className="material-symbols-outlined text-[48px]">group</span>
                <p className="text-body-md mt-2">No team members yet</p>
                <p className="text-body-sm mt-1">Invite your first team member above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-white`}>{m.name?.charAt(0).toUpperCase() || m.email.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-medium text-foreground text-body-md">{m.name || "Pending"}</p>
                        <p className="text-body-sm text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={m.role}
                        onChange={e => handleUpdateMemberRole(m.id, e.target.value)}
                        disabled={saving[m.id]}
                        className="text-[12px] bg-surface-container-low border border-border rounded-lg px-3 py-1.5 outline-none text-foreground"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={saving[m.id]}
                        className="p-1.5 rounded-lg hover:bg-[#ffdad6] dark:hover:bg-[#93000a]/30 transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[20px] text-destructive">remove_circle</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}