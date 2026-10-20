// PLACEHOLDER — Notifications: background script that shows push alerts when the app is closed. Empty for now.

self.addEventListener("push", (event) => {
  console.log("PUSH RECEIVED:", event)

  const data = event.data
    ? event.data.json()
    : {}

  event.waitUntil(
    self.registration.showNotification(
      data.title || "BreatheEasy SG",
      {
        body: data.body || "Air quality alert"
      }
    )
  )
})
