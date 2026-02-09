import { View, Text } from "react-native";
import { useCurrentUser } from "../../src/auth/useCurrentUser";

export default function LabourerHome() {
  const { user } = useCurrentUser();
  const name = user ? `${user.firstName} ${user.lastName}` : "Welcome";

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 10 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Home</Text>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>{name}</Text>

      <View style={{ height: 10 }} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="New Messages" value="0" />
        <StatCard title="Upcoming Jobs" value="0" />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Quotes Sent" value="0" />
        <StatCard title="Profile Views" value="0" />
      </View>

      <Text style={{ marginTop: 10, opacity: 0.7 }}>
        Next: Schedule will control your availability calendar.
      </Text>
    </View>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: 14, borderWidth: 1, borderColor: "#111111", borderRadius: 12 }}>
      <Text style={{ fontWeight: "900", fontSize: 18 }}>{value}</Text>
      <Text style={{ opacity: 0.7, marginTop: 6, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}