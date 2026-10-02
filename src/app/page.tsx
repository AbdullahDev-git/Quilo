"use client"

import Link from "next/link"
import { useState } from "react"

const features = [
  {
    icon: "route",
    title: "No-Code Rules Engine",
    description: "Build return/refund logic with simple IF → AND → THEN rules. No developers needed.",
  },
  {
    icon: "sync_alt",
    title: "Multi-Platform",
    description: "Connect Shopify, WooCommerce, or your custom store. Manage everything from one dashboard.",
  },
  {
    icon: "savings",
    title: "Protect Your Margin",
    description: "Instead of defaulting to full refunds, Quilo intelligently chooses exchanges, store credit, or partial refunds.",
  },
  {
    icon: "shield",
    title: "Fraud Protection",
    description: "Automatic velocity checks, spend caps, and order age cutoffs prevent abuse before it happens.",
  },
  {
    icon: "analytics",
    title: "Real-Time Analytics",
    description: "Track refunds processed, money saved via exchanges, and top-returned products.",
  },
  {
    icon: "bolt",
    title: "Instant Setup",
    description: "Connect your store in one click. Pre-built rule templates get you running in minutes.",
  },
]

const steps = [
  { num: "1", title: "Connect Your Store", description: "One-click OAuth for Shopify and WooCommerce. No API keys to copy-paste." },
  { num: "2", title: "Set Your Rules", description: "Define your return policy as simple rules. Use templates or build from scratch." },
  { num: "3", title: "Automate Everything", description: "Returns are evaluated instantly. Approved automatically or flagged for review." },
]

export default function LandingPage() {
  const [email, setEmail] = useState("")

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <header className="fixed top-0 z-50 w-full bg-card/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1f108e] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{fontVariationSettings: "'FILL' 1"}}>rocket_launch</span>
            </div>
            <span className="text-headline-md font-black text-primary tracking-tight">Quilo</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-5 py-2 text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors">
              Log in
            </Link>
            <Link href="/register" className="px-5 py-2.5 bg-[#1f108e] text-white rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 pt-36 pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e2dfff] px-4 py-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">auto_awesome</span>
              <span className="text-label-md font-bold text-primary">AI-Powered E-commerce Automation</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
              Automate Your E-commerce Store
              <span className="text-primary"> Without Code</span>
            </h1>
            <p className="mt-6 text-body-lg text-on-surface-variant max-w-xl mx-auto leading-relaxed">
              Build custom automation rules, manage returns, and streamline your operations across Shopify, WooCommerce, or your custom store.
              Connect your store and let Quilo handle the busywork.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1f108e] text-white rounded-lg text-body-md font-bold shadow-md hover:opacity-90 transition-all"
              >
                Start Free Trial
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg text-body-md font-medium hover:bg-surface-container-low transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                Sign In
              </Link>
            </div>
            <div className="mt-16 flex items-center justify-center gap-8 text-body-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006b5f]">check_circle</span>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006b5f]">check_circle</span>
                Free 14-day trial
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#006b5f]">check_circle</span>
                Cancel anytime
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 py-24 bg-white rounded-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-foreground tracking-tight">Everything you need to automate returns</h2>
            <p className="mt-4 text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              From rule-based automation to fraud protection, Quilo handles the complexity so you can focus on growing your store.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-border/50 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-[#e2dfff] rounded-xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-[24px]">{f.icon}</span>
                </div>
                <h3 className="text-[18px] font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-foreground tracking-tight">Up and running in 3 steps</h2>
            <p className="mt-4 text-body-lg text-on-surface-variant">No developers. No complicated setup.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 bg-[#1f108e] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-[20px] font-black text-white">{s.num}</span>
                </div>
                <h3 className="text-[18px] font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-body-md text-on-surface-variant">{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="bg-[#1f108e] rounded-3xl p-12 text-center">
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">Ready to automate your store?</h2>
            <p className="text-body-lg text-white/70 mb-8 max-w-xl mx-auto">
              Join store owners who are saving hours every week and protecting their margins with smart automation.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#1f108e] rounded-xl text-body-lg font-bold shadow-lg hover:opacity-90 transition-all"
            >
              Start Your Free Trial
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#1f108e] rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>rocket_launch</span>
                </div>
                <span className="text-headline-sm font-black text-primary tracking-tight">Quilo</span>
              </div>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                No-code automation for e-commerce returns, refunds, and exchanges.
              </p>
            </div>
            <div>
              <h4 className="text-[12px] font-bold tracking-[0.05em] uppercase text-on-surface-variant mb-4">Product</h4>
              <ul className="space-y-2">
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Features</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Pricing</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Integrations</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Changelog</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-bold tracking-[0.05em] uppercase text-on-surface-variant mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Documentation</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">API Reference</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Blog</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Support</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-bold tracking-[0.05em] uppercase text-on-surface-variant mb-4">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">About</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="text-body-md text-muted-foreground hover:text-primary transition-colors cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-muted-foreground">&copy; 2026 Quilo. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-[20px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">chat</span>
              <span className="material-symbols-outlined text-[20px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">code</span>
              <span className="material-symbols-outlined text-[20px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">mail</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
