// App.js (fixed with MessagesProvider)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import MessageDetailScreen from './screens/MessageDetailScreen';
import JournalScreen from './screens/JournalScreen';
import CreateMessageScreen from './screens/CreateMessageScreen';
import SettingsScreen from './screens/SettingsScreen';
import { View, Text, StyleSheet } from 'react-native';
import { MessagesProvider } from './contexts/MessagesContext';

const Stack = createStackNavigator();

function AppHeader() {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerText}>Remote Memo CONNECT</Text>
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
        </Stack.Navigator>
      </NavigationContainer>
    </MessagesProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: { backgroundColor: '#001f4d', padding: 15, alignItems: 'center' },
  headerText: { color: '#00ccff', fontSize: 20, fontWeight: 'bold' },
});