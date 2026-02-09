import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useCurrentUser } from "../../src/auth/useCurrentUser";

export default function BuilderHome() {
  const { user } = useCurrentUser();

  const company = user?.role === "builder" ? user.companyName : "Builder";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 14, opacity: 0.6 }}>Welcome back</Text>
        <Text style={{ fontSize: 28, fontWeight: "900" }}>{company}</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Active Chats" value="0" />
        <StatCard title="Quotes Sent" value="0" />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard title="Saved Labourers" value="0" />
        <StatCard title="Upcoming Jobs" value="0" />
      </View>

      {/* Quick Actions */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Quick Actions</Text>

        <ActionButton
          label="Browse Labourers"
          subtitle="Find available workers by trade & date"
          onPress={() => router.push("/builder/browse")}
        />

        <ActionButton
          label="Messages"
          subtitle="View conversations with labourers"
          onPress={() => router.push("/builder/messages")}
        />

        <ActionButton
          label="Create Quote"
          subtitle="Send a quote to a labourer (coming soon)"
          disabled
        />
      </View>

      {/* Activity */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Recent Activity</Text>

        <ActivityItem text="No recent activity yet" />
        <ActivityItem text="Browse labourers to get started" muted />
      </View>
    </ScrollView>
  );
}

/* ======================
   Components
====================== */

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#111111",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "900" }}>{value}</Text>
      <Text style={{ marginTop: 6, opacity: 0.7, fontWeight: "700" }}>
        {title}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  subtitle,
  onPress,
  disabled,
}: {
  label: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        backgroundColor: disabled ? "#FDE047" : "#111",
        padding: 16,
        borderRadius: 16,
      }}
    >
      <Text
        style={{
          color: disabled ? "#333333" : "#FDE047",
          fontWeight: "900",
          fontSize: 16,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: disabled ? "#444444" : "#FDE047",
          marginTop: 4,
          fontWeight: "600",
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function ActivityItem({
  text,
  muted,
}: {
  text: string;
  muted?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#111111",
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          opacity: muted ? 0.5 : 0.85,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
