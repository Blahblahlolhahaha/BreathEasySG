import {
  registerPush,
  sendTestPush
} from "../notifications/push";

export default function NotificationTestPage() {

  async function handleEnablePush() {
    const success = await registerPush();
    console.log("Push enabled:", success);
  }

  async function handleSendTest() {
    try {
      const result = await sendTestPush();
      console.log("Test push result:", result);
    } catch (error) {
      console.error("Test push failed:", error);
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Notification Test</h1>

      <button onClick={handleEnablePush}>
        Enable Push
      </button>

      <button
        onClick={handleSendTest}
        style={{ marginLeft: "10px" }}
      >
        Send Test Push
      </button>
    </div>
  );
}