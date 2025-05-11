import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import MessageDetailScreen from './screens/MessageDetailScreen';
import JournalScreen from './screens/JournalScreen';
import CreateMessageScreen from './screens/CreateMessageScreen';
import SettingsScreen from './screens/SettingsScreen';
import ReceivedMessageScreen from './screens/ReceivedMessageScreen';
import { MessagesProvider } from './contexts/MessagesContext';

const Stack = createStackNavigator();

function AppHeader() {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerText}>Remote Memo CONNECT</Text>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <MessagesProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            header: () => <AppHeader />,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
          <Stack.Screen name="Journal" component={JournalScreen} />
          <Stack.Screen name="CreateMessage" component={CreateMessageScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ReceivedMessage" component={ReceivedMessageScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </MessagesProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#001f4d',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerText: { color: '#00ccff', fontSize: 20, fontWeight: 'bold' },
  settingsButton: {
    position: 'absolute',
    left: 10,
    top: 15,
  },
  settingsIcon: {
    fontSize: 18,
    color: '#00ccff',
  },
});
