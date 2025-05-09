// MessagesContext.js
import React, { createContext, useState, useContext } from 'react';

const MessagesContext = createContext();

export const MessagesProvider = ({ children }) => {
  const [messages, setMessages] = useState([
    { id: '1', shortName: 'תזכורת א', text: 'תזכורת לשתות מים', date: '2025-05-10', time: '10:00', audioUri: '' },
    { id: '2', shortName: 'תזכורת ב', text: 'לקחת תרופות', date: '2025-05-11', time: '08:00', audioUri: '' },
  ]);

  const updateMessage = (updatedMsg) => {
    setMessages(prev => prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m)));
  };

  const deleteMessage = (id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const addMessage = (newMsg) => {
    setMessages(prev => [...prev, newMsg]);
  };

  return (
    <MessagesContext.Provider value={{ messages, updateMessage, deleteMessage, addMessage }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => useContext(MessagesContext);
