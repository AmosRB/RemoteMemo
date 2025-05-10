import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'remoteMemoMessages';
const MessagesContext = createContext();

export const useMessages = () => useContext(MessagesContext);

export const MessagesProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const saveMessages = async (updatedMessages) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));
    } catch (err) {
      console.error('Failed to save messages:', err);
    }
  };

  const addMessage = (newMessage) => {
    const fullMessage = {
      ...newMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedMessages = [...messages, fullMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  const updateMessage = (updatedMessage) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === updatedMessage.id
        ? { ...msg, ...updatedMessage, updatedAt: new Date().toISOString() }
        : msg
    );
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  const deleteMessage = (id) => {
    const updatedMessages = messages.filter((msg) => msg.id !== id);
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  return (
    <MessagesContext.Provider value={{ messages, addMessage, updateMessage, deleteMessage }}>
      {children}
    </MessagesContext.Provider>
  );
};
