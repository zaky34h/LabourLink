import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { clearSession } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateLabourerProfile } from "../../src/auth/updateLabourerProfile";
import { FormScreen } from "../../src/ui/FormScreen";

export default function LabourerProfile() {
  const { user, loading, reload } = useCurrentUser();
  const [saving, setSaving] = useState(false);

  const [photoUrl, setPhotoUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (user?.role === "labourer") {
      setPhotoUrl(user.photoUrl ?? "");
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setAbout(user.about ?? "");
      setPricePerHour(String(user.pricePerHour ?? ""));
      setExperienceYears(String(user.experienceYears ?? ""));
      setCertifications((user.certifications ?? []).length ? user.certifications : [""]);
      setBsb(user.bsb ?? "");
      setAccountNumber(user.accountNumber ?? "");
    }
  }, [user]);

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) setPhotoUrl(uri);
    }
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
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [""];
    });
  }

  const parsedCertifications = useMemo(
    () => certifications.map((x) => x.trim()).filter(Boolean),
    [certifications]
  );

  async function onSave() {
    if (!user?.email || user.role !== "labourer") return;
    if (!firstName.trim() || !lastName.trim()) {
      return Alert.alert("Missing info", "First and last name are required.");
    }

    const rate = Number(pricePerHour);
    if (!Number.isFinite(rate) || rate <= 0) {
      return Alert.alert("Invalid rate", "Hourly rate must be greater than 0.");
    }

    const exp = Number(experienceYears);
    if (!Number.isFinite(exp) || exp < 0) {
      return Alert.alert("Invalid experience", "Experience must be 0 or higher.");
    }

    if (parsedCertifications.length === 0) {
      return Alert.alert("Missing certifications", "Add at least one certification.");
    }

    setSaving(true);
    const res = await updateLabourerProfile(user.email, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      about: about.trim(),
      pricePerHour: rate,
      experienceYears: exp,
      certifications: parsedCertifications,
      photoUrl: photoUrl.trim() || undefined,
      bsb: bsb.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
    });
    setSaving(false);

    if (!res.ok) return Alert.alert("Couldn’t save", res.error);
    await reload();
    Alert.alert("Saved", "Your profile has been updated.");
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user || user.role !== "labourer") {
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
    <FormScreen>
      <View style={{ padding: 24, paddingTop: 60, gap: 12, paddingBottom: 30 }}>
        <Text style={{ fontSize: 26, fontWeight: "900" }}>Profile</Text>

        <View style={{ padding: 14, borderWidth: 1, borderColor: "#111111", borderRadius: 12, gap: 10 }}>
          <Text style={{ fontWeight: "900" }}>Profile Photo</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                backgroundColor: "#FDE047",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#111111",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={{ fontWeight: "900", fontSize: 20 }}>
                  {firstName[0] ?? "L"}
                  {lastName[0] ?? ""}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={pickPhoto}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: "#111",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FDE047", fontWeight: "900" }}>Choose Photo</Text>
              </Pressable>
              <Pressable
                onPress={() => setPhotoUrl("")}
                style={{
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#111111",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Field label="First Name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name" value={lastName} onChangeText={setLastName} />
        <Field
          label="Rate ($/hr)"
          value={pricePerHour}
          onChangeText={setPricePerHour}
          keyboardType="numeric"
        />
        <Field
          label="Experience (years)"
          value={experienceYears}
          onChangeText={setExperienceYears}
          keyboardType="numeric"
        />

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>Certifications</Text>
          {certifications.map((certification, index) => {
            const isLast = index === certifications.length - 1;
            const canRemove = certifications.length > 1;
            return (
              <View key={`cert-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  value={certification}
                  onChangeText={(value) => updateCertification(index, value)}
                  placeholder="e.g. White Card"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#111111",
                    borderRadius: 10,
                    padding: 14,
                  }}
                />
                {isLast ? (
                  <Pressable
                    onPress={addCertificationRow}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#111",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#FDE047", fontWeight: "900", fontSize: 18 }}>+</Text>
                  </Pressable>
                ) : null}
                {canRemove ? (
                  <Pressable
                    onPress={() => removeCertificationRow(index)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: "#111111",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>-</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <Field label="BSB" value={bsb} onChangeText={setBsb} keyboardType="number-pad" />
        <Field
          label="Account Number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
        />
        <Field label="About" value={about} onChangeText={setAbout} multiline />

        <View style={{ padding: 14, borderWidth: 1, borderColor: "#111111", borderRadius: 12, gap: 6 }}>
          <Text style={{ fontWeight: "800" }}>Availability</Text>
          <Text style={{ opacity: 0.8 }}>All days available by default.</Text>
          <Pressable onPress={() => router.push("/labourer/schedule")}>
            <Text style={{ marginTop: 2, fontWeight: "800", textDecorationLine: "underline" }}>
              Edit unavailabilities
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={{
            padding: 16,
            backgroundColor: saving ? "#444444" : "#111",
            borderRadius: 12,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: "#FDE047", fontWeight: "900" }}>{saving ? "Saving..." : "Save Changes"}</Text>
        </Pressable>

        <Pressable
          onPress={logout}
          style={{ padding: 16, borderWidth: 1, borderColor: "#111111", borderRadius: 12, alignItems: "center" }}
        >
          <Text style={{ fontWeight: "900" }}>Logout</Text>
        </Pressable>
      </View>
    </FormScreen>
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
          borderColor: "#111111",
          borderRadius: 10,
          padding: 14,
          minHeight: rest.multiline ? 90 : undefined,
          textAlignVertical: rest.multiline ? "top" : "auto",
        }}
      />
    </View>
  );
}
