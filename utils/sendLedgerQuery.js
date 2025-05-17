// sendLedgerQuery.js – שליחת בלוק אחרון בלבד לקבלת התאמה מה-peer
import AsyncStorage from '@react-native-async-storage/async-storage';

export default async function sendLedgerQuery(peerIp, localLedger) {
  try {
    const stored = await AsyncStorage.getItem('trustBlocks');
    const blocks = stored ? JSON.parse(stored) : [];
    const lastBlock = blocks[blocks.length - 1];

    const res = await fetch(`http://${peerIp}:3000/ledger-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block: lastBlock }),
    });

    if (!res.ok) {
      console.warn('⚠️ שגיאה בשליחת block ל-peer');
      return [];
    }

    const data = await res.json();
    return data.block; // peer מחזיר בלוק אחרון שלו
  } catch (err) {
    console.warn('🔁 שגיאה בשליחת block:', err);
    return [];
  }
}
