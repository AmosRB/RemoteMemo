// MessageDetailScreen.js - מעודכן עם הסבר לצבעים: כתום=אושרה, אדום=נקראה, כחול=התקבלה

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';

export default function MessageDetailScreen() {
  const route = useRoute();
  const { messageId } = route.params;
  const { messages } = useMessages();

  const message = messages.find((m) => m.id === messageId);

  if (!message) {
    return (
      <View style={styles.container}>
        <Text style={styles.content}>הודעה לא נמצאה</Text>
      </View>
    );
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'unread': return 'טרם נפתחה';
      case 'received': return 'התקבלה (פס כחול)';
      case 'read': return 'נקראה (נקודה אדומה)';
      case 'played': return 'הושמעה';
      case 'confirmed': return 'אושרה (פס כתום)';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 פרטי הודעה</Text>

      <Text style={styles.label}>שם ההודעה:</Text>
      <Text style={styles.content}>{message.shortName}</Text>

      <Text style={styles.label}>תוכן:</Text>
      <Text style={styles.content}>{message.text}</Text>

      <Text style={styles.label}>תאריך:</Text>
      <Text style={styles.content}>{message.date}</Text>

      <Text style={styles.label}>שעה:</Text>
      <Text style={styles.content}>{message.time}</Text>

      <Text style={styles.label}>סטטוס:</Text>
      <Text style={styles.content}>{getStatusLabel(message.status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'right' },
  content: { fontSize: 16, marginBottom: 10, textAlign: 'right' },
});
