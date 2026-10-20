require("dotenv").config({ path: ".env.local" })

const webpush = require("web-push")

const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VITE_VAPID_PRIVATE_KEY

webpush.setVapidDetails(
  "mailto:test@example.com",
  vapidPublicKey,
  vapidPrivateKey
)

const subscription = {
  endpoint: process.env.PUSH_ENDPOINT,
  keys: {
    p256dh: process.env.PUSH_P256DH,
    auth: process.env.PUSH_AUTH
  }
}

const payload = JSON.stringify({
  title: "BreatheEasy SG",
  body: "Real Web Push is working!"
})

webpush
  .sendNotification(subscription, payload)
  .then(() => {
    console.log("Push sent successfully!")
  })
  .catch((error) => {
    console.error("Push failed:", error)
  })