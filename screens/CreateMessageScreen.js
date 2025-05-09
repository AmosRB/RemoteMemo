// screens/CreateMessageScreen.js
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';

export default function CreateMessageScreen() {
  const [message, setMessage] = useState('');

  const handleSave = () => {
    alert(`הודעה נשמרה: ${message}`);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>הקלד את ההודעה שלך:</Text>
      <TextInput
        style={{ borderWidth: 1, marginVertical: 10, padding: 10 }}
        placeholder="ההודעה כאן"
        value={message}
        onChangeText={setMessage}
      />
      <Button title="שמור הודעה" onPress={handleSave} />
    </View>
  );
}