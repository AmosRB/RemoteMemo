// api.js – Relay Server טהור לדימוי P2P בלבד (ללא שמירה)

const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const subscribers = []; // כל לקוח מחובר

// שליחת הודעה – שידור מיידי בלבד, אין שמירה
app.post('/messages', (req, res) => {
  const msg = req.body;

  if (!msg.id || !msg.shortName) {
    return res.status(400).json({ error: 'Missing id or shortName' });
  }

  console.log(`📡 Relay → ${msg.shortName}`);
  subscribers.forEach(fn => fn(msg));

  res.status(201).json({ message: 'Relayed to peers' });
});

// subscribe – מאפשר ללקוח לקבל הודעות חדשות
app.get('/subscribe', (req, res) => {
  let sent = false;

  const send = (msg) => {
    if (!sent) {
      sent = true;
      res.json(msg);
    }
  };

  subscribers.push(send);
  setTimeout(() => {
    const index = subscribers.indexOf(send);
    if (index !== -1) subscribers.splice(index, 1);
    send(null);
  }, 30000);
});

// sync – לא מדמה סטטוסים (כי אין state), רק מאשר peer
app.post('/sync', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  res.json({ statusUpdates: [], peerFound: true }); // תמיד מחזיר peerFound חיובי
});

// ledger-sync – אין אחסון בצד שרת, מחזיר תמיד רשימה ריקה
app.post('/ledger-sync', (req, res) => {
  res.json({ ledger: [] });
});

// message/:id – אין שמירת הודעות, מחזיר 404 תמיד
app.get('/message/:id', (req, res) => {
  res.status(404).json({ error: 'Message not stored on server' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 P2P Relay server running at http://0.0.0.0:${port}`);
});