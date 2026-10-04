"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface StoreInfo {
  storeId: string
  storeName: string
  platform: string
  returnPolicySummary: string
}

interface SubmitResult {
  decision: string
  status: string
  message: string
  ruleName?: string | null
  reason?: string | null
  amount?: number | null
  emailSent?: boolean | null
}

const REASON_OPTIONS = [
  "Wrong item received",
  "Item damaged or defective",
  "Item not as described",
  "Size or fit issue",
  "Changed my mind",
  "Ordered by mistake",
  "Quality not as expected",
  "Other",
]

export default function ReturnPortalPage() {
  const params = useParams()
  const storeId = params?.storeId as string

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [storeError, setStoreError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [submitError, setSubmitError] = useState("")

  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")
  const [itemName, setItemName] = useState("")
  const [reason, setReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [requestType, setRequestType] = useState<"refund" | "exchange">("refund")

  useEffect(() => {
    if (!storeId) return
    const loadStore = async () => {
      try {
        const res = await fetch(`/api/portal/${storeId}`)
        if (res.ok) {
          setStoreInfo(await res.json())
        } else {
          setStoreError(true)
        }
      } catch {
        setStoreError(true)
      }
    }
    loadStore()
  }, [storeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    const finalReason = reason === "Other" ? customReason.trim() : reason
    if (!orderNumber.trim() || !email.trim() || !finalReason) {
      setSubmitError("Please fill in order number, email, and reason.")
      return
    }

    setIsLoading(true)
    setSubmitError("")
    setResult(null)

    try {
      const res = await fetch(`/api/portal/${storeId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          email: email.trim(),
          itemName: itemName.trim() || undefined,
          reason: finalReason,
          requestType,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setSubmitError(data.error || "Failed to submit request. Please try again.")
      }
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setOrderNumber("")
    setEmail("")
    setItemName("")
    setReason("")
    setCustomReason("")
    setRequestType("refund")
    setResult(null)
    setSubmitError("")
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Invalid store ID</p>
      </div>
    )
  }

  if (storeError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">Store not found</p>
          <p className="text-gray-400 text-sm">This return portal link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const decisionStyles: Record<string, { bg: string; border: string; icon: string; title: string }> = {
    refund_processed: { bg: "bg-green-50", border: "border-green-200", icon: "✅", title: "Refund Processed" },
    auto_approve: { bg: "bg-green-50", border: "border-green-200", icon: "✅", title: "Request Approved" },
    auto_deny: { bg: "bg-red-50", border: "border-red-200", icon: "❌", title: "Request Denied" },
    flag_for_review: { bg: "bg-amber-50", border: "border-amber-200", icon: "📝", title: "Submitted for Review" },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#1f108e" }}
          >
            Q
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-tight">
              {storeInfo?.storeName || "Store"} — Returns
            </h1>
            <p className="text-xs text-gray-500">Powered by Quilo</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {result ? (
          /* ---- Result Screen ---- */
          <div
            className={`rounded-xl border p-6 ${decisionStyles[result.decision]?.bg || "bg-gray-50"} ${decisionStyles[result.decision]?.border || "border-gray-200"}`}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{decisionStyles[result.decision]?.icon || "📝"}</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {decisionStyles[result.decision]?.title || "Request Received"}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">{result.message}</p>

              {result.ruleName && (
                <p className="text-xs text-gray-400 mt-3">Rule applied: {result.ruleName}</p>
              )}
              {result.reason && result.decision === "flag_for_review" && (
                <p className="text-xs text-gray-400 mt-1">{result.reason}</p>
              )}
            </div>

            <button
              onClick={resetForm}
              className="w-full mt-6 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: "#1f108e" }}
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          /* ---- Form Screen ---- */
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Request a Return</h2>
              <p className="text-sm text-gray-500">
                Fill in your order details below. No account needed.
              </p>
              {storeInfo?.returnPolicySummary && (
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {storeInfo.returnPolicySummary}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["refund", "exchange"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRequestType(type)}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        requestType === type
                          ? "text-white border-transparent"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                      style={requestType === type ? { backgroundColor: "#1f108e" } : undefined}
                    >
                      {type === "refund" ? "💰 Refund" : "🔄 Exchange"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Number */}
              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. #12345 or 12345"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Item Name */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="itemName"
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Blue Cotton Shirt"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a reason...</option>
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Custom Reason */}
              {reason === "Other" && (
                <div>
                  <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 mb-1">
                    Please describe <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="customReason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                    placeholder="Tell us what went wrong..."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    required
                  />
                </div>
              )}

              {/* Error */}
              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1f108e" }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit Request"
                )}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
              Your request will be reviewed automatically against the store&apos;s return policy.
              You&apos;ll receive an email update once it&apos;s processed.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
