// BlockchainScreen.js – תצוגה גרפית של ה־TRUST Ledger עם תיקון VirtualizedLists

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BlockchainScreen() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const stored = await AsyncStorage.getItem('trustBlocks');
        console.log('🧱 תוכן trustBlocks:', stored);
        const parsed = stored ? JSON.parse(stored) : [];
        console.log('🔢 מספר בלוקים שנמצאו:', parsed.length);
        setBlocks(parsed.reverse());
      } catch (err) {
        console.warn('⚠️ Failed to load blocks:', err);
      }
    };

    loadBlocks();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📘 TRUST Blockchain</Text>

      {blocks.length === 0 && (
        <Text style={styles.empty}>⚠️ אין בלוקים להצגה</Text>
      )}

      {blocks.map((item, index) => (
        <View key={index} style={styles.blockContainer}>
          <Text style={styles.blockHeader}>🔷 בלוק #{blocks.length - index} – {new Date(item.timestamp).toLocaleString()}</Text>

          <View style={styles.messageRowHeader}>
            <Text style={styles.msgTitle}>שם ההודעה</Text>
            <Text style={styles.msgStatus}>סטטוס</Text>
          </View>

          {item.ledger.map((entry, idx) => (
            <View key={idx} style={styles.messageRow}>
              <Text style={styles.msgTitle}>{entry.id}</Text>
              <Text style={styles.msgStatus}>{entry.status}</Text>
            </View>
          ))}

          <Text style={styles.hashLabel}>🔐 Hash:</Text>
          <Text style={styles.hash}>{item.hash}</Text>
          <Text style={styles.hashLabel}>🔗 Previous:</Text>
          <Text style={styles.prevHash}>{item.previousHash || '(ריק)'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#eef2f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#003366' },
  empty: { textAlign: 'center', color: '#888', fontSize: 16, marginTop: 20 },
  blockContainer: { backgroundColor: '#fff', padding: 14, marginBottom: 20, borderRadius: 8, elevation: 3 },
  blockHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1a1a1a' },
  messageRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 4 },
  msgTitle: { fontSize: 14, color: '#333', flex: 2 },
  msgStatus: { fontSize: 14, color: '#007acc', flex: 1, textAlign: 'right' },
  hashLabel: { marginTop: 10, fontSize: 12, fontWeight: 'bold', color: '#666' },
  hash: { fontSize: 12, fontFamily: 'monospace', color: '#444' },
  prevHash: { fontSize: 12, fontFamily: 'monospace', color: '#999' },
});
