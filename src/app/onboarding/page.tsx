"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

const platforms = [
  { id: "shopify", name: "Shopify", icon: "storefront", iconBg: "bg-[#e2dfff]", iconColor: "text-primary" },
  { id: "woocommerce", name: "WooCommerce", icon: "shopping_cart", iconBg: "bg-[#62fae3]/30", iconColor: "text-[#006b5f]" },
  { id: "custom", name: "Custom Website", icon: "language", iconBg: "bg-[#e5eeff]", iconColor: "text-primary" },
]

const plans = [
  { id: "starter", name: "Starter", price: "$29", period: "/month", features: ["Up to 2 stores", "10 active rules", "Basic support", "Audit log"], popular: false },
  { id: "pro", name: "Pro", price: "$79", period: "/month", features: ["Up to 10 stores", "Unlimited rules", "Priority support", "Advanced analytics", "Custom webhooks"], popular: true },
]

const ruleTemplates = [
  { id: "exchange-first", name: "Exchange-First", description: "Automatically offer exchanges before refunds for damaged items", icon: "swap_horiz" },
  { id: "high-value", name: "High-Value Protector", description: "Flag orders over $100 for manual review", icon: "shield" },
  { id: "free-shipping", name: "Free Shipping Protector", description: "Auto-deny returns for buyer's remorse on free-shipping orders", icon: "local_shipping" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [selectedPlatform, setSelectedPlatform] = React.useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = React.useState<string>("pro")
  const [selectedRule, setSelectedRule] = React.useState<string | null>(null)
  const [customApiKey, setCustomApiKey] = React.useState("")
  const [customWebhook, setCustomWebhook] = React.useState("")
  const [connecting, setConnecting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const canContinueStep1 =
    selectedPlatform !== null &&
    (selectedPlatform !== "custom" || (customApiKey.trim() !== "" && customWebhook.trim() !== ""))

  const handleConnectStore = async () => {
    if (selectedPlatform === "shopify") {
      setConnecting(true)
      try {
        const res = await fetch("/api/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "My Shopify Store",
            domain: "placeholder.myshopify.com",
            accessToken: "pending",
          }),
        })
        if (res.ok) {
          setStep(2)
        }
      } catch (err) {
        console.error("Failed to init store:", err)
      } finally {
        setConnecting(false)
      }
    } else if (selectedPlatform === "woocommerce") {
      setConnecting(true)
      try {
        const res = await fetch("/api/woocommerce/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeUrl: "https://placeholder.example.com",
            consumerKey: "pending",
            consumerSecret: "pending",
          }),
        })
        if (res.ok) {
          setStep(2)
        }
      } catch (err) {
        console.error("Failed to init store:", err)
      } finally {
        setConnecting(false)
      }
    } else {
      setStep(2)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      if (selectedRule) {
        await fetch("/api/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ruleTemplates.find(r => r.id === selectedRule)?.name || "My First Rule",
            description: ruleTemplates.find(r => r.id === selectedRule)?.description || "",
            conditions: [{ field: "reason", operator: "equals", value: "damaged" }],
            actions: [{ type: "offer_exchange", params: { discount: 10 } }],
            logic: "all",
            status: "active",
          }),
        })
      }
      router.push("/dashboard")
    } catch (err) {
      console.error("Failed to save rule:", err)
      router.push("/dashboard")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      <main className="w-full max-w-[640px] flex flex-col items-center">
        <div className="mb-6">
          <div className="w-14 h-14 bg-[#1f108e] rounded-xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-[32px]" style={{fontVariationSettings: "'FILL' 1"}}>rocket_launch</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 w-full max-w-[440px]">
          {[
            { num: 1, label: "Connect Store", active: step === 1 },
            { num: 2, label: "Choose Plan", active: step === 2 },
            { num: 3, label: "Set First Rule", active: step === 3 },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${s.active ? "bg-[#1f108e] text-white" : step > s.num ? "bg-[#006b5f] text-white" : "bg-[#c8c4d5] text-white"}`}>
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className={`text-[11px] font-bold tracking-tight ${s.active ? "text-primary" : step > s.num ? "text-[#006b5f]" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className={`flex-1 h-px ${step > s.num ? "bg-[#006b5f]" : "bg-[#c8c4d5]"}`} />}
            </React.Fragment>
          ))}
        </div>

        <section className="bg-card border border-border rounded-xl p-8 w-full shadow-sm">
          {step === 1 && (
            <>
              <header className="mb-6 text-center">
                <h1 className="text-[24px] font-semibold text-foreground mb-1 tracking-tight">Connect your store</h1>
                <p className="text-body-md text-on-surface-variant">Link your store so Quilo can start automating returns.</p>
              </header>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedPlatform === p.id
                        ? "border-[#1f108e] bg-[#e2dfff]/20 shadow-sm"
                        : "border-border bg-card hover:border-[#1f108e]/40 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${p.iconBg} ${p.iconColor} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground text-center leading-tight">{p.name}</span>
                  </button>
                ))}
              </div>

              {selectedPlatform === "custom" && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">API Key</label>
                    <input value={customApiKey} onChange={e => setCustomApiKey(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 focus:border-[#1f108e] transition-all" placeholder="sk_live_..." />
                  </div>
                  <div>
                    <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Webhook URL</label>
                    <input value={customWebhook} onChange={e => setCustomWebhook(e.target.value)} className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 focus:border-[#1f108e] transition-all" placeholder="https://yourstore.com/webhooks/quilo" />
                  </div>
                </div>
              )}

              <button
                disabled={!canContinueStep1 || connecting}
                onClick={handleConnectStore}
                className={`w-full py-2.5 rounded-lg text-body-md font-bold shadow-md transition-all active:scale-[0.98] ${
                  canContinueStep1 && !connecting
                    ? "bg-[#1f108e] text-white hover:opacity-90"
                    : "bg-[#c8c4d5] text-white cursor-not-allowed"
                }`}
              >
                {connecting ? "Connecting..." : selectedPlatform === "custom" ? "Continue" : `Connect ${platforms.find(p => p.id === selectedPlatform)?.name || ""}`}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <header className="mb-6 text-center">
                <h1 className="text-[24px] font-semibold text-foreground mb-1 tracking-tight">Choose your plan</h1>
                <p className="text-body-md text-on-surface-variant">Start with a 14-day free trial. No credit card required.</p>
              </header>

              <div className="grid gap-4 mb-6">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`text-left p-5 rounded-xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? "border-[#1f108e] bg-[#e2dfff]/20 shadow-sm"
                        : "border-border bg-card hover:border-[#1f108e]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[16px] font-semibold text-foreground">{plan.name}</h3>
                        {plan.popular && (
                          <span className="px-2 py-0.5 bg-[#1f108e] text-white text-[10px] font-bold uppercase rounded-full">Popular</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[24px] font-bold text-foreground">{plan.price}</span>
                        <span className="text-body-sm text-muted-foreground">{plan.period}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {plan.features.slice(0, 3).map((f) => (
                        <span key={f} className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#006b5f]">check</span>
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg text-body-md font-bold border border-border text-foreground hover:bg-surface-container-low transition-all">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg text-body-md font-bold bg-[#1f108e] text-white shadow-md hover:opacity-90 transition-all">
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <header className="mb-6 text-center">
                <h1 className="text-[24px] font-semibold text-foreground mb-1 tracking-tight">Set your first rule</h1>
                <p className="text-body-md text-on-surface-variant">Choose a template to get started instantly.</p>
              </header>

              <div className="space-y-3 mb-6">
                {ruleTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedRule(template.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedRule === template.id
                        ? "border-[#1f108e] bg-[#e2dfff]/20 shadow-sm"
                        : "border-border bg-card hover:border-[#1f108e]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#e2dfff] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[20px]">{template.icon}</span>
                      </div>
                      <div>
                        <p className="text-body-md font-semibold text-foreground">{template.name}</p>
                        <p className="text-body-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg text-body-md font-bold border border-border text-foreground hover:bg-surface-container-low transition-all">
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!selectedRule || saving}
                  className={`flex-1 py-2.5 rounded-lg text-body-md font-bold shadow-md transition-all ${
                    selectedRule && !saving
                      ? "bg-[#1f108e] text-white hover:opacity-90"
                      : "bg-[#c8c4d5] text-white cursor-not-allowed"
                  }`}
                >
                  {saving ? "Setting up..." : "Finish Setup"}
                </button>
              </div>

              <button onClick={() => router.push("/dashboard")} className="w-full mt-3 py-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors">
                Skip for now
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
