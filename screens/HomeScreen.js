// HomeScreen.js (fixed height, allow reselect contact)
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
    navigation.navigate('MessageDetail', {
      messageId: message.id,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.inputContainer}>
          {selectedContact ? (
            <TouchableOpacity onPress={handleReselect}>
              <Text style={styles.connectedText}>מחובר ל: {selectedContact.name} </Text>
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
          <TouchableOpacity style={styles.messageBox} onPress={() => handleOpenMessage(item)}>
            <Text style={styles.messageTitle}>{item.shortName}</Text>
            <Text style={styles.messageSubtitle}>תזכורת {item.shortName} [{item.date} {item.time}]</Text>
          </TouchableOpacity>
        )}
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
  inputContainer: { marginBottom: 8 },
  connectedText: { color: '#ff9933', fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  searchInput: { borderWidth: 1, borderColor: '#444', padding: 6, borderRadius: 4, backgroundColor: '#333', color: '#fff', textAlign: 'right' },
  contactItem: { padding: 6, backgroundColor: '#6c5b7b', marginVertical: 2, borderRadius: 4 },
  contactText: { color: '#fff', textAlign: 'right' },
  messageBox: { backgroundColor: '#fffacd', padding: 8, marginVertical: 4, borderRadius: 8 },
  messageTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2, textAlign: 'right' },
  messageSubtitle: { fontSize: 12, color: '#555', textAlign: 'right' },
  bottomButton: { backgroundColor: '#001f4d', padding: 12, alignItems: 'center', borderRadius: 10, marginVertical: 40 },
  bottomButtonText: { color: '#00ccff', fontSize: 18, fontWeight: 'bold' },
});