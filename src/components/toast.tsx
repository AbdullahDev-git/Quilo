"use client"
import * as React from "react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
const listeners = new Set<(toasts: Toast[]) => void>()
let toasts: Toast[] = []

function notify() {
  listeners.forEach((fn) => fn([...toasts]))
}

export function toast(message: string, type: ToastType = "success") {
  const id = ++toastId
  toasts = [...toasts, { id, message, type }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }, 3000)
}

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([])
  React.useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-body-sm font-medium text-white animate-in fade-in slide-in-from-right-2 ${
            t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-[#1e3a5f]"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
