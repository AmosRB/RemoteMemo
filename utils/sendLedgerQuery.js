// sendLedgerQuery.js – שליחת ה־TRUST Ledger ל־peer

export default async function sendLedgerQuery(peerIp, localLedger) {
    try {
      const res = await fetch(`http://${peerIp}:3000/ledger-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ledger: localLedger }),
      });
      if (!res.ok) {
        console.warn('⚠️ שגיאה בשליחת ledger ל-peer');
        return [];
      }
      const data = await res.json();
      return data.ledger;
    } catch (err) {
      console.warn('🔁 שגיאה בשליחת ledger:', err);
      return [];
    }
  }
  