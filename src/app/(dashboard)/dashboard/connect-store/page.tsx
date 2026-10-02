"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

const platforms = [
  { name: "Shopify", desc: "Sync orders, products, and customers from your Shopify store.", icon: "storefront", iconBg: "bg-primary-fixed", iconColor: "text-primary", popular: true },
  { name: "WooCommerce", desc: "Connect your self-hosted WooCommerce store.", icon: "shopping_cart", iconBg: "bg-[#62fae3]/30", iconColor: "text-secondary", popular: false },
  { name: "BigCommerce", desc: "Integrate with your BigCommerce store.", icon: "business", iconBg: "bg-[#ffdbcc]", iconColor: "text-[#752c00] dark:text-[#ffdbcc]", popular: false },
  { name: "Magento", desc: "Connect Adobe Commerce / Magento stores.", icon: "code", iconBg: "bg-[#e5eeff]", iconColor: "text-primary", popular: false },
  { name: "Custom API", desc: "Use our REST API for any custom platform.", icon: "api", iconBg: "bg-surface-container-low", iconColor: "text-on-surface-variant", popular: false },
  { name: "Square", desc: "Connect your Square point-of-sale.", icon: "point_of_sale", iconBg: "bg-[#ffdbcc]", iconColor: "text-[#752c00] dark:text-[#ffdbcc]", popular: false },
]

export default function ConnectStorePage() {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [shopDomain, setShopDomain] = React.useState("")
  const [storeUrl, setStoreUrl] = React.useState("")
  const [apiKey, setApiKey] = React.useState("")
  const [apiSecret, setApiSecret] = React.useState("")
  const [connecting, setConnecting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const router = useRouter()

  // Handle Shopify OAuth redirect
  const handleShopifyConnect = async () => {
    if (!shopDomain) {
      setError("Shop domain is required")
      return
    }
    setConnecting(true)
    setError("")
    try {
      // Normalize shop domain
      let domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      if (!domain.includes(".myshopify.com")) {
        domain = `${domain}.myshopify.com`
      }
      const res = await fetch(`/api/auth/shopify?shop=${encodeURIComponent(domain)}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to initiate Shopify connection")
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err: any) {
      setError(err.message)
      setConnecting(false)
    }
  }

  // Handle other platforms (manual entry)
  const handleManualConnect = async () => {
    if (!storeUrl || !apiKey) {
      setError("Store URL and API Key are required")
      return
    }
    setConnecting(true)
    setError("")
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected ? `${selected} - ${storeUrl}` : storeUrl,
          domain: storeUrl,
          accessToken: apiKey,
          platform: selected?.toLowerCase(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to connect store")
      }
      setSuccess(true)
      setTimeout(() => router.push("/dashboard/stores"), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = selected === "Shopify" ? handleShopifyConnect : handleManualConnect

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#2dd4bf] mb-4">
            <span className="material-symbols-outlined text-white text-[36px]">add_business</span>
          </div>
          <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Connect Your Store</h2>
          <p className="text-body-md text-on-surface-variant mt-2 max-w-lg mx-auto">Choose your e-commerce platform to start automating returns. We support all major platforms.</p>
        </div>

        {!selected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {platforms.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelected(p.name)}
                className={`bg-card rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
                  selected === p.name
                    ? "border-[#1f108e] dark:border-[#818cf8] shadow-md"
                    : "border-border shadow-sm hover:border-[#1f108e]/40 dark:hover:border-[#818cf8]/40"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${p.iconBg} ${p.iconColor} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-[26px]">{p.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      {p.popular && (
                        <span className="px-2 py-0.5 bg-[#62fae3] text-secondary dark:bg-[#62fae3]/20 dark:text-[#62fae3] text-[10px] font-bold uppercase tracking-wider rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                    selected === p.name ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {selected === p.name && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#62fae3]/30 rounded-lg">
                  <span className="material-symbols-outlined text-secondary">key</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Connect to {selected}</h3>
                  <p className="text-body-sm text-muted-foreground">
                    {selected === "Shopify"
                      ? "Enter your Shopify store domain to connect via OAuth."
                      : "Enter your store credentials to establish a secure connection."}
                  </p>
                </div>
              </div>

              {success ? (
                <div className="flex items-center gap-3 py-8 text-center justify-center">
                  <span className="material-symbols-outlined text-[#62fae3] text-[32px]">check_circle</span>
                  <p className="text-body-md font-semibold text-foreground">Store connected successfully! Redirecting...</p>
                </div>
              ) : (
                <>
                  {selected === "Shopify" ? (
                    <div className="grid gap-4 mb-6">
                      <div>
                        <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Shopify Store Domain</label>
                        <input
                          value={shopDomain}
                          onChange={(e) => setShopDomain(e.target.value)}
                          className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                          placeholder="mystore.myshopify.com"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Just enter your shop name — we&apos;ll redirect you to Shopify to authorize.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 mb-6">
                      <div className="sm:col-span-2">
                        <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">Store URL</label>
                        <input
                          value={storeUrl}
                          onChange={(e) => setStoreUrl(e.target.value)}
                          className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                          placeholder="https://mystore.myshopify.com"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">API Key</label>
                        <input
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                          placeholder="shpat_..."
                        />
                      </div>
                      <div>
                        <label className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1.5 block">API Secret</label>
                        <input
                          type="password"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          className="w-full px-4 py-2.5 bg-surface-container-low border border-border rounded-lg text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
                          placeholder="******"
                        />
                      </div>
                    </div>
                  )}

                  {error && <p className="text-destructive text-body-sm mb-4">{error}</p>}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                      Encrypted end-to-end
                    </div>
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {connecting
                        ? "Connecting..."
                        : selected === "Shopify"
                          ? "Connect with Shopify"
                          : "Connect Store"}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { setSelected(null); setError(""); setShopDomain(""); setStoreUrl(""); setApiKey(""); setApiSecret("") }} className="text-body-sm font-medium text-primary hover:underline flex items-center gap-1 justify-center w-full">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to platform selection
            </button>
          </div>
        )}
      </div>
    </>
  )
}
