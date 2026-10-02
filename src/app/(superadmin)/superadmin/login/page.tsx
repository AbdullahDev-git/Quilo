"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export default function SuperadminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/superadmin"

  const [step, setStep] = React.useState<"credentials" | "totp">("credentials")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [totpCode, setTotpCode] = React.useState("")
  const [tempToken, setTempToken] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/superadmin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(res.status === 423 ? "Account locked. Try again later." : data.error || "Invalid credentials")
        setLoading(false)
        return
      }

      if (data.requires2fa) {
        setTempToken(data.tempToken)
        setStep("totp")
        setLoading(false)
        return
      }

      toast.success("Welcome!")
      router.push(from)
    } catch {
      toast.error("Login failed")
      setLoading(false)
    }
  }

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/superadmin/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, totpCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Invalid code")
        setLoading(false)
        return
      }

      toast.success("Welcome!")
      router.push(from)
    } catch {
      toast.error("Verification failed")
      setLoading(false)
    }
  }

  return (
    <div className="superadmin min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-superadmin-navy rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
          <span className="text-superadmin-navy font-semibold text-[18px]">Quilo</span>
          <span className="px-1.5 py-0.5 bg-superadmin-navy/10 text-superadmin-navy text-[9px] font-bold rounded">ADMIN</span>
        </div>

        <h1 className="text-[22px] font-bold text-foreground text-center mb-1">
          {step === "credentials" ? "Sign in" : "Enter 2FA code"}
        </h1>
        <p className="text-[13px] text-muted-foreground text-center mb-6">
          {step === "credentials"
            ? "Access the admin console"
            : "Enter the code from your authenticator app"}
        </p>

        {step === "credentials" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20 focus:border-superadmin-accent"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-white border border-border rounded-lg text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20 focus:border-superadmin-accent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-superadmin-navy text-white rounded-lg text-[14px] font-medium hover:bg-superadmin-blue transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyTotp} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-[14px] text-center tracking-[0.3em] font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-superadmin-accent/20 focus:border-superadmin-accent"
                maxLength={6}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-2.5 bg-superadmin-navy text-white rounded-lg text-[14px] font-medium hover:bg-superadmin-blue transition-all disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("credentials"); setTotpCode(""); setTempToken("") }}
              className="w-full py-2.5 bg-muted text-foreground rounded-lg text-[13px] font-medium hover:bg-muted/80 transition-all"
            >
              Back
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Restricted to authorized administrators only
        </p>
      </div>
    </div>
  )
}