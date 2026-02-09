import { View, Text } from "react-native";

export default function LabourerHome() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "800" }}>Labourer Home</Text>
      <Text style={{ opacity: 0.7 }}>Next: Create profile + availability</Text>
    </View>
  );
}