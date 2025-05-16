import React, { useState, useEffect, useRef } from 'react';
import * as Contacts from 'expo-contacts';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';
import { Audio } from 'expo-av';
import sendSyncQuery from '../utils/sendSyncQuery';
import playNotificationSound from '../utils/playNotificationSound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useLedgerSync from '../hooks/useLedgerSync';
import sendLedgerQuery from '../utils/sendLedgerQuery';
import requestMissingMessage from '../utils/requestMissingMessage';
import createAppSyncLayer from '../utils/AppSyncLayer';

export default function HomeScreen() {
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const { messages, updateMessage, logSyncEvent } = useMessages();
  const [deviceId, setDeviceId] = useState(null);
  const [peerIp, setPeerIp] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [syncLedgers, setSyncLedgers] = useState(() => () => {});
  const [syncStatus, setSyncStatus] = useState('idle');
  const [peerOnline, setPeerOnline] = useState(false);
  const blinkingOpacity = useRef(new Animated.Value(1)).current;
  const lastSeenId = useRef(null);
  

  useEffect(() => {
    AsyncStorage.getItem('peerIp').then(ip => {
      const resolvedIp = ip || '192.168.1.227';
      setPeerIp(resolvedIp);
    });
    
  }, []);

  useEffect(() => {
    if (peerIp) {
      const { syncLedgers } = useLedgerSync(peerIp, sendLedgerQuery, requestMissingMessage, setSyncStatus);
      setSyncLedgers(() => syncLedgers);
    }
  }, [peerIp]);
  

  useEffect(() => {
    const checkPeer = async () => {
      try {
        const res = await fetch(`http://${peerIp}:3000/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId })
        });
        const data = await res.json();
        setPeerOnline(data.peerFound === true);
      } catch (err) {
        setPeerOnline(false);
      }
    };

    const syncAppLayer = async () => {
      try {
        const ctx = { messages, updateMessage, logSyncEvent };
        const appSync = createAppSyncLayer(ctx, peerIp, deviceId);
        await appSync.syncWithPeer();
      } catch (err) {
        console.warn('🔁 סנכרון BbSp נכשל:', err);
      }
    };

    const interval = setInterval(() => {
      if (peerIp && deviceId) {
        checkPeer();
        syncAppLayer();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [peerIp, deviceId, messages]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkingOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkingOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const getSyncStyle = () => {
    if (peerOnline && syncStatus !== 'ok') return { ...styles.yellow, opacity: blinkingOpacity };
    if (!peerOnline) return styles.yellow;
    if (syncStatus === 'ok') return styles.green;
    return styles.red;
  };

  useEffect(() => {
    if (messages.length === 0 || !deviceId) return;
    const latest = messages[messages.length - 1];
    if (latest.senderId !== deviceId && latest.id !== lastSeenId.current) {
      lastSeenId.current = latest.id;
      playNotificationSound();
    }
  }, [messages, deviceId]);
  

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

  const manualSync = async () => {
    if (!deviceId || !peerIp) return;
    setSyncStatus('syncing');
    setTimeout(() => setSyncStatus('idle'), 1000);
    const outgoingMessages = messages.filter((msg) => msg.senderId === deviceId);
    const syncPayload = {
      deviceId,
      knownStatuses: outgoingMessages.map((m) => ({ id: m.id, status: m.status })),
    };
    try {
      await sendSyncQuery(peerIp, syncPayload);
    } catch (err) {
      console.warn('⚠️ Manual sync failed:', err);
    }
  };


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
    if (!deviceId) return;
    navigation.navigate(message.senderId === deviceId ? 'MessageDetail' : 'ReceivedMessage', { messageId: message.id });
  };

  const renderMessageItem = ({ item }) => {
    if (!deviceId) return null;
    const isMine = item.senderId === deviceId;
    const isIncoming = !isMine;
    const isBlinking = isIncoming && !['played', 'alert triggered', 'read', 'deleted_by_peer'].includes(item.status);
    const MessageWrapper = isBlinking ? Animated.View : View;
    const isDeletedByPeer = item.status === 'deleted_by_peer';

    return (
      <TouchableOpacity onPress={() => handleOpenMessage(item)}>
        <MessageWrapper
          style={[styles.messageBox,
            isMine ? styles.outgoing : styles.incoming,
            styles.messageShadow,
            isDeletedByPeer && { opacity: 0.5 },
            isBlinking && { opacity: blinkingOpacity },
          ]}
        >
          {isMine && (
            <View style={styles.statusBarContainer}>
              {['delivered', 'received', 'played', 'alert triggered'].includes(item.status) && <View style={styles.statusLineBlue} />}
              {['played', 'alert triggered'].includes(item.status) && <View style={styles.statusDotRed} />}
              {item.status === 'alert triggered' && <View style={styles.statusLineOrange} />}
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
        <TouchableOpacity onPress={manualSync}>
  {peerOnline && syncStatus !== 'ok' ? (
    <Animated.View style={[styles.syncIndicator, styles.yellow, { opacity: blinkingOpacity }]} />
  ) : (
    <View style={[styles.syncIndicator, getSyncStyle() || {}]} />
  )}
</TouchableOpacity>

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
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={renderMessageItem}
      />
      <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('CreateMessage')}>
        <Text style={styles.bottomButtonText}>הודעה חדשה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2d2d2d', padding: 10 },
  topBar: { backgroundColor: '#1a1a1a', padding: 10, borderRadius: 8 },
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
  statusBarContainer: { flexDirection: 'column-reverse', alignItems: 'center', justifyContent: 'flex-start', marginLeft: 8, gap: 3 },
  statusLineBlue: { width: 4, height: 16, backgroundColor: 'blue', borderRadius: 2 },
  statusLineOrange: { width: 4, height: 16, backgroundColor: 'orange', borderRadius: 2 },
  statusDotRed: { width: 12, height: 12, backgroundColor: 'red', borderRadius: 6 },
  inactive: { backgroundColor: 'transparent' },
  syncIndicator: { width: 10, height: 10, borderRadius: 5 },
  green: { backgroundColor: 'green' },
  red: { backgroundColor: 'red' },
  yellow: { backgroundColor: 'yellow' },
  purple: { backgroundColor: 'purple' },

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