import { useEffect, useState } from 'react';
import { useMessages } from '../contexts/MessagesContext';

export default function useSyncEngine(peerIp, sendSyncQuery, deviceId) {
  const { messages, updateMessage } = useMessages();
  const [isSynced, setIsSynced] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!peerIp || !deviceId) return;

      // שולח את כל הסטטוסים של הודעות ששלח או קיבל
      const knownStatuses = messages
        .filter((msg) => msg.senderId === deviceId || msg.receiverId === deviceId)
        .map((m) => ({ id: m.id, status: m.status }));

      const syncPayload = { deviceId, knownStatuses };

      console.log('📤 Sending sync to peer:', peerIp);
      console.log('📦 Known statuses:', knownStatuses);

      sendSyncQuery(peerIp, syncPayload)
        .then((response) => {
          if (!response || typeof response !== 'object' || !Array.isArray(response.statusUpdates)) {
            console.warn('🔴 תגובה לא תקינה מה-peer');
            setIsSynced(false);
            return;
          }

          if (response.peerFound === false) {
            console.warn('🔴 peer לא מחובר – sync נכשל');
            setIsSynced(false);
            return;
          }

          console.log('📨 Received statusUpdates:', response.statusUpdates);

          let updated = false;

          response.statusUpdates.forEach((incomingStatus) => {
            const localMsg = messages.find((m) => m.id === incomingStatus.id);
            if (localMsg && localMsg.status !== incomingStatus.status) {
              console.log(`✅ Updating message ${localMsg.id} from ${localMsg.status} → ${incomingStatus.status}`);
              updateMessage({
                ...localMsg,
                status: incomingStatus.status,
                updatedAt: new Date().toISOString(),
              });
              updated = true;
            }
          });

          setIsSynced(!updated);
        })
        .catch((err) => {
          console.warn('🔁 שגיאה בשליחת sync:', err);
          setIsSynced(false);
        });
    }, 4000); // מריץ כל 4 שניות

    return () => clearInterval(interval);
  }, [messages, peerIp, deviceId]);

  return { isSynced };
}
