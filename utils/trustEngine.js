// trustEngine.js – ניהול Blockchain + איתור פערים עם פתרון מדויק לפי blockNumber

import * as Crypto from 'expo-crypto';

export async function hashMessage(msg) {
  const base = `${msg.id}|${msg.status}|${msg.text || ''}|${msg.audioBase64 || ''}`;
  console.log('🧮 Hashing:', base);
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base);
}

export async function createBlock(ledger, previousHash = '', blockNumber = 0) {
  const content = JSON.stringify(ledger) + previousHash + blockNumber;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
  return {
    blockNumber,
    ledger,
    previousHash,
    hash,
  };
}

export function verifyBlockchainMatch(myBlocks, peerBlocks) {
  if (!Array.isArray(myBlocks) || !Array.isArray(peerBlocks)) return false;
  if (myBlocks.length === 0 || peerBlocks.length === 0) return false;
  if (myBlocks.length !== peerBlocks.length) return false;

  for (let i = 0; i < myBlocks.length; i++) {
    const my = myBlocks[i];
    const peer = peerBlocks[i];
    if (my.hash !== peer.hash || my.previousHash !== peer.previousHash) return false;
  }
  return true;
}

export function diffLedgers(myLedger, peerLedger) {
  const localMap = Object.fromEntries(myLedger.map((e) => [e.id, e]));
  const peerMap = Object.fromEntries(peerLedger.map((e) => [e.id, e]));

  const missingMessages = [];
  const mismatchedStatuses = [];
  const mismatchedHashes = [];

  for (let id in peerMap) {
    if (!localMap[id]) {
      missingMessages.push(id);
    } else {
      const local = localMap[id];
      const remote = peerMap[id];
      if (local.status !== remote.status) {
        mismatchedStatuses.push({ id, local: local.status, remote: remote.status });
      }
      if (local.hash !== remote.hash) {
        mismatchedHashes.push({ id, local: local.hash, remote: remote.hash });
      }
    }
  }

  for (let id in localMap) {
    if (!peerMap[id]) {
      missingMessages.push(id);
    }
  }

  return {
    missingMessages: [...new Set(missingMessages)],
    mismatchedStatuses,
    mismatchedHashes,
  };
}