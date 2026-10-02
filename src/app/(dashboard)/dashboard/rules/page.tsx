"use client"

import * as React from "react"

interface Condition {
  field: string
  operator: string
  value: any
}

interface RuleAction {
  type: string
  config: Record<string, any>
}

interface Rule {
  id: string
  name: string
  conditions: Condition[]
  actions: RuleAction[]
  logic: "all" | "any"
  status: string
  triggerCount: number
  storeId?: string
  createdAt?: string
}

interface Template {
  name: string
  desc: string
  icon: string
  iconBg: string
  iconColor: string
  preset: { conditions: Condition[]; actions: RuleAction[] }
}

const templates: Template[] = [
  {
    name: "High-Volume Template",
    desc: "Auto-approve returns for frequently returned items under $50",
    icon: "rocket_launch",
    iconBg: "bg-primary-fixed",
    iconColor: "text-primary",
    preset: {
      conditions: [{ field: "amount", operator: "less_than", value: "50" }, { field: "return_count_30d", operator: "less_than", value: "3" }],
      actions: [{ type: "Auto-refund", config: {} }],
    },
  },
  {
    name: "High-Value Template",
    desc: "Flag orders over $500 for manual review before refund",
    icon: "workspace_premium",
    iconBg: "bg-[#ffdbcc] dark:bg-[#ffdbcc]/20",
    iconColor: "text-[#752c00] dark:text-[#ffdbcc]",
    preset: {
      conditions: [{ field: "amount", operator: "greater_than", value: "500" }, { field: "customer_tier", operator: "equals", value: "standard" }],
      actions: [{ type: "Flag for manual review", config: {} }],
    },
  },
  {
    name: "Free-Shipping Protector",
    desc: "Deduct original shipping cost from refund if item is not defective",
    icon: "local_shipping",
    iconBg: "bg-[#62fae3]/30 dark:bg-[#62fae3]/15",
    iconColor: "text-secondary",
    preset: {
      conditions: [{ field: "reason", operator: "not_contains", value: "defective" }, { field: "amount", operator: "greater_than", value: "0" }],
      actions: [{ type: "Auto-refund", config: {} }],
    },
  },
  {
    name: "Exchange-First Template",
    desc: "Offer exchange with 10% discount before processing refunds",
    icon: "swap_horiz",
    iconBg: "bg-muted",
    iconColor: "text-primary",
    preset: {
      conditions: [{ field: "reason", operator: "contains", value: "size" }, { field: "in_stock", operator: "equals", value: "true" }],
      actions: [{ type: "Offer exchange", config: {} }],
    },
  },
]

const fields = ["reason", "order_age_days", "in_stock", "return_count_30d", "customer_tier", "amount", "has_receipt", "item_count", "order_total", "customer_email", "fulfillment_status", "financial_status", "tags", "shipping_country", "billing_country"]
const operators = ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "contains", "not_contains", "starts_with", "ends_with", "in", "not_in", "is_set", "is_not_set"]
const actionTypes = ["Auto-refund", "Offer exchange", "Flag for manual review", "Auto-deny return", "Instant refund", "Send email notification", "Fulfill order", "Create discount", "Update product", "Send webhook", "Update order tags"]

const iconMap: Record<string, string> = {
  "Auto-refund": "assignment_return",
  "Offer exchange": "swap_horiz",
  "Flag for manual review": "flag",
  "Auto-deny return": "block",
  "Instant refund": "diamond",
  "Send email notification": "mail",
  "Fulfill order": "check_circle",
  "Create discount": "local_offer",
  "Update product": "edit",
  "Send webhook": "webhook",
  "Update order tags": "tag",
}

const emptyRule = {
  name: "",
  conditions: [{ field: "reason", operator: "equals", value: "" }, { field: "reason", operator: "equals", value: "" }],
  actions: [{ type: "Auto-refund", config: {} }],
  logic: "all" as const,
  status: "active",
}

