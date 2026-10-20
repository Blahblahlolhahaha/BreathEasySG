// PLACEHOLDER — Notifications: turns on push alerts for this browser. Does nothing for now.

// PLACEHOLDER — Notifications: register public/sw.js, ask for notification permission, subscribe with VITE_VAPID_PUBLIC_KEY,
// and save the subscription to the backend (apiFetch from src/api/client.js with auth: true). Return true when push is on.
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

  console.log("Service worker ready:", registration)

  registration.active.postMessage({
    type: "TEST_NOTIFICATION"
  })

  return true
}