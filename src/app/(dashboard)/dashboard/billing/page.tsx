const plans = [
  { name: "Starter", price: "$29", period: "/month", features: ["Up to 2 stores", "10 active rules", "Basic support", "Audit log"], popular: false },
  { name: "Pro", price: "$79", period: "/month", features: ["Up to 10 stores", "Unlimited rules", "Priority support", "Advanced analytics", "Custom webhooks"], popular: true },
  { name: "Enterprise", price: "$199", period: "/month", features: ["Unlimited stores", "Unlimited rules", "Dedicated support", "Custom integrations", "SLA guarantee"], popular: false },
]

export default function BillingPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Billing</h2>
        <p className="text-body-md text-on-surface-variant">Manage your subscription and payment methods.</p>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#e2dfff] rounded-lg">
              <span className="material-symbols-outlined text-primary">credit_card</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">Pro Plan</p>
              <p className="text-body-sm text-muted-foreground">$79/month · Next billing: Aug 18, 2026</p>
            </div>
          </div>
          <button className="px-5 py-2 border border-border rounded-lg text-body-sm font-medium hover:bg-surface-container-low transition-all">
            Change Plan
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={`bg-card rounded-xl border shadow-sm p-6 ${plan.popular ? "border-[#1f108e] ring-1 ring-[#1f108e]" : "border-border"}`}>
            {plan.popular && (
              <span className="inline-block px-3 py-0.5 bg-[#1f108e] text-white text-[11px] font-bold uppercase tracking-tight rounded-full mb-4">
                Most Popular
              </span>
            )}
            <h3 className="text-[18px] font-semibold text-foreground">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-2 mb-6">
              <span className="text-[32px] font-bold text-foreground">{plan.price}</span>
              <span className="text-body-md text-muted-foreground">{plan.period}</span>
            </div>
            <div className="border-t border-border/50 pt-4 space-y-3 mb-6">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary">check</span>
                  {f}
                </div>
              ))}
            </div>
            <button className={`w-full py-2.5 rounded-lg text-body-md font-bold transition-all ${
              plan.popular
                ? "bg-[#1f108e] text-white shadow-md hover:opacity-90"
                : "border border-border text-foreground hover:bg-surface-container-low"
            }`}>
              {plan.name === "Enterprise" ? "Contact Sales" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
