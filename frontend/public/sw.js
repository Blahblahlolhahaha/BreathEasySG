// PLACEHOLDER — Notifications: background script that shows push alerts when the app is closed. Empty for now.

self.addEventListener("message", (event) => {
  console.log("SW RECEIVED MESSAGE:", event.data)

  if (event.data?.type === "TEST_NOTIFICATION") {
    event.waitUntil(
      self.registration.showNotification("BreatheEasy SG", {
        body: "Service worker notifications are working!"
      })
    )
  }
})

// basically sw receives 'message' event, then show notification. 