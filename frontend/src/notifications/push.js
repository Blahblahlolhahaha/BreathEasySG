// PLACEHOLDER — Notifications: turns on push alerts for this browser. Does nothing for now.

// PLACEHOLDER — Notifications: register public/sw.js, ask for notification permission, subscribe with VITE_VAPID_PUBLIC_KEY,
// and save the subscription to the backend (apiFetch from src/api/client.js with auth: true). Return true when push is on.

import { apiFetch } from "../api/client"
import { config } from "../config"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  )
}

export async function registerPush() {
  if (!("Notification" in window)) {
    console.error("This browser does not support notifications.")
    return false
  }

  if (!("serviceWorker" in navigator)) {
    console.error("This browser does not support service workers.")
    return false
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    console.log("Notification permission was not granted.")
    return false
  }

  await navigator.serviceWorker.register("/sw.js")

  const registration = await navigator.serviceWorker.ready

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

  if (!vapidPublicKey) {
    console.error("VAPID public key is missing.")
    return false
  }

  let subscription =
    await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        urlBase64ToUint8Array(vapidPublicKey)
    })
  }

  await apiFetch("/api/push/subscribe", {
    method: "POST",
    body: subscription.toJSON(),
    auth: true,
    baseUrl: config.notificationsApiUrl
  })

  return true
}