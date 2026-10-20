
import { registerPush } from "../notifications/push";

export default function NotificationTestPage(){
    async function handleClick(){
        const success = await registerPush()
        console.log("Push enabled: ", success)
    }

    return (
        <div style={{ padding: "40px"}}>
            <h1>Notification Test</h1>
            <button onClick={handleClick}>
                Enable Push
            </button>
        </div>
    )
}