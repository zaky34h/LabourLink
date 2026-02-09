import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { clearSession } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateBuilderProfile } from "../../src/auth/updateProfile";

export default function BuilderProfile() {
  const { user, loading, reload } = useCurrentUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [about, setAbout] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (user?.role === "builder") {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setCompanyName(user.companyName);
      setAbout(user.about);
      setAddress(user.address);
    }
  }, [user]);

  async function onSave() {
    if (!user || user.role !== "builder") return;

    const res = await updateBuilderProfile(user.email, {
      firstName,
      lastName,
      companyName,
      about,
      address,
    });

    if (!res.ok) return Alert.alert("Couldn’t save", res.error);
    await reload();
    Alert.alert("Saved", "Profile updated.");
  }

  async function logout() {
    await clearSession();
    router.replace("/");
  }

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
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Not logged in</Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "800" }}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Profile</Text>

      {/* Stars placeholder */}
      <View style={{ padding: 14, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
        <Text style={{ fontWeight: "800" }}>Company Stars</Text>
        <Text style={{ marginTop: 6, opacity: 0.7 }}>⭐ 0.0 (coming soon)</Text>
      </View>

      <Field label="First Name" value={firstName} onChangeText={setFirstName} />
      <Field label="Last Name" value={lastName} onChangeText={setLastName} />
      <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
      <Field label="About Yourself" value={about} onChangeText={setAbout} multiline />
      <Field label="Address" value={address} onChangeText={setAddress} />

      <Pressable
        onPress={onSave}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12, alignItems: "center", marginTop: 6 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Save Changes</Text>
      </Pressable>

      <Pressable
        onPress={logout}
        style={{ padding: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "800" }}>Logout</Text>
      </Pressable>
    </View>
  );
}

function Field(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700" }}>{label}</Text>
      <TextInput
        {...rest}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 14,
          minHeight: rest.multiline ? 90 : undefined,
          textAlignVertical: rest.multiline ? "top" : "auto",
        }}
      />
    </View>
  );
}