import { useMessages } from '../contexts/MessagesContext';

// פונקציה מקומית שמדמה קבלת sync מה-peer
export default async function sendSyncQuery(peerIp, syncPayload) {
  try {
    const res = await fetch(`http://${peerIp}:3000/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    });

    if (!res.ok) {
      console.warn('🔴 sync request failed with status', res.status);
      return { peerFound: false, statusUpdates: [] };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('🔁 sync request error:', err);
    return { peerFound: false, statusUpdates: [] };
  }
}
