// Updated HomeScreen.js with voice recording integration
import React, { useState, useEffect } from 'react';
import * as Contacts from 'expo-contacts';
import * as Audio from 'expo-av';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Modal, Button, TextInput as RNTextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [messages, setMessages] = useState([
    { id: '1', shortName: 'תזכורת א', text: 'תזכורת לשתות מים', date: '2025-05-10', time: '10:00' },
    { id: '2', shortName: 'תזכורת ב', text: 'לקחת תרופות', date: '2025-05-11', time: '08:00' }
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState('');

  useEffect(() => {
    if (route.params?.updatedMessage) {
      setMessages(prev => prev.map(m => m.id === route.params.updatedMessage.id ? route.params.updatedMessage : m));
    }
    if (route.params?.deletedMessageId) {
      setMessages(prev => prev.filter(m => m.id !== route.params.deletedMessageId));
    }
  }, [route.params]);

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
      message,
      onUpdate: (updatedMsg) => {
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      },
      onDelete: (id) => {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    });
  };

  const handleSaveNewMessage = () => {
    const newMessage = {
      id: (messages.length + 1).toString(),
      shortName: newName,
      text: 'הודעה קולית מוקלטת',
      date: newDate,
      time: newTime,
      audioUri: recordingUri,
    };
    setMessages(prev => [...prev, newMessage]);
    setModalVisible(false);
    setNewName('');
    setNewDate('');
    setNewTime('');
    setRecordingUri('');
  };

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      await Audio.Audio.requestPermissionsAsync();
      await Audio.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      console.log('Starting recording..');
      const { recording } = await Audio.Audio.Recording.createAsync(Audio.Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordingUri(uri);
    console.log('Recording stopped and stored at', uri);
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

      <TouchableOpacity style={styles.bottomButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.bottomButtonText}>הודעה קולית חדשה</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>הקלד שם להודעה:</Text>
          <RNTextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="שם הודעה" />

          <Text style={{ fontSize: 18, marginBottom: 10 }}>בחר תאריך:</Text>
          <RNTextInput style={styles.input} value={newDate} onChangeText={setNewDate} placeholder="תאריך (YYYY-MM-DD)" />

          <Text style={{ fontSize: 18, marginBottom: 10 }}>בחר שעה:</Text>
          <RNTextInput style={styles.input} value={newTime} onChangeText={setNewTime} placeholder="שעה (HH:MM)" />

          <Button title={recording ? 'עצור הקלטה' : 'התחל הקלטה'} onPress={recording ? stopRecording : startRecording} />
          <Button title="שמור הודעה" onPress={handleSaveNewMessage} disabled={!recordingUri} />
          <Button title="בטל" onPress={() => setModalVisible(false)} color="red" />
        </View>
      </Modal>
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
