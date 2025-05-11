import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default async function playNotificationSound() {
  const soundKey = await AsyncStorage.getItem('notificationSound') || 'notification';
  const volume = parseFloat(await AsyncStorage.getItem('notificationVolume')) || 1.0;

  let soundFile;

  switch (soundKey) {
    case 'ping':
      soundFile = require('../assets/notification-ping.mp3');
      break;
    case 'chime':
      soundFile = require('../assets/opening-apps-sond5.mp3');
      break;
    case 'short':
      soundFile = require('../assets/funny-cat.mp3');
      break;
    case 'odd':
      soundFile = require('../assets/ODD.mp3');
      break;
    default:
      soundFile = require('../assets/notification.mp3');
  }

  const { sound } = await Audio.Sound.createAsync(soundFile);
  await sound.setVolumeAsync(volume);
  await sound.playAsync();
}
