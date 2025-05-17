import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onNewBlock } from '../hooks/useLedgerSync';

export default function BlockchainScreen() {
  const scrollViewRef = useRef(null);
  const [blocks, setBlocks] = useState([]);
  const [lastForceSync, setLastForceSync] = useState(null);

  const loadBlocks = async () => {
    try {
      const stored = await AsyncStorage.getItem('trustBlocks');
      const parsed = stored ? JSON.parse(stored) : [];
      setBlocks(parsed);
    } catch (err) {
      console.warn('⚠️ Failed to load blocks:', err);
    }
  };

  const loadForceSyncLog = async () => {
    try {
      const logs = await AsyncStorage.getItem('syncLogs');
      if (logs) {
        const parsed = JSON.parse(logs);
        const forceEntries = parsed.filter(e => e.reason === 'block mismatch');
        if (forceEntries.length > 0) {
          const last = forceEntries[forceEntries.length - 1];
          setLastForceSync(last.localTime || last.timestamp);
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to load sync logs:', err);
    }
  };

  const refreshAndScroll = async () => {
    await loadBlocks();
    await loadForceSyncLog();
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  useEffect(() => {
    refreshAndScroll();
    onNewBlock(() => {
      refreshAndScroll();
    });
  }, []);

  return (
    <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
      <Text style={styles.title}>📘 TRUST Blockchain</Text>

      {lastForceSync && (
        <Text style={styles.alert}>⚠️ בוצע Force Sync עקב אי התאמה: {lastForceSync}</Text>
      )}

      {blocks.length === 0 && (
        <Text style={styles.empty}>⚠️ אין בלוקים להצגה</Text>
      )}

      {blocks.map((item, index) => (
        <View key={index} style={styles.blockContainer}>
          <Text style={styles.blockHeader}>🔷 בלוק #{item.blockNumber ?? index}</Text>
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
  alert: { fontSize: 14, color: '#cc0000', fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
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