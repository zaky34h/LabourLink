import { View, Text } from "react-native";

export default function BuilderMessages() {
  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Messages</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>
        Next step: show all chats with labourers.
      </Text>
    </View>
  );
}