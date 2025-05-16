// networkUtils.js – base URL handler based on env

import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_RELAY } from '../env';

export async function getBaseUrl() {
  if (USE_RELAY) {
    const stored = await AsyncStorage.getItem('serverUrl');
    return stored || 'http://192.168.1.227:3000';
  } else {
    const peerIp = await AsyncStorage.getItem('peerIp');
    return `http://${peerIp || '192.168.1.228'}:3000`;
  }
}
