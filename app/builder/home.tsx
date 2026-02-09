import { View, Text } from "react-native";

export default function BuilderHome() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "800" }}>Builder Home</Text>
      <Text style={{ opacity: 0.7 }}>Next: Browse labourers + filters</Text>
    </View>
  );
}