export default function RulesPage() {
  const [rules, setRules] = React.useState<Rule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"active" | "paused" | "templates">("active")
  const [showCreate, setShowCreate] = React.useState(false)
  const [createForm, setCreateForm] = React.useState<typeof emptyRule>({ ...emptyRule, conditions: emptyRule.conditions.map(c => ({ ...c })) })
  const [creating, setCreating] = React.useState(false)
  const [aiPrompt, setAiPrompt] = React.useState("")
  const [aiLoading, setAiLoading] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<Rule | null>(null)
  const [editForm, setEditForm] = React.useState<{ name: string; conditions: Condition[]; actions: RuleAction[]; logic: "all" | "any" }>({ name: "", conditions: [], actions: [], logic: "all" })
  const [deleteConfirm, setDeleteConfirm] = React.useState<Rule | null>(null)

  React.useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRules(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const saveRule = async (id: string, updates: Partial<Rule>) => {
    const res = await fetch(`/api/rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const updated = await res.json()
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)))
    }
  }

  const deleteRule = async (id: string) => {
    const res = await fetch(`/api/rules/${id}`, { method: "DELETE" })
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id))
    setDeleteConfirm(null)
  }

  const openEdit = (rule: Rule) => {
    setEditingRule(rule)
    setEditForm({
      name: rule.name,
      conditions: rule.conditions.map((c) => ({ ...c })),
      actions: rule.actions.map((a) => ({ ...a })),
      logic: rule.logic,
    })
  }

  const saveEdit = async () => {
    if (!editingRule) return
    const res = await fetch(`/api/rules/${editingRule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        conditions: editForm.conditions,
        actions: editForm.actions,
        logic: editForm.logic,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? { ...r, ...updated } : r)))
    }
    setEditingRule(null)
  }

  const updateEditCondition = (index: number, field: string, value: any) => {
    setEditForm((f) => {
      const conditions = [...f.conditions]
      conditions[index] = { ...conditions[index], [field]: value }
      return { ...f, conditions }
    })
  }

  const updateEditAction = (value: string) => {
    setEditForm((f) => ({ ...f, actions: [{ type: value, config: {} }] }))
  }

  const toggleStatus = (rule: Rule) => {
    const nextStatus = rule.status === "active" ? "paused" : "active"
    saveRule(rule.id, { status: nextStatus })
  }

  const updateField = (rule: Rule, field: string, value: any) => {
    const updated = { ...rule, [field]: value }
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)))
  }

  const updateCondition = (rule: Rule, index: number, field: string, value: any) => {
    const conditions = [...rule.conditions]
    conditions[index] = { ...conditions[index], [field]: value }
    updateField(rule, "conditions", conditions)
  }

  const updateAction = (rule: Rule, value: string) => {
    const actions = [{ type: value, config: {} }]
    updateField(rule, "actions", actions)
  }

  const blurRule = (rule: Rule) => {
    saveRule(rule.id, {
      name: rule.name,
      conditions: rule.conditions,
      actions: rule.actions,
      status: rule.status,
    })
  }

  const createRule = async (formData: typeof emptyRule) => {
    setCreating(true)
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          conditions: formData.conditions,
          actions: formData.actions,
          logic: "all",
          status: "active",
        }),
      })
      if (res.ok) {
        const rule = await res.json()
        setRules((prev) => [rule, ...prev])
        setShowCreate(false)
        setCreateForm({ ...emptyRule, conditions: emptyRule.conditions.map(c => ({ ...c })) })
      }
    } finally {
      setCreating(false)
    }
  }

  const useTemplate = async (t: Template) => {
    setCreating(true)
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t.name,
          conditions: t.preset.conditions,
          actions: t.preset.actions,
          logic: "all",
          status: "active",
        }),
      })
      if (res.ok) {
        const rule = await res.json()
        setRules((prev) => [rule, ...prev])
        setActiveTab("active")
      }
    } finally {
      setCreating(false)
    }
  }

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/generate-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      if (res.ok) {
        const rule = await res.json()
        setCreateForm((f) => ({
          ...f,
          name: rule.name || f.name,
          conditions: rule.conditions?.length > 0 ? rule.conditions : f.conditions,
          actions: rule.actions?.length > 0 ? rule.actions : f.actions,
          logic: rule.logic || f.logic,
        }))
        setAiPrompt("")
      }
    } catch {
      alert("AI generation failed. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  const filteredRules = activeTab === "templates" ? [] : rules.filter((r) => activeTab === "active" ? r.status === "active" : r.status !== "active")

  const getIcon = (rule: Rule) => {
    if (rule.actions.length > 0) return iconMap[rule.actions[0].type] || "rule"
    return "rule"
  }

  const getStore = (rule: Rule) => rule.storeId || "All Stores"

  const getConds = (rule: Rule) => {
    while (rule.conditions.length < 2) rule.conditions.push({ field: "reason", operator: "equals", value: "" })
    return rule.conditions
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
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Rules Engine</h2>
          <p className="text-body-md text-on-surface-variant">Create and manage automated return workflow rules.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Rule
        </button>
      </div>

      <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl w-fit mb-8">
        <button onClick={() => setActiveTab("active")} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === "active" ? "bg-card text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>Active ({rules.filter((r) => r.status === "active").length})</button>
        <button onClick={() => setActiveTab("paused")} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === "paused" ? "bg-card text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>Paused ({rules.filter((r) => r.status !== "active").length})</button>
        <button onClick={() => setActiveTab("templates")} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === "templates" ? "bg-card text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}>Templates</button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-semibold text-foreground">Create Rule</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="bg-gradient-to-r from-[#ede7ff] to-[#e8f0fe] dark:from-[#1a1040] dark:to-[#0d1b3e] rounded-lg p-4 border border-[#c4b5fd]/30 dark:border-[#818cf8]/20 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px] text-[#6d28d9] dark:text-[#a78bfa]">auto_awesome</span>
                <span className="text-[13px] font-semibold text-[#6d28d9] dark:text-[#a78bfa]">Generate with AI</span>
              </div>
              <p className="text-[11px] text-[#6d28d9]/70 dark:text-[#a78bfa]/70 mb-3">Describe your rule in plain English and let AI build it for you.</p>
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateWithAI()}
                  className="flex-1 px-3 py-2 bg-card border border-[#c4b5fd]/30 dark:border-[#818cf8]/20 rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20"
                  placeholder="e.g. Auto-refund orders under $30 from US customers"
                  disabled={aiLoading}
                />
                <button
                  onClick={generateWithAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 bg-[#6d28d9] dark:bg-[#7c3aed] text-white rounded-lg text-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  ) : (
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  )}
                  {aiLoading ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Rule Name</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                placeholder="My Rule"
              />
            </div>
            {[0, 1].map((idx) => (
              <div key={idx} className="bg-[#f8f9ff] dark:bg-surface-container-high rounded-lg p-4 border border-border/50 mb-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{idx === 0 ? "IF" : "AND"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={createForm.conditions[idx].field} onChange={(e) => setCreateForm((f) => { const c = [...f.conditions]; c[idx] = { ...c[idx], field: e.target.value }; return { ...f, conditions: c } })} className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]">
                    {fields.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                  </select>
                  <select value={createForm.conditions[idx].operator} onChange={(e) => setCreateForm((f) => { const c = [...f.conditions]; c[idx] = { ...c[idx], operator: e.target.value }; return { ...f, conditions: c } })} className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]">
                    {operators.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                  </select>
                  <input value={createForm.conditions[idx].value} onChange={(e) => setCreateForm((f) => { const c = [...f.conditions]; c[idx] = { ...c[idx], value: e.target.value }; return { ...f, conditions: c } })} className="text-[12px] bg-card border border-border rounded px-2 py-1.5 w-20 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]" />
                </div>
              </div>
            ))}
            <div className="bg-[#f8f9ff] dark:bg-surface-container-high rounded-lg p-4 border border-border/50 mb-6">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">THEN</p>
              <select value={createForm.actions[0]?.type || ""} onChange={(e) => setCreateForm((f) => ({ ...f, actions: [{ type: e.target.value, config: {} }] }))} className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8] flex-1 w-full">
                {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-body-md font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer">Cancel</button>
              <button onClick={() => createRule(createForm)} disabled={creating || !createForm.name.trim()} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
                {creating ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "templates" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {templates.map((t) => (
            <button key={t.name} onClick={() => useTemplate(t)} disabled={creating} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 text-left group cursor-pointer">
              <div className={`w-10 h-10 rounded-lg ${t.iconBg} ${t.iconColor} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined">{t.icon}</span>
              </div>
              <p className="font-semibold text-foreground text-[14px] mb-1">{t.name}</p>
              <p className="text-body-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-[14px]">add</span>
                Use Template
              </span>
            </button>
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-[48px]">rule</span>
          <p className="text-body-md mt-2">No {activeTab} rules yet.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all inline-flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRules.map((rule) => {
            const conds = getConds(rule)
            return (
              <div key={rule.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">{getIcon(rule)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          className="font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-[#1f108e] dark:focus:border-[#818cf8] outline-none px-1 py-0.5 text-[14px]"
                          value={rule.name}
                          onChange={(e) => updateField(rule, "name", e.target.value)}
                          onBlur={() => blurRule(rule)}
                        />
                        <span className={`px-3 py-0.5 text-[11px] font-bold uppercase tracking-tight rounded-full ${rule.status === "active" ? "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]" : "bg-[#ffdbcc] text-[#7a3003] dark:bg-[#ffdbcc]/20 dark:text-[#ffdbcc]"}`}>
                          {rule.status === "active" ? "Active" : "Paused"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(rule)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-all cursor-pointer" title="Edit rule">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteConfirm(rule)} className="p-2 text-destructive hover:bg-[#ffdad6] dark:hover:bg-[#93000a]/30 rounded-lg transition-all cursor-pointer" title="Delete rule">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[0, 1].map((idx) => (
                    <div key={idx} className="bg-[#f8f9ff] dark:bg-surface-container-high rounded-lg p-4 border border-border/50">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{idx === 0 ? "IF" : "AND"}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={conds[idx].field}
                          onChange={(e) => updateCondition(rule, idx, "field", e.target.value)}
                          className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]"
                        >
                          {fields.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                        </select>
                        <select
                          value={conds[idx].operator}
                          onChange={(e) => updateCondition(rule, idx, "operator", e.target.value)}
                          className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]"
                        >
                          {operators.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                        </select>
                        <input
                          value={conds[idx].value}
                          onChange={(e) => updateCondition(rule, idx, "value", e.target.value)}
                          onBlur={() => blurRule(rule)}
                          className="text-[12px] bg-card border border-border rounded px-2 py-1.5 w-20 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="bg-[#f8f9ff] dark:bg-surface-container-high rounded-lg p-4 border border-border/50">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">THEN</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={rule.actions[0]?.type || ""}
                        onChange={(e) => { updateAction(rule, e.target.value); blurRule(rule) }}
                        className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8] flex-1"
                      >
                        {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-body-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        onClick={() => toggleStatus(rule)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${rule.status === "active" ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full shadow-sm transition-transform ${rule.status === "active" ? "translate-x-4" : ""}`} />
                      </button>
                      <span className="text-[11px]">{rule.status === "active" ? "Enabled" : "Disabled"}</span>
                    </label>
                    <span>{getStore(rule)}</span>
                  </div>
                  <span>{rule.triggerCount} triggers</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingRule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingRule(null)}>
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-semibold text-foreground">Edit Rule</h3>
              <button onClick={() => setEditingRule(null)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mb-4">
              <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Rule Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                placeholder="Rule name"
              />
            </div>
            {[0, 1].map((idx) => (
              <div key={idx} className="bg-[#f8f9ff] dark:bg-surface-container-high rounded-lg p-4 border border-border/50 mb-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{idx === 0 ? "IF" : "AND"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={editForm.conditions[idx]?.field || "reason"} onChange={(e) => updateEditCondition(idx, "field", e.target.value)} className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8] cursor-pointer">
                    {fields.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                  </select>
                  <select value={editForm.conditions[idx]?.operator || "equals"} onChange={(e) => updateEditCondition(idx, "operator", e.target.value)} className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8] cursor-pointer">
                    {operators.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                  </select>
                  <input value={editForm.conditions[idx]?.value || ""} onChange={(e) => updateEditCondition(idx, "value", e.target.value)} className="text-[12px] bg-card border border-border rounded px-2 py-1.5 w-20 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8]" />
                </div>
              </div>
            ))}
            <div className="bg-[#f8f9ff] dark:bg-surface-container-high rounded-lg p-4 border border-border/50 mb-6">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">THEN</p>
              <select value={editForm.actions[0]?.type || ""} onChange={(e) => updateEditAction(e.target.value)} className="text-[12px] text-foreground bg-card border border-border rounded px-2 py-1.5 outline-none focus:border-[#1f108e] dark:focus:border-[#818cf8] flex-1 w-full cursor-pointer">
                {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingRule(null)} className="px-5 py-2.5 text-body-md font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer">Cancel</button>
              <button onClick={saveEdit} disabled={!editForm.name.trim()} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#ffdad6] dark:bg-[#93000a]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#ba1a1a] dark:text-[#ffb4ab]">delete</span>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-foreground">Delete Rule</h3>
                <p className="text-[13px] text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground mb-6">
              Are you sure you want to delete <strong className="text-foreground">{deleteConfirm.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-body-md font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer">Cancel</button>
              <button onClick={() => deleteRule(deleteConfirm.id)} className="px-5 py-2.5 bg-[#ba1a1a] text-white rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
