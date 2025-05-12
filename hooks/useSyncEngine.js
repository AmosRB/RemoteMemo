import { useEffect, useState } from 'react';
import { useMessages } from '../contexts/MessagesContext';

export default function useSyncEngine(peerId, sendSyncQuery, deviceId) {
  const { messages, updateMessage } = useMessages();
  const [isSynced, setIsSynced] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!peerId || !deviceId) return;

      const outgoingMessages = messages.filter((msg) => msg.senderId === deviceId);

      const syncPayload = {
        deviceId,
        knownStatuses: outgoingMessages.map((m) => ({ id: m.id, status: m.status })),
      };

      sendSyncQuery(peerId, syncPayload)
        .then((response) => {
          if (!response || !response.statusUpdates) {
            setIsSynced(false);
            return;
          }

          let updated = false;

          response.statusUpdates.forEach((incomingStatus) => {
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
          setIsSynced(false);
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [messages, peerId, deviceId]);

  return { isSynced };
}
