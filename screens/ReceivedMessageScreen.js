// ReceivedMessageScreen.js - מעודכן לשליחת עדכון סטטוס לשרת

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';
import * as FileSystem from 'expo-file-system';

export default function ReceivedMessageScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { updateMessage, deleteMessage } = useMessages();
  const { messageId } = route.params;

  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [progress, setProgress] = useState(0);

  const message = useMessages().messages.find((m) => m.id === messageId);

  useEffect(() => {
    if (message && message.source === 'remote' && !message.played) {
      const updated = {
        ...message,
        status: 'played',
        played: true,
        updatedAt: new Date().toISOString(),
        source: 'remote',
      };
  
      updateMessage(updated);
  
      try {
        fetch('http://192.168.1.227:3000/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (err) {
        console.warn('🔁 עדכון סטטוס לשרת נכשל:', err);
      }
    }
  }, [message]);
  

  if (!message) {
    return (
      <View style={styles.container}>
        <Text style={styles.content}>הודעה לא נמצאה</Text>
      </View>
    );
  }

  const playAudio = async () => {
    try {
      if (message.audioBase64) {
        const fileUri = FileSystem.documentDirectory + `${message.id}.m4a`;
        await FileSystem.writeAsStringAsync(fileUri, message.audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true }, updateProgress);
        setSound(sound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.warn('❌ שגיאה בהשמעת הקלטה:', error);
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

  const handleDelete = () => {
    deleteMessage(message.id);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📥 הודעה</Text>

      <Text style={styles.label}>שם ההודעה:</Text>
      <Text style={styles.content}>{message.shortName}</Text>

      <Text style={styles.label}>תוכן ההודעה:</Text>
      <Text style={styles.content}>{message.text}</Text>

      <Text style={styles.label}>תאריך הפעלה:</Text>
      <Text style={styles.content}>{message.date || '---'}</Text>

      <Text style={styles.label}>שעת הפעלה:</Text>
      <Text style={styles.content}>{message.time || '---'}</Text>

      {message.audioBase64 ? (
        <TouchableOpacity style={styles.playButton} onPress={isPlaying ? stopAudio : playAudio}>
          <Text style={styles.playButtonText}>{isPlaying ? 'עצור השמעה' : 'השמע הקלטה'}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.content, { color: '#999' }]}>אין הקלטה מצורפת</Text>
      )}

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>🗑️ מחק הודעה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e0f7fa', padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'right' },
  content: { fontSize: 16, marginBottom: 10, textAlign: 'right' },
  playButton: { backgroundColor: '#007aff', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  playButtonText: { color: '#fff', fontSize: 16 },
  deleteButton: { backgroundColor: 'red', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  deleteButtonText: { color: '#fff', fontSize: 16 },
});
