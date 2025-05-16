// JournalScreen.js – כולל הדגשת הודעות שנמחקו ע"י peer

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashMessage } from '../utils/trustEngine';

export default function JournalScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem('remoteMemoMessages');
        if (stored) {
          const parsed = JSON.parse(stored).filter((msg) => msg.status !== 'deleted_by_peer');
          const enriched = await Promise.all(parsed.map(async (msg) => ({
            ...msg,
            trustHash: await hashMessage(msg),
          })));
          setMessages(enriched);
        }
      } catch (err) {
        console.warn('⚠️ Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, []);

  const renderItem = ({ item }) => (
    <View style={[styles.logItem, item.status === 'deleted_by_peer' && styles.deleted]}>
      <Text style={styles.title}>📨 {item.shortName || '(ללא שם)'}</Text>
      <Text style={styles.details}>🕒 נוצר: {formatDate(item.createdAt)}</Text>
      <Text style={styles.details}>📤 נשלח: {formatDate(item.updatedAt)}</Text>
      <Text style={[styles.details, item.status === 'deleted_by_peer' && styles.deletedText]}>
        📌 סטטוס: {item.status === 'deleted_by_peer' ? 'נמחק ע"י peer' : item.status}
      </Text>
      <Text style={styles.hash}>🔐 {item.trustHash}</Text>
    </View>
  );

  const formatDate = (iso) => {
    if (!iso) return '---';
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📘 הודעות שמורות במכשיר</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#003366" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2f5', padding: 15 },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 12, color: '#003366' },
  logItem: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  deleted: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#001f4d' },
  details: { fontSize: 14, color: '#333', marginTop: 2 },
  deletedText: { color: '#a00', fontStyle: 'italic' },
  hash: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' },
});
