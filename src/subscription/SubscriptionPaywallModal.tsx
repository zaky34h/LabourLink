import { Alert, Modal, Pressable, Text, View } from "react-native";
import type { BuilderSubscription } from "../auth/storage";

type Props = {
  visible: boolean;
  loading: boolean;
  subscription?: BuilderSubscription | null;
  onStartTrial: () => Promise<void>;
  onSubscribe: () => Promise<void>;
  onRestore: () => Promise<void>;
  onCustomerCenter?: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export function SubscriptionPaywallModal({
  visible,
  loading,
  subscription,
  onStartTrial,
  onSubscribe,
  onRestore,
  onCustomerCenter,
  onLogout,
}: Props) {
  const renewalLabel = subscription?.renewalDate
    ? new Date(subscription.renewalDate).toLocaleDateString()
    : "Not active";

  async function run(action: () => Promise<void>, failTitle: string) {
    try {
      await action();
    } catch (error: any) {
      Alert.alert(failTitle, error?.message || "Please try again.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#111111",
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "900" }}>Start your free trial</Text>
          <Text style={{ fontWeight: "700", opacity: 0.75 }}>
            7-day free trial, then $50/month billed by Apple. Cancel any time in Apple Subscriptions.
          </Text>
          <Text style={{ opacity: 0.7 }}>
            Current status: {subscription?.status?.replace("_", " ") || "Not active"} • Renewal: {renewalLabel}
          </Text>

          <Pressable
            disabled={loading}
            onPress={() => run(onStartTrial, "Couldn’t start trial")}
            style={{
              marginTop: 6,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: "#111111",
              opacity: loading ? 0.65 : 1,
            }}
          >
            <Text style={{ color: "#FDE047", fontWeight: "900" }}>Start 7-Day Free Trial</Text>
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={() => run(onSubscribe, "Couldn’t activate subscription")}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#111111",
              opacity: loading ? 0.65 : 1,
            }}
          >
            <Text style={{ fontWeight: "900" }}>Continue with Apple Purchase</Text>
          </Pressable>

          <Pressable
            disabled={loading}
            onPress={() => run(onRestore, "Couldn’t restore")}
            style={{
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800" }}>Restore Purchase</Text>
          </Pressable>

          {onCustomerCenter ? (
            <Pressable
              disabled={loading}
              onPress={() => run(onCustomerCenter, "Couldn’t open subscription settings")}
              style={{
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800" }}>Manage Subscription</Text>
            </Pressable>
          ) : null}

          <Pressable
            disabled={loading}
            onPress={() => run(onLogout, "Couldn’t log out")}
            style={{
              borderRadius: 10,
              paddingVertical: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ opacity: 0.7, fontWeight: "700" }}>Log out</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
