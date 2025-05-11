// sendSyncQuery.js - שליחת בקשת סנכרון למכשיר עמית

export default async function sendSyncQuery(peerIp, syncPayload) {
    try {
      const response = await fetch(`http://${peerIp}:3000/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      });
  
      if (!response.ok) throw new Error('Network response was not ok');
  
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('🔁 Failed to send sync query:', err);
      return null;
    }
  }

  