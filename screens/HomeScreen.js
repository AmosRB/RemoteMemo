// HomeScreen.js (fixed to use MessagesContext)
import React, { useState, useEffect } from 'react';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-av';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Modal, Button, TextInput as RNTextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { messages } = useMessages();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState('');

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
        setFilteredContacts(contactList);
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

  const handleOpenMessage = (message) => {
    navigation.navigate('MessageDetail', {
      messageId: message.id,
    });
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, backgroundColor: '#fff', marginVertical: 5, padding: 8 }}>
          <Text style={{ color: '#888', marginBottom: 4 }}>
            מחובר {selectedContact ? `${selectedContact.name}` : 'לא נבחר'}
          </Text>
          <TextInput
            style={{ padding: 0 }}
            placeholder="חפש לפי שם או מספר"
            value={searchTerm}
            onChangeText={handleSearch}
          />
        </View>

        {filteredContacts.length > 0 && (
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
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.messageBox} onPress={() => handleOpenMessage(item)}>
            <Text>{item.shortName}</Text>
            <Text>{item.date} {item.time}</Text>
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
  container: { flex: 1, backgroundColor: '#4b3b72', padding: 10 },
  topBar: { backgroundColor: '#372d56', padding: 10, borderRadius: 8 },
  contactItem: { padding: 8, backgroundColor: '#6c5b7b', marginVertical: 2, borderRadius: 4 },
  contactText: { color: '#fff' },
  messageBox: { backgroundColor: '#fff', padding: 10, marginVertical: 5, borderRadius: 8 },
  bottomButton: { backgroundColor: '#001f4d', padding: 15, alignItems: 'center', borderRadius: 10, marginTop: 50, marginBottom: 50 },
  bottomButtonText: { color: '#00ccff', fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', marginVertical: 5, padding: 8, borderRadius: 4, backgroundColor: '#fff' }
});
