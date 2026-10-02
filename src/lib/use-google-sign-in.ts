"use client"

import * as React from "react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_prompt?: boolean
          }) => void
          prompt: () => void
          cancel: () => void
        }
      }
    }
  }
}

export function useGoogleSignIn(onSuccess: (idToken: string) => void) {
  const initialized = React.useRef(false)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  React.useEffect(() => {
    if (!clientId || !onSuccess) return

    function initGIS() {
      if (initialized.current) return
      initialized.current = true
      window.google!.accounts.id.initialize({
        client_id: clientId!,
        auto_prompt: false,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential)
          }
        },
      })
    }

    if (typeof window.google !== "undefined") {
      initGIS()
    } else {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initGIS
      document.body.appendChild(script)
    }

    return () => {
      window.google?.accounts.id.cancel()
    }
  }, [clientId, onSuccess])

  const signIn = React.useCallback(() => {
    if (initialized.current) {
      window.google?.accounts.id.prompt()
    }
  }, [])

  return { signIn, enabled: true }
}
