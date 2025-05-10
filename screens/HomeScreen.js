// HomeScreen.js (updated to display message content)
import React, { useState, useEffect } from 'react';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { messages } = useMessages();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        const contactList = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0).map(c => ({
          id: c.id,
          name: c.name,
          number: c.phoneNumbers[0].number,
        }));
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
    navigation.navigate('MessageDetail', { messageId: message.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.inputContainer}>
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.messageBox,
              item.source === 'remote' ? styles.incoming : styles.outgoing,
              styles.messageShadow,
            ]}
            onPress={() => handleOpenMessage(item)}
          >
            <View style={styles.statusBarContainer}>
              <View style={[styles.statusBar, item.status === 'read' ? styles.statusRead : styles.statusUnread]} />
              <View style={[styles.statusBar, item.played ? styles.statusPlayed : styles.statusUnplayed]} />
            </View>
            <View>
              <Text style={styles.messageTitle}>{item.shortName}</Text>
              <Text style={styles.messageSubtitle}>תזכורת {item.shortName} [{item.date} {item.time}]</Text>
              {item.text ? (
                <Text style={styles.messageContent}>{item.text}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
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
  inputContainer: { marginBottom: 8 },
  connectedText: { color: '#ff9933', fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  searchInput: { borderWidth: 1, borderColor: '#444', padding: 6, borderRadius: 4, backgroundColor: '#333', color: '#fff', textAlign: 'right' },
  contactItem: { padding: 6, backgroundColor: '#6c5b7b', marginVertical: 2, borderRadius: 4 },
  contactText: { color: '#fff', textAlign: 'right' },
  messageBox: { backgroundColor: '#fffacd', padding: 8, marginVertical: 8, marginHorizontal: 4, borderRadius: 8, flexDirection: 'row-reverse', alignItems: 'center', elevation: 20 },
  incoming: { alignSelf: 'flex-start', backgroundColor: '#d0e8ff' },
  outgoing: { alignSelf: 'flex-end', backgroundColor: '#fffacd' },
  messageShadow: { shadowColor: '#ff9933', shadowOffset: { width: 3, height: 5 }, shadowOpacity: 1, shadowRadius: 5, elevation: 20 },
  statusBarContainer: { flexDirection: 'column', marginLeft: 6 },
  statusBar: { width: 6, height: 20, borderRadius: 3, marginVertical: 1 },
  statusUnread: { backgroundColor: 'blue' },
  statusRead: { backgroundColor: 'green' },
  statusUnplayed: { backgroundColor: 'red' },
  statusPlayed: { backgroundColor: 'orange' },
  messageTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2, textAlign: 'right' },
  messageSubtitle: { fontSize: 12, color: '#555', textAlign: 'right' },
  messageContent: { fontSize: 14, color: '#888', marginTop: 4, textAlign: 'right' },
  bottomButton: { backgroundColor: '#001f4d', padding: 12, alignItems: 'center', borderRadius: 10, marginVertical: 40 },
  bottomButtonText: { color: '#00ccff', fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', marginVertical: 5, padding: 8, borderRadius: 4, backgroundColor: '#fff' },
});
