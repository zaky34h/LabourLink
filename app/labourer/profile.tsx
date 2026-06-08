import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Linking,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { clearSession, deleteAccount, type CertificationDoc } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateLabourerProfile } from "../../src/auth/updateLabourerProfile";
import { FormScreen } from "../../src/ui/FormScreen";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

export default function LabourerProfile() {
  const { user, loading, reload } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [photoUrl, setPhotoUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [certDocs, setCertDocs] = useState<CertificationDoc[]>([]);
  const [newCertName, setNewCertName] = useState("");
  const [newCertExpiry, setNewCertExpiry] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (user?.role === "labourer") {
      setPhotoUrl(user.photoUrl ?? "");
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setPricePerHour(String(user.pricePerHour ?? ""));
      setCertifications((user.certifications ?? []).length ? user.certifications : [""]);
      setCertDocs(user.certificationDocs ?? []);
      setBsb(user.bsb ?? "");
      setAccountNumber(user.accountNumber ?? "");
    }
  }, [user]);

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  function onDeleteAccountPress() {
    Alert.alert(
      "Delete account?",
      "This will permanently delete your account and data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void confirmDeleteAccount();
          },
        },
      ]
    );
  }

  async function confirmDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    const res = await deleteAccount();
    setDeleting(false);
    if (!res.ok) return Alert.alert("Couldn’t delete account", res.error);
    Alert.alert("Account deleted", "Your account has been deleted.", [
      { text: "OK", onPress: () => router.replace("/") },
    ]);
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

  async function addCertDoc() {
    const expiry = newCertExpiry.trim();
    if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      return Alert.alert("Invalid expiry date", "Use the format YYYY-MM-DD, or leave it blank.");
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const name = newCertName.trim() || asset.name || "Certification";
    const doc: CertificationDoc = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      fileUrl: asset.uri,
      uploadedAt: Date.now(),
      ...(expiry ? { expiryDate: expiry } : {}),
    };
    setCertDocs((prev) => [...prev, doc]);
    setNewCertName("");
    setNewCertExpiry("");
  }

  function removeCertDoc(id: string) {
    setCertDocs((prev) => prev.filter((doc) => doc.id !== id));
  }

  function openCertDoc(doc: CertificationDoc) {
    Linking.openURL(doc.fileUrl).catch(() => {
      Alert.alert("Couldn’t open file", "This document can’t be previewed on your device.");
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

    if (parsedCertifications.length === 0) {
      return Alert.alert("Missing certifications", "Add at least one certification.");
    }

    setSaving(true);
    const res = await updateLabourerProfile(user.email, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      pricePerHour: rate,
      certifications: parsedCertifications,
      certificationDocs: certDocs,
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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user || user.role !== "labourer") {
    return (
      <View style={{ flex: 1, padding: spacing.xl, paddingTop: 60, backgroundColor: colors.background }}>
        <Text style={type.h2}>Not logged in</Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: spacing.md }}>
          <Text style={{ ...type.body, fontWeight: fontWeight.heavy }}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FormScreen backgroundColor={colors.background}>
      <View style={{ padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md, paddingBottom: 30 }}>
        <Text style={type.h1}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Profile Photo</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={styles.avatar}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.h2, color: colors.text }}>
                  {firstName[0] ?? "L"}
                  {lastName[0] ?? ""}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button label="Choose Photo" onPress={pickPhoto} />
              </View>
              <View style={{ width: 96 }}>
                <Button label="Remove" variant="secondary" onPress={() => setPhotoUrl("")} />
              </View>
            </View>
          </View>
        </View>

        <Field label="First Name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name" value={lastName} onChangeText={setLastName} />
        <Field label="Rate ($/hr)" value={pricePerHour} onChangeText={setPricePerHour} keyboardType="numeric" />

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.fieldLabel}>Certifications</Text>
          {certifications.map((certification, index) => {
            const isLast = index === certifications.length - 1;
            const canRemove = certifications.length > 1;
            return (
              <View key={`cert-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <TextInput
                  value={certification}
                  onChangeText={(value) => updateCertification(index, value)}
                  placeholder="e.g. White Card"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { flex: 1 }]}
                />
                {isLast ? (
                  <Pressable onPress={addCertificationRow} style={[styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.borderStrong }]}>
                    <Ionicons name="add" size={20} color={colors.onPrimary} />
                  </Pressable>
                ) : null}
                {canRemove ? (
                  <Pressable onPress={() => removeCertificationRow(index)} style={[styles.iconBtn, { backgroundColor: colors.field, borderColor: colors.border }]}>
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Certification Documents</Text>
          <Text style={type.secondary}>Upload an image or PDF of each certification.</Text>

          {certDocs.length ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {certDocs.map((doc) => {
                const isPdf = isPdfDoc(doc);
                return (
                  <View key={doc.id} style={styles.docRow}>
                    {isPdf ? (
                      <View style={styles.docThumb}>
                        <Ionicons name="document-text-outline" size={24} color={colors.text} />
                      </View>
                    ) : (
                      <Image source={{ uri: doc.fileUrl }} style={styles.docThumb} />
                    )}
                    <Pressable style={{ flex: 1 }} onPress={() => openCertDoc(doc)}>
                      <Text numberOfLines={1} style={styles.docName}>
                        {doc.name}
                      </Text>
                      <Text style={type.secondary}>
                        Added {formatDate(doc.uploadedAt)}
                        {doc.expiryDate ? ` · Expires ${doc.expiryDate}` : ""}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeCertDoc(doc.id)}
                      style={[styles.iconBtn, { backgroundColor: colors.field, borderColor: colors.border }]}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.dangerText} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ ...type.secondary, marginTop: spacing.xs }}>No certification documents yet.</Text>
          )}

          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <TextInput
              value={newCertName}
              onChangeText={setNewCertName}
              placeholder="Name (e.g. White Card)"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <TextInput
              value={newCertExpiry}
              onChangeText={setNewCertExpiry}
              placeholder="Expiry date YYYY-MM-DD (optional)"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            <Button label="Add Image or PDF" variant="secondary" onPress={addCertDoc} />
          </View>
        </View>

        <Field label="BSB" value={bsb} onChangeText={setBsb} keyboardType="number-pad" />
        <Field label="Account Number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />

        <View style={[styles.card, { gap: 6 }]}>
          <Text style={styles.fieldLabel}>Availability</Text>
          <Text style={type.secondary}>All days available by default.</Text>
          <Pressable onPress={() => router.push("/labourer/schedule")}>
            <Text style={{ marginTop: 2, fontFamily, fontWeight: fontWeight.heavy, color: colors.text, textDecorationLine: "underline" }}>
              Edit unavailabilities
            </Text>
          </Pressable>
        </View>

        <Button
          label={saving ? "Saving..." : "Save Changes"}
          onPress={onSave}
          loading={saving}
          disabled={saving || deleting}
          style={{ marginTop: spacing.xs }}
        />

        <Button label="Logout" variant="secondary" onPress={logout} disabled={deleting} />

        <Button
          label={deleting ? "Deleting Account..." : "Delete Account"}
          variant="destructive"
          onPress={onDeleteAccountPress}
          loading={deleting}
          disabled={deleting}
        />
      </View>
    </FormScreen>
  );
}

function isPdfDoc(doc: CertificationDoc) {
  const target = `${doc.fileUrl} ${doc.name}`.toLowerCase();
  return target.includes(".pdf") || target.includes("application/pdf");
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
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
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.field,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
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
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.field,
  },
  docThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  docName: {
    fontFamily,
    fontSize: fontSize.body,
    fontWeight: fontWeight.heavy,
    color: colors.text,
  },
});
