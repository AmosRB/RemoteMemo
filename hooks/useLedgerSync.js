// useLedgerSync.js – כולל שימוש ב-updateMessageStatus במקום updateMessage

import { useEffect, useState } from 'react';
import { useMessages } from '../contexts/MessagesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashMessage as generateHash, createBlock, verifyBlockchainMatch, diffLedgers } from '../utils/trustEngine';

export default function useLedgerSync(peerId, sendLedgerQuery, requestMissingMessage, setSyncStatus) {
  const { messages, addMessage, updateMessageStatus, logSyncEvent } = useMessages();
  const [failedAttempts, setFailedAttempts] = useState(0);

  const buildLocalLedger = async (messageList) => {
    const ledger = await Promise.all(
      messageList
        .filter((msg) => msg.id)
        .map(async (msg) => ({
          id: msg.id,
          status: msg.status,
          hash: await generateHash(msg),
        }))
    );
    return ledger;
  };

  const saveBlockToStorage = async (block) => {
    try {
      const stored = await AsyncStorage.getItem('trustBlocks');
      const existing = stored ? JSON.parse(stored) : [];
      const last = existing[existing.length - 1];
      if (last && last.hash === block.hash) {
        console.log('🟡 Duplicate block hash – skipping save');
        return;
      }
      const updated = [...existing, block];
      await AsyncStorage.setItem('trustBlocks', JSON.stringify(updated));
      console.log('✅ Block saved with hash:', block.hash);
    } catch (err) {
      console.warn('⚠️ Failed to save block:', err);
    }
  };

  const loadLocalBlocks = async () => {
    try {
      const stored = await AsyncStorage.getItem('trustBlocks');
      const retention = await AsyncStorage.getItem('messageExpiryHours');
      const hours = parseInt(retention || '24');
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      const blocks = stored ? JSON.parse(stored) : [];
      return blocks.filter(b => new Date(b.timestamp).getTime() > cutoff);
    } catch (err) {
      return [];
    }
  };

  const syncLedgers = async () => {
    if (!peerId) return;
    setSyncStatus('syncing');

    const currentMessages = [...messages];
    const localLedger = await buildLocalLedger(currentMessages);
    const myBlocks = await loadLocalBlocks();
    const previousHash = myBlocks.length > 0 ? myBlocks[myBlocks.length - 1].hash : '';
    const newBlock = await createBlock(localLedger, previousHash);
    await saveBlockToStorage(newBlock);

    try {
      const peerLedger = await sendLedgerQuery(peerId, localLedger);
      if (!peerLedger || !Array.isArray(peerLedger) || peerLedger.length === 0) {
        console.warn('⚠️ Invalid or empty peerLedger');
        setFailedAttempts((prev) => {
          const next = prev + 1;
          if (next >= 3) setSyncStatus('idle');
          return next;
        });
        return;
      }

      setFailedAttempts(0);

      const diff = diffLedgers(localLedger, peerLedger);

      for (let id of diff.missingMessages) {
        const msg = await requestMissingMessage(peerId, id);
        if (msg) await addMessage(msg);
      }

      for (let entry of diff.mismatchedStatuses) {
        await updateMessageStatus(entry.id, entry.remote, peerId);
      }

      await logSyncEvent({
        timestamp: new Date().toISOString(),
        from: 'me',
        peer: peerId,
        added: diff.missingMessages.length,
        updated: diff.mismatchedStatuses.length + diff.mismatchedHashes.length,
        deleted: 0,
      });

      const peerBlocks = await loadLocalBlocks();
      const isVerified = verifyBlockchainMatch([...myBlocks, newBlock], peerBlocks);

      if (isVerified) {
        console.log('🟢 Blockchain match verified – GREEN light');
        setSyncStatus('ok');
      } else {
        console.warn('❌ Blockchain mismatch – RED light');
        setSyncStatus('idle');
      }

    } catch (err) {
      console.warn('Ledger sync failed:', err);
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) setSyncStatus('idle');
        return next;
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(syncLedgers, 5000);
    return () => clearInterval(interval);
  }, [messages.length, peerId]);

  return { syncLedgers };
}