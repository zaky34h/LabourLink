import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { completeOnboarding, deleteAccount } from "../../src/auth/storage";
import { routeForUser } from "../../src/auth/routing";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading, reload } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState<"builder" | "labourer" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== "pending") {
      router.replace(routeForUser(user));
    }
  }, [loading, user]);

  function selectRole(role: "builder" | "labourer") {
    setSelectedRole(role);
  }

  function updateCertification(index: number, value: string) {
    setCertifications((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addCertificationRow() {
    setCertifications((prev) => [...prev, ""]);
  }

  function removeCertificationRow(index: number) {
    setCertifications((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length ? next : [""];
    });
  }

  async function onSubmit() {
    if (!selectedRole || submitting || discarding) {
      return Alert.alert("Pick a role", "Tap to choose whether you’re a builder or labourer.");
    }

    if (!fullName.trim()) {
      return Alert.alert("Missing info", "Please enter your name.");
    }

    // Split the single "Full Name" field into first/last for the backend
    // (first word = first name, remainder = last name).
    const trimmedName = fullName.trim();
    const firstSpace = trimmedName.indexOf(" ");
    const firstName = firstSpace === -1 ? trimmedName : trimmedName.slice(0, firstSpace);
    const lastName = firstSpace === -1 ? "" : trimmedName.slice(firstSpace + 1).trim();

    setSubmitting(true);
    try {
      const res =
        selectedRole === "builder"
          ? await completeOnboarding({
              role: "builder",
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              companyName: companyName.trim(),
              address: address.trim(),
            })
          : await completeOnboarding({
              role: "labourer",
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              pricePerHour: Number(pricePerHour),
              certifications: certifications.map((item) => item.trim()).filter(Boolean),
              bsb: bsb.trim(),
              accountNumber: accountNumber.trim(),
            });

      if (!res.ok) return Alert.alert("Couldn’t finish setup", res.error);

      await reload();
      router.replace(routeForUser(res.user));
    } finally {
      setSubmitting(false);
    }
  }

  function onBackPress() {
    if (submitting || discarding) return;
    void discardPendingAccount();
  }

  async function discardPendingAccount() {
    if (discarding) return;
    setDiscarding(true);
    try {
      const res = await deleteAccount();
      if (!res.ok) {
        return Alert.alert("Couldn’t go back", res.error);
      }
      router.replace("/");
    } finally {
      setDiscarding(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <Text style={type.h2}>No active session</Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: spacing.md }}>
          <Text style={{ ...type.body, fontWeight: fontWeight.heavy }}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* soft cream background blobs — full-bleed to the screen edges */}
      <View style={[styles.blob, { top: -70, right: -70 }]} />
      <View style={[styles.blob, { bottom: -70, left: -70 }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="always"
          extraScrollHeight={20}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={{ alignItems: "center" }}>
            <Image
              source={require("../../assets/labourlink-logo.png")}
              style={{ width: 220, height: 90 }}
              resizeMode="contain"
            />
            <Text style={[type.display, { marginTop: spacing.sm }]}>Which one are you?</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <RoleCard
              title="Labourer"
              subtitle="Looking for jobs and availability"
              active={selectedRole === "labourer"}
              onPress={() => selectRole("labourer")}
            />
            <RoleCard
              title="Builder"
              subtitle="Hiring crews and posting work"
              active={selectedRole === "builder"}
              onPress={() => selectRole("builder")}
            />
          </View>

          <View style={styles.card}>
            <Text style={type.h2}>
              {selectedRole === "labourer"
                ? "Labourer details"
                : selectedRole === "builder"
                  ? "Builder details"
                  : "Pick your side to continue"}
            </Text>

            {selectedRole ? (
              <>
                <Field label="Full Name" value={fullName} onChangeText={setFullName} />

                {selectedRole === "labourer" ? (
                  <>
                    <Field
                      label="Rate ($/hr)"
                      value={pricePerHour}
                      onChangeText={setPricePerHour}
                      keyboardType="numeric"
                    />

                    <View style={{ gap: spacing.sm }}>
                      <Text style={styles.fieldLabel}>Certifications</Text>
                      {certifications.map((certification, index) => (
                        <View key={`cert-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <TextInput
                            value={certification}
                            onChangeText={(value) => updateCertification(index, value)}
                            placeholder="e.g. White Card"
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.input, { flex: 1 }]}
                          />
                          <Pressable
                            onPress={index === certifications.length - 1 ? addCertificationRow : () => removeCertificationRow(index)}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 19,
                              borderWidth: 1,
                              borderColor: index === certifications.length - 1 ? colors.borderStrong : colors.border,
                              backgroundColor: index === certifications.length - 1 ? colors.primary : colors.field,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name={index === certifications.length - 1 ? "add" : "remove"}
                              size={20}
                              color={index === certifications.length - 1 ? colors.onPrimary : colors.text}
                            />
                          </Pressable>
                        </View>
                      ))}
                    </View>

                    <Field label="BSB" value={bsb} onChangeText={setBsb} keyboardType="number-pad" />
                    <Field
                      label="Account Number"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      keyboardType="number-pad"
                    />
                  </>
                ) : (
                  <>
                    <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
                    <Field label="Address" value={address} onChangeText={setAddress} />
                  </>
                )}
              </>
            ) : (
              <Text style={{ ...type.secondary, lineHeight: 21 }}>
                Tap Labourer or Builder above to choose your side. The matching setup form will appear here.
              </Text>
            )}

            <Button
              label={submitting ? "Finishing setup..." : "Finish Account Setup"}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || discarding || !selectedRole}
              style={{ marginTop: spacing.sm }}
            />

            <Button
              label={discarding ? "Deleting account..." : "Back"}
              variant="secondary"
              onPress={onBackPress}
              disabled={submitting || discarding}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RoleCard({
  title,
  subtitle,
  active,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 112,
        borderRadius: radii.lg,
        padding: spacing.lg,
        backgroundColor: active ? colors.primary : colors.field,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: fontSize.h3,
          fontWeight: fontWeight.heavy,
          color: active ? colors.onPrimary : colors.text,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily,
          fontSize: fontSize.label,
          lineHeight: 19,
          color: active ? colors.onPrimary : colors.textSecondary,
          opacity: active ? 0.9 : 1,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function Field(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          rest.multiline ? { minHeight: 90, textAlignVertical: "top", paddingTop: 12 } : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  screen: { flex: 1, overflow: "hidden", backgroundColor: colors.background },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldLabel: {
    fontFamily,
    fontSize: fontSize.eyebrow,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  input: {
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily,
    fontSize: fontSize.body,
    color: colors.text,
  },
});
