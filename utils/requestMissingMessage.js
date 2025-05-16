// requestMissingMessage.js – בקשת הודעה חסרה מ־peer

export default async function requestMissingMessage(peerIp, messageId) {
    try {
      const res = await fetch(`http://${peerIp}:3000/message/${messageId}`);
      if (!res.ok) {
        console.warn(`⚠️ peer לא החזיר את ההודעה ${messageId}`);
        return null;
      }
      const msg = await res.json();
      return msg;
    } catch (err) {
      console.warn('🔁 שגיאה בבקשת הודעה חסרה:', err);
      return null;
    }
  }
  