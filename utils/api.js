// api.js – Relay Server with Sync Simulation + peerFound

const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const subscribers = [];
const deviceStatusMap = {}; // deviceId → { messageId: status }

// שליחת הודעה
app.post('/messages', (req, res) => {
  const newMessage = req.body;

  if (!newMessage.id || !newMessage.shortName) {
    return res.status(400).json({ error: 'Missing id or shortName' });
  }

  console.log(`📡 Relay: ${newMessage.shortName}`);
  subscribers.forEach(fn => fn(newMessage));

  res.status(201).json({ message: 'Message relayed' });
});

// Polling
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

// Sync Logic
app.post('/sync', (req, res) => {
  const { deviceId, knownStatuses } = req.body;

  if (!deviceId || !Array.isArray(knownStatuses)) {
    return res.status(400).json({ error: 'Invalid sync payload' });
  }

  // עדכן מצב של המכשיר
  deviceStatusMap[deviceId] = {};
  knownStatuses.forEach(entry => {
    deviceStatusMap[deviceId][entry.id] = entry.status;
  });

  // חפש peer
  const peerId = Object.keys(deviceStatusMap).find(id => id !== deviceId);
  if (!peerId) {
    console.log(`🤷 No peer found for ${deviceId}`);
    return res.json({ statusUpdates: [], peerFound: false });
  }

  const peerStatuses = deviceStatusMap[peerId];
  const updates = knownStatuses.map(entry => {
    const peerStatus = peerStatuses?.[entry.id];
    return peerStatus && peerStatus !== entry.status
      ? { id: entry.id, status: peerStatus }
      : null;
  }).filter(Boolean);

  res.json({ statusUpdates: updates, peerFound: true });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Relay server running at http://0.0.0.0:${port}`);
});
