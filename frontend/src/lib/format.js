// Formats times in Singapore time.
const SGT = 'Asia/Singapore'

/** "4:00 PM" in Singapore time. */
export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', timeZone: SGT })

/** "4 PM" in Singapore time, for chart axes. */
export const formatHour = (iso) => new Date(iso).toLocaleTimeString('en-SG', { hour: 'numeric', timeZone: SGT })
