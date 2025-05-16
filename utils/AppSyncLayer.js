// AppSyncLayer.js
import { hashMessage } from '../utils/trustEngine';
import sendSyncQuery from '../utils/sendSyncQuery';

// קבל את ה־context (messages וכו') מבחוץ, לא מתוך useMessages
export default function createAppSyncLayer(ctx, peerIp, deviceId) {
  const { messages, updateMessage, logSyncEvent } = ctx;

  const updateMessageWithHash = async (msg, newStatus) => {
    const updated = {
      ...msg,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    updated.hash = await hashMessage(updated);
    await updateMessage(updated);
    console.log(`✅ סטטוס עודכן ל-${newStatus} עם hash חדש: ${updated.id}`);
    return updated.id;
  };

  const syncWithPeer = async (options = {}) => {
    const isForced = options?.force || false;
    const reason = options?.reason || 'regular';
    if (!peerIp || !deviceId) return { success: false, updatedMessages: [] };

    // 🔁 שליחה מחדש של הודעות not_delivered אם הנמען קיים
    const notDeliveredToSend = messages.filter(
      m => m.status === 'not_delivered' && m.senderId === deviceId && m.receiverId
    );

    for (const msg of notDeliveredToSend) {
      try {
        const res = await fetch(`http://${peerIp}:3000/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
        });
        console.log(`📡 שליחה חוזרת של not_delivered: ${msg.id} → סטטוס ${res.status}`);
      } catch (err) {
        console.warn(`🔁 שליחה חוזרת נכשלה עבור ${msg.id}:`, err);
      }
    }

    const knownStatuses = messages
      .filter((msg) => msg.senderId === deviceId || msg.receiverId === deviceId)
      .map((m) => ({ id: m.id, status: m.status }));

    try {
      const response = await sendSyncQuery(peerIp, { deviceId, knownStatuses });

      if (!response || !Array.isArray(response.statusUpdates)) {
        console.warn('🔴 תגובת sync לא תקינה מה-peer');
        return { success: false, updatedMessages: [] };
      }

      const updatedMessages = [];

      for (const incoming of response.statusUpdates) {
        const local = messages.find((m) => m.id === incoming.id);
        if (!local) continue;

        const shouldUpdate = isForced || local.status !== incoming.status;
        if (shouldUpdate) {
          const id = await updateMessageWithHash(local, incoming.status);
          updatedMessages.push(id);
        }
      }

      if (updatedMessages.length > 0) {
        await logSyncEvent({
          timestamp: new Date().toISOString(),
          from: 'AppSync',
          peer: peerIp,
          updated: updatedMessages.length,
          added: 0,
          deleted: 0,
          reason,
        });
      }

      return { success: true, updatedMessages };

    } catch (err) {
      console.warn('🔁 שגיאה בסנכרון:', err);
      return { success: false, updatedMessages: [] };
    }
  };

  const forceSync = async (metadata = {}) => {
    console.log('🚨 סנכרון כפוי הופעל ע"י TRUST');
    return await syncWithPeer({ force: true, reason: metadata.reason || 'forced by TRUST' });
  };

  return {
    syncWithPeer,
    forceSync,
    updateMessageWithHash,
  };
}
