const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let messages = [];
const subscribers = [];

// קבלת כל ההודעות
app.get('/messages', (req, res) => {
  res.json(messages);
});

// הוספת או עדכון הודעה
app.post('/messages', (req, res) => {
  const newMessage = req.body;

  if (!newMessage.id || !newMessage.shortName) {
    return res.status(400).json({ error: 'Missing id or shortName' });
  }

  // אם כבר קיימת הודעה עם אותו ID – עדכן אותה
  const index = messages.findIndex(msg => msg.id === newMessage.id);
  if (index !== -1) {
    messages[index] = { ...messages[index], ...newMessage };
    console.log(`🔄 Message updated: ${newMessage.shortName}`);
  } else {
    messages.push(newMessage);
    console.log(`✅ Message added: ${newMessage.shortName}`);
  }

  // שלח למאזינים (הטלפונים שמאזינים)
  subscribers.forEach(fn => fn(newMessage));

  res.status(201).json({ message: 'Message processed' });
});

// עדכון הודעה ע"י מזהה
app.put('/messages/:id', (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;

  const index = messages.findIndex(msg => msg.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Message not found' });
  }

  messages[index] = { ...messages[index], ...updatedFields };
  console.log(`✏️ Message updated: ${id}`);
  res.json({ message: 'Message updated' });
});

// הרשמת מאזין להודעות חדשות
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
