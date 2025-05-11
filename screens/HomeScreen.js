// HomeScreen.js - גרסה מתוקנת: הודעות מוצגות נכון לפי source (local/remote)

import React, { useState, useEffect, useRef } from 'react';
import * as Contacts from 'expo-contacts';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';
import { Audio } from 'expo-av';
import useSyncEngine from '../hooks/useSyncEngine';
import sendSyncQuery from '../utils/sendSyncQuery';
import playNotificationSound from '../utils/playNotificationSound'

const DEVICE_ID = '123456';
const PEER_IP = '192.168.1.228';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { messages } = useMessages();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  const { isSynced } = useSyncEngine(PEER_IP, sendSyncQuery);

  const blinkingOpacity = useRef(new Animated.Value(1)).current;
  const lastSeenId = useRef(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkingOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkingOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.source === 'remote' && latest.id !== lastSeenId.current) {
      lastSeenId.current = latest.id;
      playNotificationSound(); // ✅ זו הפונקציה המיובאת מ־../utils
    }
  }, [messages]);
  

  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.source === 'remote' && latest.id !== lastSeenId.current) {
      lastSeenId.current = latest.id;
      playNotificationSound();
    }
  }, [messages]);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const contactList = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
          .map(c => ({ id: c.id, name: c.name, number: c.phoneNumbers[0].number }));
        setContacts(contactList);
      }
    })();
  }, []);

  const handleSearch = (text) => {
    setSearchTerm(text);
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(text.toLowerCase()) ||
      contact.number.includes(text)
    );
    setFilteredContacts(filtered);
  };

  const handleSelect = (contact) => {
    setSelectedContact(contact);
    setSearchTerm('');
    setFilteredContacts([]);
  };

  const handleReselect = () => {
    setSelectedContact(null);
  };

  const handleOpenMessage = (message) => {
    if (message.source === 'remote') {
      navigation.navigate('ReceivedMessage', { messageId: message.id });
    } else {
      navigation.navigate('MessageDetail', { messageId: message.id });
    }
  };

  const renderMessageItem = ({ item }) => {
    const isBlinking = item.source === 'remote' && item.status !== 'played';
    const isMine = item.source === 'local';
    const MessageWrapper = isBlinking ? Animated.View : View;

    return (
      <TouchableOpacity onPress={() => handleOpenMessage(item)}>
        <MessageWrapper
          style={[styles.messageBox,
            isMine ? styles.outgoing : styles.incoming,
            styles.messageShadow,
            isBlinking && { opacity: blinkingOpacity }]}
        >
          {isMine && (
            <View style={styles.statusBarContainer}>
              <View style={styles.statusLineOrange} />
              <View style={styles.statusDotRed} />
              <View style={styles.statusLineBlue} />
            </View>
          )}

          <View>
            <Text style={styles.messageTitle}>{item.shortName}</Text>
            <Text style={styles.messageSubtitle}>תזכורת {item.shortName} [{item.date} {item.time}]</Text>
            {item.text ? <Text style={styles.messageContent}>{item.text}</Text> : null}
          </View>
        </MessageWrapper>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.rowWithIndicator}>
          <View style={[styles.syncIndicator, isSynced ? styles.green : styles.red]} />
          {selectedContact ? (
            <TouchableOpacity onPress={handleReselect}>
              <Text style={styles.connectedText}>מחובר ל: {selectedContact.name}</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.searchInput}
              placeholder="חפש איש קשר"
              placeholderTextColor="#fff"
              value={searchTerm}
              onChangeText={handleSearch}
            />
          )}
        </View>

        {filteredContacts.length > 0 && !selectedContact && (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactItem} onPress={() => handleSelect(item)}>
                <Text style={styles.contactText}>{item.name} ({item.number})</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 150 }}
          />
        )}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={renderMessageItem}
      />

      <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('CreateMessage')}>
        <Text style={styles.bottomButtonText}>הודעה קולית חדשה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d', padding: 10 },
  topBar: { backgroundColor: '#1a1a1a', padding: 10, borderRadius: 8 },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  connectedRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-end' },
  connectedText: { color: '#ff9933', fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginLeft: 6 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#444', padding: 6, borderRadius: 4, backgroundColor: '#333', color: '#fff', textAlign: 'right' },
  contactItem: { padding: 6, backgroundColor: '#6c5b7b', marginVertical: 2, borderRadius: 4 },
  contactText: { color: '#fff', textAlign: 'right' },
  messageBox: {
    backgroundColor: '#fffacd',
    padding: 6,
    marginVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  incoming: { alignSelf: 'flex-start', backgroundColor: '#d0e8ff' },
  outgoing: { alignSelf: 'flex-end', backgroundColor: '#fffacd' },
  messageShadow: { shadowColor: '#ff9933', shadowOffset: { width: 3, height: 5 }, shadowOpacity: 1, shadowRadius: 5, elevation: 10 },
  statusBarContainer: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginLeft: 8, gap: 3 },
  statusLineBlue: { width: 4, height: 16, backgroundColor: 'blue', borderRadius: 2 },
  statusLineOrange: { width: 4, height: 16, backgroundColor: 'orange', borderRadius: 2 },
  statusDotRed: { width: 10, height: 10, backgroundColor: 'red', borderRadius: 5 },
  syncIndicator: { width: 10, height: 10, borderRadius: 5 },
  green: { backgroundColor: 'green' },
  red: { backgroundColor: 'red' },
  messageTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 1, textAlign: 'right' },
  messageSubtitle: { fontSize: 11, color: '#555', textAlign: 'right' },
  messageContent: { fontSize: 12, color: '#888', marginTop: 2, textAlign: 'right' },
  bottomButton: { backgroundColor: '#001f4d', padding: 12, alignItems: 'center', borderRadius: 10, marginVertical: 40 },
  bottomButtonText: { color: '#00ccff', fontSize: 18, fontWeight: 'bold' },
  rowWithIndicator: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  }
});
 