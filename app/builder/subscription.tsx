import { View, Text, ActivityIndicator } from "react-native";
import { useCurrentUser } from "../../src/auth/useCurrentUser";

const defaultSubscription = {
  planName: "Starter",
  status: "trial",
  monthlyPrice: 0,
  renewalDate: null as string | null,
};

export default function BuilderSubscription() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user || user.role !== "builder") {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>No builder account</Text>
        <Text style={{ marginTop: 6, opacity: 0.7 }}>
          Log in as a builder to see subscription details.
        </Text>
      </View>
    );
  }

  const sub = user.subscription ?? defaultSubscription;
  const renewalLabel = sub.renewalDate
    ? new Date(sub.renewalDate).toLocaleDateString()
    : "No renewal set";

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Subscription</Text>

      <View
        style={{
          marginTop: 16,
          backgroundColor: "#fff",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#111111",
          padding: 16,
          gap: 10,
        }}
      >
        <Row label="Plan" value={sub.planName} />
        <Row label="Status" value={sub.status.replace("_", " ")} />
        <Row
          label="Billing"
          value={sub.monthlyPrice > 0 ? `$${sub.monthlyPrice}/month` : "Free"}
        />
        <Row label="Renewal" value={renewalLabel} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ opacity: 0.7, fontWeight: "700" }}>{label}</Text>
      <Text style={{ fontWeight: "900", textTransform: "capitalize" }}>{value}</Text>
    </View>
  );
}
