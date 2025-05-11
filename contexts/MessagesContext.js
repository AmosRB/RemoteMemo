// MessagesContext.js - גרסה מתוקנת עם סינון לפי receiverId

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'remoteMemoMessages';
const DEVICE_ID = '123456'; // בעתיד נטען מ־Settings או AsyncStorage
const RELAY_SERVER_URL = 'http://192.168.1.227:3000';

const MessagesContext = createContext();
export const useMessages = () => useContext(MessagesContext);

export const MessagesProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => { loadMessages(); }, []);

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
    let fullMessage = {
      ...newMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'unread',
      source: 'local',
      senderId: DEVICE_ID,
    };

    try {
      const res = await fetch(`${RELAY_SERVER_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullMessage),
      });

      if (res.ok) {
        fullMessage = {
          ...fullMessage,
          status: 'delivered',
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('❌ Failed to send message to relay server:', err);
    }

    const updatedMessages = [...messages, fullMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  const updateMessage = async (updatedMessage) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === updatedMessage.id
        ? { ...msg, ...updatedMessage, updatedAt: new Date().toISOString() }
        : msg
    );
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  const deleteMessage = async (id) => {
    const updatedMessages = messages.filter((msg) => msg.id !== id);
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  useEffect(() => {
    let isActive = true;

    const poll = async () => {
      while (isActive) {
        try {
          const res = await fetch(`${RELAY_SERVER_URL}/subscribe`);
          const msg = await res.json();

          if (msg && msg.id) {
            // 🔒 בדוק האם הודעה מיועדת למכשיר הנוכחי (או הודעת שליחה עצמית)
            const isToMe = msg.receiverId === DEVICE_ID || msg.senderId === DEVICE_ID;
            if (!isToMe) continue;

            setMessages((oldMessages) => {
              const index = oldMessages.findIndex((m) => m.id === msg.id);
              let updatedMessages;

              if (index !== -1) {
                const original = oldMessages[index];
                const updated = {
                  ...original,
                  ...msg,
                  updatedAt: new Date().toISOString(),
                  source: original.source || (msg.senderId === DEVICE_ID ? 'local' : 'remote'),
                  senderId: original.senderId || msg.senderId,
                };
                updatedMessages = [...oldMessages];
                updatedMessages[index] = updated;
              } else {
                const incoming = {
                  ...msg,
                  senderId: msg.senderId || 'unknown',
                  source: msg.senderId === DEVICE_ID ? 'local' : 'remote',
                  updatedAt: new Date().toISOString(),
                };
                updatedMessages = [...oldMessages, incoming];

                if (incoming.source === 'remote') {
                  fetch(`${RELAY_SERVER_URL}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: msg.id,
                      status: 'received',
                      updatedAt: new Date().toISOString(),
                      senderId: DEVICE_ID,
                      source: 'remote',
                    }),
                  }).catch(err => console.warn('⚠️ Failed to send received status:', err));
                }
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
  }, []);

  return (
    <MessagesContext.Provider value={{ messages, addMessage, updateMessage, deleteMessage }}>
      {children}
    </MessagesContext.Provider>
  );
};
