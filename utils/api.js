// api.js – Relay Server with Full Logging

const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// לוג כללי לכל בקשה נכנסת
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

const subscribers = [];
const deviceStatusMap = {}; // זיכרון זמני: deviceId → { messageId: status }

// קבלת הודעה והעברתה למאזינים בלבד (לא שומר הודעות)
app.post('/messages', (req, res) => {
  const newMessage = req.body;

  if (!newMessage.id || !newMessage.shortName) {
    return res.status(400).json({ error: 'Missing id or shortName' });
  }

  console.log(`📡 Relay: ${newMessage.shortName}`);
  subscribers.forEach(fn => fn(newMessage));

  res.status(201).json({ message: 'Message relayed' });
});

// מנגנון polling לקבלת הודעות
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

// סנכרון סטטוסים – כל מכשיר שולח סטטוסי הודעות שלו, השרת מחזיר את מה שחסר לו מה-peer
app.post('/sync', (req, res) => {
  const { deviceId, knownStatuses } = req.body;

  console.log(`🔄 /sync called by ${deviceId}`);

  if (!deviceId || !Array.isArray(knownStatuses)) {
    return res.status(400).json({ error: 'Invalid sync payload' });
  }

  console.log(`🔍 Received statuses from ${deviceId}:`, knownStatuses);

  deviceStatusMap[deviceId] = {};
  knownStatuses.forEach(entry => {
    deviceStatusMap[deviceId][entry.id] = entry.status;
  });

  const peerId = Object.keys(deviceStatusMap).find(id => id !== deviceId);
  if (!peerId) {
    console.log(`🤷 No peer found for ${deviceId}`);
    return res.json({ statusUpdates: [] });
  }

  const peerStatuses = deviceStatusMap[peerId];

  const updates = knownStatuses.map(entry => {
    const peerStatus = peerStatuses?.[entry.id];
    return peerStatus && peerStatus !== entry.status
      ? { id: entry.id, status: peerStatus }
      : null;
  }).filter(Boolean);

  console.log(`📤 Returning ${updates.length} updates to ${deviceId}`);
  res.json({ statusUpdates: updates });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Relay server running at http://0.0.0.0:${port}`);
});
