// useLedgerSync.js – כולל לוגים מובנים לכל שלב

import { useEffect, useState } from 'react';
import { useMessages } from '../contexts/MessagesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hashMessage as generateHash,
  createBlock,
  verifyBlockchainMatch,
  diffLedgers
} from '../utils/trustEngine';

export default function useLedgerSync(peerId, sendLedgerQuery, requestMissingMessage, setSyncStatus) {
  const { messages, addMessage, updateMessageStatus, logSyncEvent, forceSync } = useMessages();
  const [failedAttempts, setFailedAttempts] = useState(0);

  const buildLocalLedger = async (messageList) => {
    console.log('📄 Building local ledger...');
    const ledger = await Promise.all(
      messageList
        .filter((msg) => msg.id)
        .map(async (msg) => ({
          id: msg.id,
          status: msg.status,
          hash: await generateHash(msg),
        }))
    );
    console.log('📄 Local ledger built:', ledger);
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
      const recentBlocks = blocks.filter(b => new Date(b.timestamp).getTime() > cutoff);
      console.log('📦 Loaded local blocks:', recentBlocks);
      return recentBlocks;
    } catch (err) {
      console.warn('⚠️ Failed to load local blocks:', err);
      return [];
    }
  };

  const syncLedgers = async () => {
    if (!peerId) return;
    setSyncStatus('syncing');

    const currentMessages = [...messages];
    const localLedger = await buildLocalLedger(currentMessages);
    const myBlocks = await loadLocalBlocks();
    const previousHash = myBlocks.length > 0 ? myBlocks[myBlocks.length - 1].hash : '0';

    console.log('🔗 Creating block with previousHash:', previousHash);
    const newBlock = await createBlock(localLedger, previousHash);
    console.log('🧱 New block created:', newBlock);

    await saveBlockToStorage(newBlock);

    try {
      console.log('📡 Sending ledger to peer...');
      const peerLedger = await sendLedgerQuery(peerId, localLedger);
      console.log('📬 Received peerLedger:', peerLedger);

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
        if (msg) {
          console.log('📥 Retrieved missing message:', msg.id);
          await addMessage(msg);
        }
      }

      for (let entry of diff.mismatchedStatuses) {
        console.log(`🔄 Updating mismatched status: ${entry.id} → ${entry.remote}`);
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
      console.log('🧾 Verifying blockchain match...');
      const isVerified = verifyBlockchainMatch([...myBlocks, newBlock], peerBlocks);

      if (isVerified) {
        console.log('🟢 Blockchain match verified – GREEN light');
        setSyncStatus('ok');
      } else {
        console.warn('❌ Blockchain mismatch – attempting forceSync...');
        setSyncStatus('idle');
        if (typeof forceSync === 'function') {
          await forceSync({ reason: 'block mismatch' });
        }
      }

    } catch (err) {
      console.warn('❌ Ledger sync failed:', err);
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
