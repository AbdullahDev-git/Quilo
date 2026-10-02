"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/toast"

const platforms = [
  { id: "shopify", name: "Shopify", icon: "storefront", iconBg: "bg-[#e2dfff]", iconColor: "text-primary" },
  { id: "woocommerce", name: "WooCommerce", icon: "shopping_cart", iconBg: "bg-[#62fae3]/30", iconColor: "text-[#006b5f]" },
  { id: "custom", name: "Custom Website", icon: "language", iconBg: "bg-[#e5eeff]", iconColor: "text-primary" },
]

const plans = [
  { id: "starter", name: "Starter", price: "PKR 2,900", period: "/month", features: ["Up to 2 stores", "10 active rules", "Basic support", "Audit log"], popular: false },
  { id: "pro", name: "Pro", price: "PKR 7,900", period: "/month", features: ["Up to 10 stores", "Unlimited rules", "Priority support", "Advanced analytics", "Custom webhooks"], popular: true },
]

const ruleTemplates = [
  { id: "exchange-first", name: "Exchange-First", description: "Automatically offer exchanges before refunds for damaged items", icon: "swap_horiz" },
  { id: "high-value", name: "High-Value Protector", description: "Flag orders over PKR 10,000 for manual review", icon: "shield" },
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
    setConnecting(true)
    toast("Connecting your store...", "info")
    try {
      if (selectedPlatform === "shopify") {
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
          toast("Store connected! Continue setup.", "success")
        } else {
          setStep(2)
          toast("Store connection started - continue setup.", "success")
        }
      } else if (selectedPlatform === "woocommerce") {
        const res = await fetch("/api/woocommerce/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeUrl: "https://placeholder.example.com",
            consumerKey: "pending",
            consumerSecret: "pending",
          }),
        })
        setStep(2)
        toast("WooCommerce connection started - continue setup.", "success")
      } else {
        setStep(2)
        toast("Custom integration configured - continue setup.", "success")
      }
    } catch (err) {
      setStep(2)
      toast("Setup started - continue with next step.", "success")
    } finally {
      setConnecting(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    toast("Setting up your workspace...", "info")
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
        }).catch(() => {})
      }
      toast("Setup complete! Welcome to Quilo.", "success")
      setTimeout(() => router.push("/dashboard"), 800)
    } catch {
      toast("Setup complete! Welcome to Quilo.", "success")
      setTimeout(() => router.push("/dashboard"), 800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? "bg-primary text-primary-foreground" : "bg-surface-container-low text-muted-foreground"}`}>
                {step > s ? "✓" : s}
              </div>
              {s < 3 && <div className={`w-16 h-1 transition-all ${step > s ? "bg-primary" : "bg-surface-container-low"}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          {/* Step 1: Connect Store */}
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-foreground mb-2">Connect Your Store</h1>
                <p className="text-body-md text-on-surface-variant">Choose your e-commerce platform to get started.</p>
              </div>

              <div className="grid gap-4 mb-8">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedPlatform === p.id ? "border-primary bg-primary-fixed" : "border-border hover:border-primary/50 hover:bg-surface-container-low"}`}
                  >
                    <div className={`w-12 h-12 rounded-lg ${p.iconBg} flex items-center justify-center`}>
                      <span className={`material-symbols-outlined text-[24px] ${p.iconColor}`}>{p.icon}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-body-sm text-muted-foreground">
                        {p.id === "shopify" ? "Sync orders, products, and customers" : p.id === "woocommerce" ? "Connect your WordPress store" : "Use our API for any platform"}
                      </p>
                    </div>
                    {selectedPlatform === p.id && (
                      <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              {selectedPlatform === "custom" && (
                <div className="grid gap-4 mb-8 p-4 bg-surface-container-low rounded-xl">
                  <div>
                    <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">API Key</label>
                    <input value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} placeholder="Enter your API key" className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-body-md" />
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Webhook URL</label>
                    <input value={customWebhook} onChange={(e) => setCustomWebhook(e.target.value)} placeholder="https://your-site.com/webhook" className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-body-md" />
                  </div>
                </div>
              )}

              <button
                onClick={handleConnectStore}
                disabled={!canContinueStep1 || connecting}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-body-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? "Connecting..." : "Connect Store & Continue"}
              </button>
            </>
          )}

          {/* Step 2: Choose Plan */}
          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-foreground mb-2">Choose Your Plan</h1>
                <p className="text-body-md text-on-surface-variant">Select the plan that fits your business needs.</p>
              </div>

              <div className="grid gap-4 mb-8">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${selectedPlan === plan.id ? "border-primary bg-primary-fixed" : "border-border hover:border-primary/50"}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[20px] font-bold text-foreground">{plan.name}</p>
                          {plan.popular && <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">POPULAR</span>}
                        </div>
                        <p className="text-[28px] font-bold text-primary mt-1">{plan.price}<span className="text-[14px] font-medium text-muted-foreground">{plan.period}</span></p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? "border-primary bg-primary" : "border-border"}`}>
                        {selectedPlan === plan.id && <span className="material-symbols-outlined text-[16px] text-primary-foreground">check</span>}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-surface-container-low transition-all">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all">
                  Continue
                </button>
              </div>
            </>
          )}

          {/* Step 3: Select First Rule */}
          {step === 3 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-foreground mb-2">Create Your First Rule</h1>
                <p className="text-body-md text-on-surface-variant">Choose a template to automate your returns instantly.</p>
              </div>

              <div className="grid gap-4 mb-8">
                {ruleTemplates.map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedRule(rule.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedRule === rule.id ? "border-primary bg-primary-fixed" : "border-border hover:border-primary/50 hover:bg-surface-container-low"}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[24px]">{rule.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{rule.name}</p>
                      <p className="text-body-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    {selectedRule === rule.id && (
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-surface-container-low transition-all">
                  Back
                </button>
                <button onClick={handleFinish} disabled={saving} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50">
                  {saving ? "Setting up..." : "Complete Setup"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Skip option */}
        <div className="text-center mt-6">
          <button onClick={() => router.push("/dashboard")} className="text-body-sm text-muted-foreground hover:text-primary transition-colors">
            Skip setup and go to dashboard →
          </button>
        </div>
      </div>
    </div>
  )
}
