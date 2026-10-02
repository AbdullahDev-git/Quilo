"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"

interface Store {
  id: string
  name: string
  domain: string
  platform: string
  status: string
}

interface ChatSession {
  id: string
  customerEmail: string | null
  customerName: string | null
  status: string
  intent: string | null
  startedAt: string
  lastMessageAt: string
}

interface ChatMessage {
  id: string
  role: string
  content: string
  intent: string | null
  createdAt: string
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [embedCode, setEmbedCode] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<"embed" | "history">("embed")

  // Fetch stores on mount
  useEffect(() => {
    fetchStores()
  }, [])

  // Fetch sessions when store changes
  useEffect(() => {
    if (selectedStore) {
      fetchSessions()
      fetchEmbedCode()
    }
  }, [selectedStore])

  // Fetch messages when session changes
  useEffect(() => {
    if (selectedSession) {
      fetchMessages()
    }
  }, [selectedSession])

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores")
      const data = await res.json()
      const activeStores = data.filter((s: Store) => s.status === "active")
      setStores(activeStores)
      if (activeStores.length > 0 && !selectedStore) {
        setSelectedStore(activeStores[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error)
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/chat/sessions/${selectedStore}`)
      const data = await res.json()
      setSessions(data)
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/sessions/${selectedSession}/messages`)
      const data = await res.json()
      setMessages(data)
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    }
  }

  const fetchEmbedCode = async () => {
    try {
      const res = await fetch(`/api/chat/widget/${selectedStore}`)
      const data = await res.json()
      setEmbedCode(data.embedCode || "")
    } catch (error) {
      console.error("Failed to fetch embed code:", error)
    }
  }

  const refreshContext = async () => {
    setLoading(true)
    try {
      await fetch(`/api/chat/store-context/${selectedStore}`, { method: "POST" })
      alert("Store context refreshed!")
    } catch (error) {
      alert("Failed to refresh context")
    } finally {
      setLoading(false)
    }
  }

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyScriptTag = () => {
    const scriptTag = `<script src="${window.location.origin}/quilo-chat.js" data-store-id="${selectedStore}" data-api-url="${window.location.origin}/api"></script>`
    navigator.clipboard.writeText(scriptTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedStoreData = stores.find(s => s.id === selectedStore)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Chatbot</h1>
        <p className="text-muted-foreground">Configure your AI chat widget and view customer conversations</p>
      </div>

      {/* Store Selector */}
      <div className="rounded-lg border bg-card p-4">
        <label className="text-sm font-medium">Select Store</label>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="mt-2 w-full max-w-md px-3 py-2 border rounded-lg bg-background"
        >
          <option value="">Choose a store...</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name} ({store.domain})
            </option>
          ))}
        </select>
      </div>

      {selectedStore && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setTab("embed")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                tab === "embed"
                  ? "border-[#1f108e] text-[#1f108e]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Widget Setup
            </button>
            <button
              onClick={() => { setTab("history"); fetchSessions() }}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                tab === "history"
                  ? "border-[#1f108e] text-[#1f108e]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Chat History ({sessions.length})
            </button>
          </div>

          {/* Embed Tab */}
          {tab === "embed" && (
            <div className="space-y-6">
              {/* Widget Preview */}
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Widget Preview</h2>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#1f108e] flex items-center justify-center shadow-lg">
                    <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{selectedStoreData?.name}</p>
                    <p className="text-sm text-muted-foreground">Chat widget will appear on your store like this</p>
                  </div>
                </div>
              </div>

              {/* Quick Install */}
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-2">Quick Install</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Paste this code before the closing <code>&lt;/body&gt;</code> tag in your Shopify theme:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/quilo-chat.js"
        data-store-id="${selectedStore}"
        data-api-url="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api">
</script>`}
                  </pre>
                  <button
                    onClick={copyScriptTag}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-[#1f108e] text-white rounded-md text-xs font-medium hover:bg-[#1a0d7a]"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Customization */}
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Customization Options</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Color:</span>
                    <code className="bg-muted px-2 py-0.5 rounded">data-color="#1f108e"</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Greeting:</span>
                    <code className="bg-muted px-2 py-0.5 rounded">data-greeting="Hello!"</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Position:</span>
                    <code className="bg-muted px-2 py-0.5 rounded">data-position="bottom-left"</code>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={refreshContext}
                  disabled={loading}
                  className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
                >
                  {loading ? "Refreshing..." : "Refresh Store Context"}
                </button>
                <a
                  href={`/widget/${selectedStore}`}
                  target="_blank"
                  className="px-4 py-2 bg-[#1f108e] text-white rounded-lg hover:bg-[#1a0d7a]"
                >
                  Preview Full Widget
                </a>
              </div>
            </div>
          )}

          {/* History Tab */}
          {tab === "history" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sessions List */}
              <div className="rounded-lg border bg-card">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">Conversations</h2>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="p-4 text-muted-foreground text-sm">No conversations yet</p>
                  ) : (
                    sessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session.id)}
                        className={`w-full p-4 border-b text-left hover:bg-muted transition-colors ${
                          selectedSession === session.id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {session.customerName || session.customerEmail || "Anonymous"}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            session.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.intent || "No intent"} • {new Date(session.lastMessageAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="lg:col-span-2 rounded-lg border bg-card">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">
                    {selectedSession ? "Messages" : "Select a conversation"}
                  </h2>
                </div>
                {selectedSession ? (
                  <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "customer" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                            msg.role === "customer"
                              ? "bg-[#1f108e] text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Select a conversation to view messages
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedStore && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Connect a store to configure the chatbot widget
        </div>
      )}
    </div>
  )
}
