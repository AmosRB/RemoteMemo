// MessageDetailScreen.js (expo-av + progress bar)
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useMessages } from '../contexts/MessagesContext';

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { updateMessage, deleteMessage } = useMessages();
  const { messageId } = route.params;

  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [freeText, setFreeText] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState('');
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const { messages } = useMessages();
  const message = messages.find(m => m.id === messageId);

  if (!message) {
    return (
      <View style={styles.container}>
        <Text>הודעה לא נמצאה</Text>
      </View>
    );
  }

  const handleUpdate = () => {
    const updatedMessage = { ...message, text, date, time, audioUri: recordingUri, freeText };
    updateMessage(updatedMessage);
    Alert.alert('עודכן!', 'ההודעה עודכנה בהצלחה');
    navigation.goBack();
  };

  const handleDelete = () => {
    deleteMessage(message.id);
    Alert.alert('נמחק!', 'ההודעה נמחקה בהצלחה');
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const startOrStopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        setRecording(recording);
      } catch (err) {
        console.error('Failed to start recording', err);
      }
    }
  };

  const playAudio = async () => {
    if (recordingUri) {
      const { sound: playbackSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        updateProgress
      );
      setSound(playbackSound);
      setIsPlaying(true);
    } else {
      Alert.alert('אין קובץ קול', 'לא נמצאה הודעה קולית להשמעה.');
    }
  };

  const updateProgress = (status) => {
    if (status.isLoaded && status.durationMillis) {
      setProgress((status.positionMillis / status.durationMillis) * 100);
      if (!status.isPlaying) {
        setIsPlaying(false);
      }
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>עריכת הודעה</Text>
      <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="תוכן ההודעה" />
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="תאריך" />
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="שעה" />

      <TextInput
        style={styles.freeTextBox}
        value={freeText}
        onChangeText={setFreeText}
        placeholder="הוסף טקסט חופשי"
        multiline
      />

      <TouchableOpacity style={styles.recordButton} onPress={startOrStopRecording}>
        <Text style={styles.recordButtonText}>{recording ? 'עצור הקלטה' : 'התחל הקלטה חדשה'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.playButton} onPress={isPlaying ? stopAudio : playAudio}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.playButtonText}>{isPlaying ? 'עצור השמעה' : 'השמע הקלטה'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
        <Text style={styles.updateButtonText}>עדכן</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>ביטול</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>מחק</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fffacd', alignItems: 'stretch' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', marginVertical: 5, padding: 8, borderRadius: 4 },
  freeTextBox: { borderWidth: 1, borderColor: '#999', marginVertical: 10, padding: 10, borderRadius: 6, minHeight: 80, textAlignVertical: 'top' },
  recordButton: { backgroundColor: '#001f4d', padding: 15, alignItems: 'center', borderRadius: 10, marginTop: 20 },
  recordButtonText: { color: '#00ccff', fontSize: 16, fontWeight: 'bold' },
  playButton: { backgroundColor: '#001f4d', padding: 15, alignItems: 'center', borderRadius: 10, marginTop: 20, overflow: 'hidden' },
  playButtonText: { color: '#00ccff', fontSize: 16, fontWeight: 'bold', position: 'absolute' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 204, 255, 0.3)' },
  updateButton: { backgroundColor: '#00ccff', padding: 15, alignItems: 'center', borderRadius: 10, marginTop: 30 },
  updateButtonText: { color: '#001f4d', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#555', padding: 15, alignItems: 'center', borderRadius: 10, marginTop: 20 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { backgroundColor: 'red', padding: 15, alignItems: 'center', borderRadius: 10, marginTop: 40, marginBottom: 40 },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
