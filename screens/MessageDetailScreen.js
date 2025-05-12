// MessageDetailScreen.js - תצוגת פסים רק כשסטטוס מתאים (ללא אפורים)

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useMessages } from '../contexts/MessagesContext';

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { updateMessage, deleteMessage, messages } = useMessages();
  const { messageId } = route.params;

  const message = messages.find(m => m.id === messageId);

  const [shortName, setShortName] = useState(message?.shortName || '');
  const [date, setDate] = useState(message?.date || '');
  const [time, setTime] = useState(message?.time || '');
  const [freeText, setFreeText] = useState(message?.text || '');
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(message?.audioUri || '');
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!message) {
    return (
      <View style={styles.container}>
        <Text>הודעה לא נמצאה</Text>
      </View>
    );
  }

  const handleUpdate = () => {
    const updatedMessage = {
      ...message,
      shortName,
      date,
      time,
      text: freeText,
      audioUri: recordingUri,
      updatedAt: new Date().toISOString(),
    };
    updateMessage(updatedMessage);
    navigation.goBack();
  };

  const handleDelete = () => {
    deleteMessage(message.id);
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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'unread': return 'טרם נשלחה';
      case 'pending': return 'ממתין לשליחה';
      case 'delivered': return 'נשלחה והתקבלה';
      case 'received': return 'התקבלה אצל הנמען';
      case 'played': return 'נשמעה אך טרם בוצעה';
      case 'read': return 'בוצעה ואושרה';
      default: return 'לא ידוע';
    }
  };

  const showBlueLine = ['received', 'played'].includes(message.status);
  const showRedDot = message.status === 'played';
  const showOrangeLine = message.status === 'activated'; // future only

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{shortName}</Text>

      {(showBlueLine || showRedDot || showOrangeLine) && (
        <View style={styles.statusBarContainer}>
          {showOrangeLine && <View style={styles.statusLineOrange} />}
          {showRedDot && <View style={styles.statusDotRed} />}
          {showBlueLine && <View style={styles.statusLineBlue} />}
        </View>
      )}

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>סטטוס: {getStatusLabel(message.status)}</Text>
      </View>

      <TextInput style={styles.input} value={shortName} onChangeText={setShortName} placeholder="שם ההודעה" />
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="תאריך" />
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="שעה" />
      <TextInput style={styles.freeTextBox} value={freeText} onChangeText={setFreeText} placeholder="הוסף טקסט חופשי" multiline />

      <TouchableOpacity style={styles.recordButton} onPress={startOrStopRecording}>
        <Text style={styles.recordButtonText}>{recording ? 'עצור הקלטה' : 'הקלטה חדשה'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.playButton} onPress={isPlaying ? stopAudio : playAudio} disabled={!recordingUri}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.playButtonText}>{isPlaying ? 'עצור השמעה' : 'השמע הקלטה'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
        <Text style={styles.updateButtonText}>עדכן</Text>
      </TouchableOpacity>

      <View style={styles.rowButtons}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>מחק</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fffacd', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  statusBox: { backgroundColor: '#e0e0e0', padding: 6, borderRadius: 4, marginVertical: 8 },
  statusText: { fontSize: 14, color: '#333', textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ccc', marginVertical: 5, padding: 8, borderRadius: 4 },
  freeTextBox: { borderWidth: 1, borderColor: '#999', marginVertical: 10, padding: 10, borderRadius: 6, minHeight: 180, textAlignVertical: 'top' },
  recordButton: { backgroundColor: '#001f4d', padding: 12, alignItems: 'center', borderRadius: 10, marginTop: 15 },
  recordButtonText: { color: '#00ccff', fontSize: 16, fontWeight: 'bold' },
  playButton: { backgroundColor: '#001f4d', padding: 12, alignItems: 'center', borderRadius: 10, marginTop: 15, overflow: 'hidden' },
  playButtonText: { color: '#00ccff', fontSize: 16, fontWeight: 'bold', position: 'absolute' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 204, 255, 0.3)' },
  updateButton: { backgroundColor: '#00ccff', padding: 12, alignItems: 'center', borderRadius: 10, marginTop: 20 },
  updateButtonText: { color: '#001f4d', fontSize: 16, fontWeight: 'bold' },
  rowButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 30 },
  deleteButton: { backgroundColor: 'red', padding: 12, alignItems: 'center', borderRadius: 10, flex: 1, marginRight: 5 },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#555', padding: 12, alignItems: 'center', borderRadius: 10, flex: 1, marginLeft: 5 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusBarContainer: { flexDirection: 'column-reverse', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 12, gap: 3 },
  statusLineBlue: { width: 4, height: 16, backgroundColor: 'blue', borderRadius: 2 },
  statusLineOrange: { width: 4, height: 16, backgroundColor: 'orange', borderRadius: 2 },
  statusDotRed: { width: 10, height: 10, backgroundColor: 'red', borderRadius: 5 }
});
