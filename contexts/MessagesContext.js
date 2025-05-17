import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'remoteMemoMessages';
const RELAY_SERVER_URL = 'http://192.168.1.227:3000';

const MessagesContext = createContext();
export const useMessages = () => useContext(MessagesContext);

export const MessagesProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('deviceId').then(setDeviceId);
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setMessages(JSON.parse(stored));
    } catch (err) {
      console.error('⚠️ Failed to load messages:', err);
    }
  };

  const saveMessages = async (updatedMessages) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));
    } catch (err) {
      console.error('⚠️ Failed to save messages:', err);
    }
  };

  const addMessage = async (newMessage) => {
    if (!deviceId) return;

    const fullMessage = {
      ...newMessage,
      createdAt: newMessage.createdAt || new Date().toISOString(),
      updatedAt: newMessage.updatedAt || new Date().toISOString(),
      status: newMessage.status || 'not_delivered',
      source: newMessage.source || (newMessage.senderId === deviceId ? 'local' : 'remote'),
      senderId: newMessage.senderId || deviceId,
    };

    const updatedMessages = [...messages, fullMessage];
    setMessages(updatedMessages);
    await saveMessages(updatedMessages); // ✅ now with await
  };

  const updateMessage = async (updatedMessage) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === updatedMessage.id
        ? { ...msg, ...updatedMessage, updatedAt: new Date().toISOString() }
        : msg
    );
    setMessages(updatedMessages);
    await saveMessages(updatedMessages); // ✅
  };

  const updateMessageStatus = async (id, newStatus, peerId = null) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === id
        ? { ...msg, status: newStatus, updatedAt: new Date().toISOString() }
        : msg
    );
    setMessages(updatedMessages);
    await saveMessages(updatedMessages); // ✅
  };

  const deleteMessage = async (id) => {
    const updatedMessages = messages.filter((msg) => msg.id !== id);
    setMessages(updatedMessages);
    await saveMessages(updatedMessages); // ✅
  };

  const clearMessages = async () => {
    setMessages([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const logSyncEvent = async (event) => {
    try {
      const logs = await AsyncStorage.getItem('syncLogs');
      const parsed = logs ? JSON.parse(logs) : [];

      const logItem = {
        ...event,
        localTime: new Date().toLocaleString(),
      };

      const updated = [...parsed, logItem];
      await AsyncStorage.setItem('syncLogs', JSON.stringify(updated));

      console.log(`📗 Sync log [${logItem.localTime}]:`);
      console.log(`➡️  From: ${event.from} → Peer: ${event.peer}`);
      console.log(`📥  Added: ${event.added} | Updated: ${event.updated} | Deleted: ${event.deleted}`);
    } catch (e) {
      console.warn('⚠️ Failed to log sync event:', e);
    }
  };

  useEffect(() => {
    if (!deviceId) return;
    let isActive = true;

    const poll = async () => {
      while (isActive) {
        try {
          const res = await fetch(`${RELAY_SERVER_URL}/subscribe`);
          const msg = await res.json();

          if (msg && msg.id) {
            const isToMe = msg.receiverId === deviceId || msg.senderId === deviceId;
            if (!isToMe) continue;

            setMessages((oldMessages) => {
              const index = oldMessages.findIndex((m) => m.id === msg.id);
              let updatedMessages;

              if (index !== -1) {
                const original = oldMessages[index];
                const isIncoming = msg.receiverId === deviceId;

                const shouldUpdateStatus =
                  isIncoming &&
                  (!original || ['not_delivered', 'pending'].includes(original.status));

                const updated = {
                  ...original,
                  ...msg,
                  status: shouldUpdateStatus ? 'received' : msg.status,
                  updatedAt: new Date().toISOString(),
                  source: original.source || (msg.senderId === deviceId ? 'local' : 'remote'),
                  senderId: original.senderId || msg.senderId,
                };

                updatedMessages = [...oldMessages];
                updatedMessages[index] = updated;
              } else {
                const isIncoming = msg.receiverId === deviceId;
                const incoming = {
                  ...msg,
                  status: isIncoming && ['not_delivered', 'pending'].includes(msg.status)
                    ? 'received'
                    : msg.status,
                  senderId: msg.senderId || 'unknown',
                  source: msg.senderId === deviceId ? 'local' : 'remote',
                  updatedAt: new Date().toISOString(),
                };

                updatedMessages = [...oldMessages, incoming];
              }

              saveMessages(updatedMessages);
              return updatedMessages;
            });
          }
        } catch (err) {
          console.warn('🔁 Waiting for relay server...', err);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    poll();
    return () => { isActive = false; };
  }, [deviceId]);

  return (
    <MessagesContext.Provider
      value={{
        messages,
        addMessage,
        updateMessage,
        updateMessageStatus,
        deleteMessage,
        logSyncEvent,
        clearMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};
