// SettingsScreen.js – גרסה מעודכנת עם סטטוס peer

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { useMessages } from '../contexts/MessagesContext';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { clearMessages } = useMessages();
  const [deviceId, setDeviceId] = useState('123456');
  const [peerIp, setPeerIp] = useState('192.168.1.228');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.227:3000');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationSound, setNotificationSound] = useState('notification');
  const [messageExpiryHours, setMessageExpiryHours] = useState('24');
  const [notificationVolume, setNotificationVolume] = useState(1.0);
  const [connectedNumber, setConnectedNumber] = useState('');
  const [peerStatus, setPeerStatus] = useState('unknown');

  useEffect(() => {
    AsyncStorage.getItem('connectedNumber').then((val) => val && setConnectedNumber(val));
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const vol = await AsyncStorage.getItem('notificationVolume');
      const sound = await AsyncStorage.getItem('notificationSound');
      const expiry = await AsyncStorage.getItem('messageExpiryHours');
      const notif = await AsyncStorage.getItem('notificationsEnabled');
      if (vol !== null) setNotificationVolume(parseFloat(vol));
      if (sound) setNotificationSound(sound);
      if (expiry) setMessageExpiryHours(expiry);
      if (notif !== null) setNotificationsEnabled(notif === 'true');
    };
    loadSettings();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('deviceId').then((savedId) => savedId && setDeviceId(savedId));
  }, []);

  const checkPeerConnection = async () => {
    try {
      const res = await fetch(`http://${peerIp}:3000/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const data = await res.json();
      setPeerStatus(data.peerFound ? 'connected' : 'not found');
    } catch (err) {
      setPeerStatus('error');
    }
  };

  const getPeerStatusText = () => {
    if (peerStatus === 'connected') return '🟢 Peer מחובר';
    if (peerStatus === 'not found') return '🟡 Peer לא נמצא';
    if (peerStatus === 'error') return '🔴 שגיאה בגישה ל־Peer';
    return '...';
  };

  const handleClearHistory = async () => {
    await clearMessages();
    Alert.alert('נמחק', 'היסטוריית ההודעות נמחקה בהצלחה.');
  };

  const handleResetDeviceId = async () => {
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    setDeviceId(newId);
    await AsyncStorage.setItem('deviceId', newId);
    Alert.alert('מזהה חדש', `המכשיר שלך: ${newId}`);
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (e) {
      console.warn('Failed to save setting:', key);
    }
  };

  const handleTestSound = async () => {
    try {
      let soundFile;
      switch (notificationSound) {
        case 'ping': soundFile = require('../assets/notification-ping.mp3'); break;
        case 'odd': soundFile = require('../assets/ODD.mp3'); break;
        case 'chime': soundFile = require('../assets/opening-apps-sond5.mp3'); break;
        case 'short': soundFile = require('../assets/funny-cat.mp3'); break;
        default: soundFile = require('../assets/notification.mp3');
      }
      const { sound } = await Audio.Sound.createAsync(soundFile);
      await sound.setVolumeAsync(notificationVolume);
      await sound.playAsync();
    } catch (err) {
      console.warn('🔊 שגיאה בהשמעת התראה:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>🔧 הגדרות מערכת</Text>

      <Text style={styles.label}>מזהה מכשיר:</Text>
      <View style={[styles.rowGroup, { justifyContent: 'flex-end', gap: 8 }]}>
        <TouchableOpacity onPress={() => {
          setDeviceId('123456');
          AsyncStorage.setItem('deviceId', '123456');
          Alert.alert('מזהה עודכן', 'המכשיר הוגדר כ-123456');
        }}>
          <Text style={{ color: 'skyblue' }}>🔙</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleResetDeviceId}>
          <Text style={styles.buttonText}>🔄 חדש</Text>
        </TouchableOpacity>
        <TextInput
  style={styles.input}
  value={deviceId}
  onChangeText={(val) => {
    setDeviceId(val);
    AsyncStorage.setItem('deviceId', val); // 💾 שמירה מידית
  }}
/>

      </View>

      <Text style={styles.label}>מספר מחובר (יעד):</Text>
      <TextInput
        style={styles.input}
        value={connectedNumber}
        onChangeText={(val) => {
          setConnectedNumber(val);
          AsyncStorage.setItem('connectedNumber', val);
        }}
        placeholder="הכנס מספר יעד "
      />

      <Text style={styles.label}>כתובת Peer:</Text>
      <TextInput
  style={styles.input}
  value={peerIp}
  onChangeText={(val) => {
    setPeerIp(val);
    AsyncStorage.setItem('peerIp', val);
  }}
/>


      <TouchableOpacity onPress={checkPeerConnection} style={{ marginTop: 10 }}>
        <Text style={{ color: '#00ccff' }}>🔄 בדוק חיבור ל־Peer</Text>
      </TouchableOpacity>

      <Text style={{ color: '#ccc', fontSize: 16, marginTop: 8 }}>{getPeerStatusText()}</Text>

      <Text style={styles.label}>כתובת Relay Server:</Text>
      <TextInput style={styles.input} value={serverUrl} onChangeText={setServerUrl} />

      <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => navigation.navigate('Journal')}>
        <Text style={styles.buttonText}>📘 יומן TRUST</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={() => navigation.navigate('Blockchain')}>
        <Text style={styles.buttonText}>⛓️ הצג Blockchain</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          try {
            const logs = await AsyncStorage.getItem('debugLogs');
            if (logs) {
              const parsed = JSON.parse(logs);
              if (!Array.isArray(parsed) || parsed.length === 0) {
                Alert.alert('Debug Logs', 'אין לוגים להצגה.');
                return;
              }
              const display = parsed
                .map(e => {
                  const time = e.timestamp || '⏱️';
                  const act = e.action || 'ACTION';
                  const src = e.source ? `[${e.source}]` : '';
                  const msg = e.message || '—';
                  return `${time} | ${src} ${act}: ${msg}`;
                })
                .join('\n\n')
                .slice(0, 1000);
              Alert.alert('Debug Logs', display);
            } else {
              Alert.alert('Debug Logs', 'אין לוגים זמינים.');
            }
          } catch (err) {
            Alert.alert('Debug Logs', 'שגיאה בקריאת הלוגים.');
            console.warn('⚠️ Failed to read debug logs:', err);
          }
        }}
      >
        <Text style={styles.buttonText}>🪵 הצג Debug Logs</Text>
      </TouchableOpacity>

      <View style={[styles.rowGroup, { marginTop: 16, justifyContent: 'space-between', backgroundColor: '#111', padding: 10, borderRadius: 6, height: 40 }]}>
        <Text style={[styles.label, { marginTop: 0 }]}>🔔 השמעת התראות:</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={(val) => {
            setNotificationsEnabled(val);
            saveSetting('notificationsEnabled', val);
          }}
          trackColor={{ false: '#777', true: '#00ccff' }}
          thumbColor={notificationsEnabled ? '#ffffff' : '#ccc'}
        />
      </View>

      <Text style={styles.label}>📢 צליל התראה:</Text>
      <View style={[styles.pickerWrapper, { height: 36 }]}>
        <Picker
          selectedValue={notificationSound}
          onValueChange={(val) => {
            setNotificationSound(val);
            saveSetting('notificationSound', val);
          }}
          style={[styles.picker, { height: 36 }]}
          dropdownIconColor="#fff"
        >
          <Picker.Item label="ברירת מחדל" value="notification" />
          <Picker.Item label="ביפ" value="ping" />
          <Picker.Item label="פעמון" value="chime" />
          <Picker.Item label="קצר" value="short" />
          <Picker.Item label="ODD (ניסוי)" value="odd" />
        </Picker>
      </View>

      <Text style={styles.label}>🔊 עוצמת התראה:</Text>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={0}
        maximumValue={1}
        step={0.1}
        value={notificationVolume}
        onValueChange={(val) => {
          setNotificationVolume(val);
          saveSetting('notificationVolume', val);
        }}
        minimumTrackTintColor="#00ccff"
        maximumTrackTintColor="#555"
        thumbTintColor="#00ccff"
      />

      <TouchableOpacity style={styles.button} onPress={handleTestSound}>
        <Text style={styles.buttonText}>🔊 השמע התראה</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={messageExpiryHours}
        onChangeText={(val) => {
          setMessageExpiryHours(val);
          saveSetting('messageExpiryHours', val);
        }}
        keyboardType="numeric"
        placeholder="🕒 זמן למחיקת הודעות (בשעות)"
        placeholderTextColor="#aaa"
      />

      <TouchableOpacity style={styles.dangerButton} onPress={handleClearHistory}>
        <Text style={styles.buttonText}>מחק את כל ההודעות</Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>גרסה: ℹ️ 1.0.0</Text>
      <Text style={styles.infoText}>Developed D&A Design</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flexGrow: 1,
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
    padding: 10,
    borderRadius: 6,
    fontSize: 16,
  },
  rowGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    backgroundColor: '#0055aa',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 6,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
  },
});
