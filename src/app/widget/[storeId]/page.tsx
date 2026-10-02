"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface StoreContext {
  storeName: string
  platform: string
  products: Array<{ id: string; title: string; price: string; inStock: boolean }>
  policies: { refund?: string; shipping?: string }
}

interface Message {
  role: "customer" | "bot"
  content: string
}

export default function ChatWidgetPage() {
  const params = useParams()
  const storeId = params?.storeId as string

  const [storeContext, setStoreContext] = useState<StoreContext | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (storeId) {
      fetchStoreContext()
    }
  }, [storeId])

  useEffect(() => {
    if (storeContext && messages.length === 0) {
      setMessages([{
        role: "bot",
        content: `Hello! Welcome to ${storeContext.storeName}! 👋 How can I help you today?`
      }])
    }
  }, [storeContext])

  const fetchStoreContext = async () => {
    try {
      const res = await fetch(`/api/chat/store-context/${storeId}`)
      if (res.ok) {
        const data = await res.json()
        setStoreContext(data)
      }
    } catch (error) {
      console.error("Failed to load store context:", error)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setMessages(prev => [...prev, { role: "customer", content: text }])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          message: text,
          conversationId,
        }),
      })

      const data = await res.json()
      setConversationId(data.sessionId)
      setMessages(prev => [...prev, { role: "bot", content: data.message }])
    } catch (error) {
      setMessages(prev => [...prev, { role: "bot", content: "Sorry, something went wrong. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Invalid store ID</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1f108e] text-white p-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="font-semibold text-lg">{storeContext?.storeName || "Chat with Us"}</h1>
          <p className="text-xs text-white/70">We typically reply within minutes</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white/80 hover:text-white"
        >
          {isOpen ? "−" : "+"}
        </button>
      </div>

      {/* Messages */}
      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "customer"
                      ? "bg-[#1f108e] text-white rounded-br-md"
                      : "bg-white text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br>")
                  }}
                />
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-[#1f108e]"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-5 py-2.5 bg-[#1f108e] text-white rounded-xl font-medium text-sm hover:bg-[#1a0d7a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
