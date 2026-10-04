"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"

interface ConfigItem {
  id: string
  key: string
  value: string | null
  displayValue: string
  category: string
  label: string
  type: string
  description: string | null
}

const categoryLabels: Record<string, string> = {
  platform: "Platform Settings",
  security: "Security",
  smtp: "Email (SMTP)",
  api_keys: "API Keys",
  plans: "Subscription Plans",
}

const categoryIcons: Record<string, string> = {
  platform: "settings",
  security: "shield",
  smtp: "email",
  api_keys: "key",
  plans: "payments",
}

const demoConfigs: ConfigItem[] = [
  { id: "1", key: "platform_name", value: "Quilo", displayValue: "Quilo", category: "platform", label: "Platform Name", type: "text", description: "Name of the platform" },
  { id: "2", key: "platform_url", value: "https://quilo.pk", displayValue: "https://quilo.pk", category: "platform", label: "Platform URL", type: "text", description: "Main platform URL" },
  { id: "3", key: "support_email", value: "support@quilo.pk", displayValue: "support@quilo.pk", category: "platform", label: "Support Email", type: "text", description: "Support contact email" },
  { id: "4", key: "maintenance_mode", value: "false", displayValue: "Disabled", category: "platform", label: "Maintenance Mode", type: "boolean", description: "Enable maintenance mode" },
  { id: "5", key: "session_timeout", value: "24", displayValue: "24 hours", category: "security", label: "Session Timeout", type: "number", description: "Session timeout in hours" },
  { id: "6", key: "max_login_attempts", value: "5", displayValue: "5 attempts", category: "security", label: "Max Login Attempts", type: "number", description: "Maximum login attempts before lockout" },
  { id: "7", key: "require_2fa", value: "true", displayValue: "Required", category: "security", label: "Require 2FA", type: "boolean", description: "Require two-factor authentication for admins" },
  { id: "8", key: "smtp_host", value: "smtp.gmail.com", displayValue: "smtp.gmail.com", category: "smtp", label: "SMTP Host", type: "text", description: "SMTP server host" },
  { id: "9", key: "smtp_port", value: "587", displayValue: "587", category: "smtp", label: "SMTP Port", type: "number", description: "SMTP server port" },
  { id: "10", key: "smtp_from", value: "noreply@quilo.pk", displayValue: "noreply@quilo.pk", category: "smtp", label: "From Email", type: "text", description: "Sender email address" },
  { id: "11", key: "lemonsqueezy_api_key", value: null, displayValue: "••••••••", category: "api_keys", label: "Lemon Squeezy API Key", type: "password", description: "Lemon Squeezy API key for billing" },
  { id: "12", key: "gemini_api_key", value: null, displayValue: "••••••••", category: "api_keys", label: "Gemini API Key", type: "password", description: "Google Gemini API key for AI features" },
  { id: "13", key: "free_plan_seats", value: "1", displayValue: "1 seat", category: "plans", label: "Free Plan Seats", type: "number", description: "Seats included in Free plan" },
  { id: "14", key: "starter_plan_seats", value: "3", displayValue: "3 seats", category: "plans", label: "Starter Plan Seats", type: "number", description: "Seats included in Starter plan" },
  { id: "15", key: "pro_plan_seats", value: "5", displayValue: "5 seats", category: "plans", label: "Pro Plan Seats", type: "number", description: "Seats included in Pro plan" },
  { id: "16", key: "enterprise_plan_seats", value: "999", displayValue: "999 seats", category: "plans", label: "Enterprise Plan Seats", type: "number", description: "Seats included in Enterprise plan" },
]

export default function ConfigurationPage() {
  const router = useRouter()
  const [configs, setConfigs] = React.useState<ConfigItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [editedValues, setEditedValues] = React.useState<Record<string, string>>({})
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({
    platform: true,
    security: false,
    smtp: false,
    api_keys: false,
    plans: false,
  })

  React.useEffect(() => { fetchConfig() }, [])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch("/api/superadmin/config", { credentials: "include" })
      // Demo mode: use demo data on 401
      if (res.status === 401) {
        setConfigs(demoConfigs)
        return
      }
      const data = await res.json()
      // Use demo data if API returns empty
      if (!data || !data.configs || data.configs.length === 0) {
        setConfigs(demoConfigs)
      } else {
        setConfigs(data.configs || [])
      }
    } catch {
      // Use demo data on error
      setConfigs(demoConfigs)
    } finally { setLoading(false) }
  }

  function handleChange(key: string, value: string) {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates = Object.entries(editedValues).map(([key, value]) => ({ key, value }))
      await fetch("/api/superadmin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates }),
      })
      setEditedValues({})
      fetchConfig()
    } catch { /* */ } finally { setSaving(false) }
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  const grouped = configs.reduce<Record<string, ConfigItem[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  const hasChanges = Object.keys(editedValues).length > 0

  return (
    <div>
      <PageHeader
        title="Configuration"
        description="Platform settings and API keys"
        action={
          hasChanges ? (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-[13px] bg-superadmin-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-superadmin-accent">
                    {categoryIcons[category] || "settings"}
                  </span>
                  <h3 className="text-[14px] font-medium text-foreground">{categoryLabels[category] || category}</h3>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{items.length}</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-muted-foreground transition-transform" style={{ transform: expandedCategories[category] ? "rotate(180deg)" : "" }}>
                  expand_more
                </span>
              </button>

              {expandedCategories[category] && (
                <div className="border-t border-border p-4 space-y-4">
                  {items.map((config) => (
                    <div key={config.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                      <div>
                        <label className="text-[13px] font-medium text-foreground">{config.label}</label>
                        <p className="text-[11px] text-muted-foreground">{config.description}</p>
                      </div>
                      <div className="md:col-span-2">
                        {config.type === "boolean" ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const current = editedValues[config.key] !== undefined ? editedValues[config.key] : config.value
                                handleChange(config.key, current === "true" ? "false" : "true")
                              }}
                              className={`w-10 h-5 rounded-full transition-all ${
                                (editedValues[config.key] ?? config.value) === "true" ? "bg-green-500" : "bg-gray-300"
                              }`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                                (editedValues[config.key] ?? config.value) === "true" ? "translate-x-5" : "translate-x-0.5"
                              }`} />
                            </button>
                            <span className="text-[12px] text-muted-foreground">
                              {(editedValues[config.key] ?? config.value) === "true" ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        ) : config.type === "password" ? (
                          <input
                            type="password"
                            value={editedValues[config.key] ?? config.displayValue ?? ""}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            placeholder={config.value ? "••••••••" : "Not set"}
                            className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20"
                          />
                        ) : config.type === "number" ? (
                          <input
                            type="number"
                            value={editedValues[config.key] ?? config.value ?? ""}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20"
                          />
                        ) : (
                          <input
                            type="text"
                            value={editedValues[config.key] ?? config.value ?? ""}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
