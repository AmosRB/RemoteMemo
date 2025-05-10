export default function ReceivedMessageScreen() {
    const route = useRoute();
    const { message } = route.params;
  
    const [isPlayed, setIsPlayed] = useState(false);
  
    const handleMarkAsRead = () => {
      // update status to 'read'
    };
  
    const handlePlayAudio = () => {
      // play audio if available
    };
  
    return (
      <View>
        <Text>התקבלה הודעה חדשה!</Text>
        <Text>{message.shortName}</Text>
        <Text>{message.text}</Text>
  
        {message.audioUri && (
          <Button title="השמע הקלטה" onPress={handlePlayAudio} />
        )}
  
        <Text>סטטוס: {message.status}</Text>
  
        <Button title="סמן כנקרא" onPress={handleMarkAsRead} />
      </View>
    );
  }
  