// useSyncEngine.js - מנוע סנכרון הודעות לפי סטטוסים

import { useEffect, useState } from 'react';
import { useMessages } from '../contexts/MessagesContext';

const DEVICE_ID = '123456';

export default function useSyncEngine(peerId, sendSyncQuery) {
  const { messages, updateMessage } = useMessages();
  const [isSynced, setIsSynced] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!peerId) return;

      const outgoingMessages = messages.filter(
        (msg) => msg.senderId === DEVICE_ID
      );

      const syncPayload = {
        deviceId: DEVICE_ID,
        knownStatuses: outgoingMessages.map((m) => ({ id: m.id, status: m.status })),
      };

      sendSyncQuery(peerId, syncPayload)
        .then((response) => {
          if (!response) return;

          let updated = false;

          response.statusUpdates?.forEach((incomingStatus) => {
            const localMsg = messages.find((m) => m.id === incomingStatus.id);
            if (localMsg && localMsg.status !== incomingStatus.status) {
              updateMessage({ ...localMsg, status: incomingStatus.status });
              updated = true;
            }
          });

          setIsSynced(!updated);
        })
        .catch((err) => {
          console.warn('🔁 Sync error:', err);
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [messages, peerId]);

  return { isSynced };
}
