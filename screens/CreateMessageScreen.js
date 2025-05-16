// CreateMessageScreen.js – כולל לוגים בכל שלב

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useMessages } from '../contexts/MessagesContext';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashMessage } from '../utils/trustEngine';

export default function CreateMessageScreen() {
  const navigation = useNavigation();
  const { addMessage } = useMessages();
  const [shortName, setShortName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [freeText, setFreeText] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState('');
  const [audioBase64, setAudioBase64] = useState('');
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('deviceId').then((id) => {
      setDeviceId(id);
      console.log('📱 Device ID:', id);
    });
  }, []);

  const handleSave = async () => {
    console.log('📤 handleSave started');
    console.log('deviceId:', deviceId, 'receiverId:', receiverId);

    if (!deviceId || !receiverId.trim()) {
      console.warn('❌ Missing deviceId or receiverId');
      return;
    }

    const baseId = String(new Date().getTime());
    const status = 'not_delivered';


    let hash;
    try {
      hash = await hashMessage({
        id: baseId,
        status,
        text: freeText || '',
        audioBase64: audioBase64 || '',
      });
    } catch (err) {
      console.error('❌ Failed to hash message:', err);
      return;
    }

    const newMessage = {
      id: baseId,
      senderId: deviceId,
      receiverId: receiverId.trim(),
      shortName,
      text: freeText || '(ללא טקסט)',
      date,
      time,
      audioBase64: audioBase64 || null,
      source: 'local',
      status,
      played: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash,
    };

    console.log('📝 New message created:', newMessage);

    try {
      await addMessage(newMessage);
      console.log('✅ Message added locally');
    } catch (err) {
      console.error('❌ Failed to add message:', err);
    }

    try {
      const res = await fetch('http://192.168.1.227:3000/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      });
      console.log('📡 Message sent to server, status:', res.status);
    } catch (err) {
      console.warn('🔁 שליחה לשרת נכשלה:', err);
    }

    setShortName('');
    setDate('');
    setTime('');
    setFreeText('');
    setReceiverId('');
    setRecordingUri('');
    setAudioBase64('');
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

      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setAudioBase64(base64);
        console.log('🎙️ Recording saved as base64, length:', base64.length);
      }
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        setRecording(recording);
        console.log('🎙️ Recording started');
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

  if (!deviceId) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>🔄 טוען מזהה מכשיר...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>צור הודעה חדשה</Text>
      <View style={styles.formSection}>
        <TextInput style={styles.input} value={shortName} onChangeText={setShortName} placeholder="שם ההודעה" />
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="תאריך" />
        <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="שעה" />
        <TextInput style={styles.input} value={receiverId} onChangeText={setReceiverId} placeholder="מזהה מקבל (receiverId)" />
        <TextInput
          style={styles.freeTextBox}
          value={freeText}
          onChangeText={setFreeText}
          placeholder="הוסף טקסט חופשי"
          multiline
        />
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.recordButton} onPress={startOrStopRecording}>
          <Text style={styles.recordButtonText}>{recording ? 'עצור הקלטה' : 'התחל הקלטה חדשה'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={isPlaying ? stopAudio : playAudio} disabled={!recordingUri}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
          <Text style={styles.playButtonText}>{isPlaying ? 'עצור השמעה' : 'השמע הקלטה'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>שלח</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#d0f0c0', alignItems: 'stretch', padding: 20, justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  formSection: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#ccc', marginVertical: 5, padding: 8, borderRadius: 4 },
  freeTextBox: { borderWidth: 1, borderColor: '#999', marginVertical: 10, padding: 10, borderRadius: 6, minHeight: 180, textAlignVertical: 'top' },
  buttonGroup: { marginTop: 10, marginBottom: 20 },
  recordButton: { backgroundColor: '#001f4d', padding: 15, alignItems: 'center', borderRadius: 10, marginBottom: 10 },
  recordButtonText: { color: '#00ccff', fontSize: 16, fontWeight: 'bold' },
  playButton: { backgroundColor: '#001f4d', padding: 15, alignItems: 'center', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  playButtonText: { color: '#00ccff', fontSize: 16, fontWeight: 'bold', position: 'absolute' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 204, 255, 0.3)' },
  saveButton: { backgroundColor: '#00ccff', padding: 15, alignItems: 'center', borderRadius: 10, marginBottom: 10 },
  saveButtonText: { color: '#001f4d', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { backgroundColor: 'red', padding: 15, alignItems: 'center', borderRadius: 10 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});