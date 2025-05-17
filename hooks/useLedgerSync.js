import { useEffect, useState } from 'react';
import { useMessages } from '../contexts/MessagesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashMessage as generateHash, createBlock } from '../utils/trustEngine';
import sendLedgerQuery from '../utils/sendLedgerQuery';
import createAppSyncLayer from '../utils/AppSyncLayer';

let notifyNewBlock = () => {};
export const onNewBlock = (callback) => {
  notifyNewBlock = callback;
};

export default function useLedgerSync(peerId, sendLedgerQueryUnused, requestMissingMessage, setSyncStatus) {
  const { messages, addMessage, updateMessageStatus, logSyncEvent, updateMessage } = useMessages();
  const [deviceId, setDeviceId] = useState(null);
  const [relayIp, setRelayIp] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('deviceId').then((val) => val && setDeviceId(val));
    AsyncStorage.getItem('relayIp').then((ip) => setRelayIp(ip || '192.168.1.228'));
  }, []);

  const buildLocalLedger = async (messageList) => {
    return await Promise.all(
      messageList.filter((msg) => msg.id).map(async (msg) => ({
        id: msg.id,
        status: msg.status,
        hash: await generateHash(msg),
      }))
    );
  };

  const saveBlockToStorage = async (block) => {
    try {
      const stored = await AsyncStorage.getItem('trustBlocks');
      const existing = stored ? JSON.parse(stored) : [];
      const last = existing[existing.length - 1];
      if (last && last.hash === block.hash) return;
      const updated = [...existing, block];
      await AsyncStorage.setItem('trustBlocks', JSON.stringify(updated));
      console.log('✅ Block saved with hash:', block.hash);
      notifyNewBlock();
    } catch (err) {
      console.warn('⚠️ Failed to save block:', err);
    }
  };

  const loadLocalBlocks = async () => {
    try {
      const stored = await AsyncStorage.getItem('trustBlocks');
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      return [];
    }
  };

  const overwriteLedgerFromPeer = async (peerBlock) => {
    try {
      await AsyncStorage.setItem('trustBlocks', JSON.stringify([peerBlock]));
      notifyNewBlock();
      setSyncStatus('ok');
      console.log('🧩 Ledger המקומי הוחלף בזה של peer (hard override)');
    } catch (err) {
      console.warn('❌ נכשל בשמירת Ledger מה-peer:', err);
    }
  };

  const handleIncomingBlock = async (incomingBlock, peerId) => {
    const localBlocks = await loadLocalBlocks();
    const last = localBlocks.at(-1);

    if (!last || incomingBlock.previousHash === last.hash) {
      await saveBlockToStorage(incomingBlock);
      setSyncStatus('ok');
      await logSyncEvent({
        timestamp: new Date().toISOString(),
        from: peerId,
        peer: 'me',
        added: incomingBlock.ledger.length,
        updated: 0,
        deleted: 0,
        reason: 'block appended by hash match',
      });
    } else {
      console.warn('⚠️ Block mismatch – hash chain broken');
      setSyncStatus('idle');
    }
  };

  const sendLedgerToPeer = async () => {
    try {
      const ledger = await buildLocalLedger(messages);
      const stored = await AsyncStorage.getItem('trustBlocks');
      const blocks = stored ? JSON.parse(stored) : [];
      const lastBlock = blocks[blocks.length - 1];
      const newNumber = (lastBlock?.blockNumber ?? -1) + 1;
      const newBlock = await createBlock(ledger, lastBlock?.hash || '', newNumber);

      const peerBlock = await sendLedgerQuery(peerId, ledger);
      const localHash = newBlock.hash;
      const localNumber = newBlock.blockNumber ?? 0;
      const peerNumber = peerBlock?.blockNumber ?? 0;

      if (peerBlock && peerBlock.hash === localHash) {
        await saveBlockToStorage(newBlock);
        console.log('🔗 אישור הדדי – בלוק נחתם');
        setSyncStatus('ok');
      } else if (peerBlock && peerNumber > localNumber) {
        await overwriteLedgerFromPeer(peerBlock);

        // ✅ לאחר החלפת ה־Ledger — לבצע סנכרון סטטוסים כדי לתקן את ההודעות:
        const appSync = createAppSyncLayer({ messages, updateMessage, logSyncEvent }, peerId, deviceId);
        await appSync.forceSync({ reason: 'peer has newer block' });
        console.log('🔁 בוצע תיקון סטטוסים ע"י AppSync לאחר override');

      } else {
        console.warn('🛑 אין אישור מ-peer – בלוק לא נשמר');
        setSyncStatus('idle');
      }

      const res = await fetch(`http://${relayIp}:3000/ledger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ type: 'ledger', senderId: deviceId, block: newBlock }),
      });

      if (!res.ok) {
        console.warn('❌ שליחת ledger נכשלה, סטטוס:', res.status);
      } else {
        console.log('📤 בלוק נשלח ל־peer');
      }
    } catch (err) {
      console.warn('🔁 שגיאה בשליחת ledger ל־peer:', err);
    }
  };

  useEffect(() => {
    let active = true;

    const pollLedger = async () => {
      while (active) {
        try {
          const res = await fetch(`http://${relayIp}:3000/subscribe`);
          const msg = await res.json();

          if (msg?.type === 'ledger' && msg.block) {
            await handleIncomingBlock(msg.block, msg.senderId || 'unknown');
          }
        } catch (err) {
          console.warn('📭 שגיאה בקבלת ledger מ־peer:', err);
        }

        await new Promise((res) => setTimeout(res, 2000));
      }
    };

    if (relayIp) pollLedger();
    return () => {
      active = false;
    };
  }, [relayIp]);

  useEffect(() => {
    if (!peerId) return;
    const interval = setInterval(() => {
      sendLedgerToPeer();
    }, 5000);
    return () => clearInterval(interval);
  }, [peerId]);

  return { sendLedgerToPeer };
}
