// MessagesContext.js - גרסה מתוקנת עם טעינת deviceId דינמית

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

    let fullMessage = {
      ...newMessage,
      createdAt: newMessage.createdAt || new Date().toISOString(),
      updatedAt: newMessage.updatedAt || new Date().toISOString(),
      status: newMessage.status || 'unread',
      source: newMessage.source || (newMessage.senderId === deviceId ? 'local' : 'remote'),
      senderId: newMessage.senderId || deviceId,
    };

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
                const updated = {
                  ...original,
                  ...msg,
                  updatedAt: new Date().toISOString(),
                  source: original.source || (msg.senderId === deviceId ? 'local' : 'remote'),
                  senderId: original.senderId || msg.senderId,
                };
                updatedMessages = [...oldMessages];
                updatedMessages[index] = updated;
              } else {
                const incoming = {
                  ...msg,
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
    <MessagesContext.Provider value={{ messages, addMessage, updateMessage, deleteMessage }}>
      {children}
    </MessagesContext.Provider>
  );
};
