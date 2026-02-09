import { View, Text } from "react-native";
import { useCurrentUser } from "../../src/auth/useCurrentUser";

export default function BuilderHome() {
  const { user } = useCurrentUser();

  const company = user?.role === "builder" ? user.companyName : "Company";

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Welcome,</Text>
      <Text style={{ fontSize: 20, fontWeight: "800" }}>{company}</Text>

      <View style={{ height: 8 }} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Active Chats" value="0" />
        <StatCard title="Saved Labourers" value="0" />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Quotes Requested" value="0" />
        <StatCard title="Jobs Booked" value="0" />
      </View>

      <Text style={{ marginTop: 10, opacity: 0.7 }}>
        Next: we’ll make Browse filters + availability, and Messages show chats.
      </Text>
    </View>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
      <Text style={{ fontWeight: "800" }}>{value}</Text>
      <Text style={{ opacity: 0.7, marginTop: 6 }}>{title}</Text>
    </View>
  );
}