<<<<<<< HEAD
=======

>>>>>>> efa94ed9cd02d467d4791f4fec8fadbfe1ab6377
# Remote Memo CONNECT

Remote Memo CONNECT is a mobile-first reminder app designed for individuals with memory challenges. It allows family members and caregivers to send time-triggered text or audio messages that are automatically played on the recipient's device.

## 🎯 Purpose
Secure and simple delivery of reminders via peer-to-peer messaging with integrated blockchain-based synchronization and trust verification.

## 📱 Supported Platforms
- Android 9.0+
- iOS 12.0+
- Web (for simulation/dev purposes)

## 👥 Target Audience
- People with memory difficulties
- Family members or caregivers

## 🧩 Key Features
- Voice/text message creation
- Scheduled notifications
- Local saving + sync log
- Peer-to-peer delivery via Relay Server (Wi-Fi based)
- Blockchain-based verification of message state and integrity

## 📊 Message Status Flow
Supported statuses:
`unread`, `pending`, `delivered`, `received`, `played`, `read`, `alert triggered`, `alert receipt confirmed`, `deleted_by_peer`

## 🔄 Application Sync Layer
Two engines ensure full sync:
1. `useSyncEngine`: Syncs status updates every 4s.
2. `useLedgerSync`: Full blockchain comparison every 5s with trust verification.

## 🔐 Trust Ledger
- Every message is hashed and chained to previous messages.
- Blocks are committed only when both devices match history.

## 📁 Message Object Format
```ts
{
  id: string,
  shortName: string,
  senderId: string,
  receiverId: string,
  date: string,
  time: string,
  text: string,
  audioBase64?: string,
  status: 'unread' | 'pending' | 'delivered' | 'received' | 'played' | 'read' | 'alert triggered' | 'alert receipt confirmed' | 'deleted_by_peer',
  played: boolean,
  source: 'local' | 'remote',
  createdAt: string,
  updatedAt: string,
  hash: string,
  signature?: string
}
```

## 🧪 QA & Testing
- Hash consistency
- Trust log accuracy
- Notification playback
