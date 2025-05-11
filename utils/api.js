const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let messages = [];
const subscribers = [];

// קבלת כל ההודעות (רשות)
app.get('/messages', (req, res) => {
  res.json(messages);
});

// שליחת או עדכון הודעה
app.post('/messages', (req, res) => {
  const newMessage = req.body;

  if (!newMessage.id || !newMessage.shortName) {
    return res.status(400).json({ error: 'Missing id or shortName' });
  }

  const index = messages.findIndex(msg => msg.id === newMessage.id);

  if (index !== -1) {
    const original = messages[index];
    messages[index] = {
      ...original,
      ...newMessage,
      source: original.source || 'local', // ✅ לא לדרוס
    };
    console.log(`🔄 Message updated: ${newMessage.shortName}`);
  } else {
    messages.push(newMessage);
    console.log(`✅ Message added: ${newMessage.shortName}`);
  }

  subscribers.forEach(fn => fn(newMessage));

  res.status(201).json({ message: 'Message processed' });
});

// הרשמת מאזין (polling)
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

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Relay server running at http://0.0.0.0:${port}`);
});
