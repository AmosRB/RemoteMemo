// api.js – Relay Server לשידור בלוקים בין Peers (P2P בלבד, ללא שמירה)

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

let subscribers = [];

app.get('/subscribe', (req, res) => {
  req.socket.setTimeout(0);
  res.setHeader('Content-Type', 'application/json');
  subscribers.push((data) => res.json(data));
});

app.post('/messages', (req, res) => {
  const { body } = req;
  if (!body || !body.id) {
    return res.status(400).json({ error: 'Missing message data' });
  }

  subscribers.forEach(fn => fn(body)); // משדר את ההודעה לכל המאזינים
  subscribers = [];

  res.status(201).json({ message: 'Message relayed to peer' });
});


app.post('/ledger', (req, res) => {
  const { block, senderId } = req.body;
  if (!block) {
    return res.status(400).json({ error: 'Missing block' });
  }

  subscribers.forEach(fn => fn({ type: 'ledger', block, senderId }));
  subscribers = [];

  res.status(201).json({ message: 'Block relayed to peer' });
});

app.listen(PORT, () => {
  console.log(`🚀 Relay server listening on port ${PORT}`);
});