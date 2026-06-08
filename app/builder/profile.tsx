import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { clearSession, deleteAccount, type BuilderReview } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateBuilderProfile } from "../../src/auth/updateProfile";
import { FormScreen } from "../../src/ui/FormScreen";
import { colors, spacing, radii, fontFamily, fontSize, fontWeight, type } from "../../src/theme";
import Button from "../../src/ui/Button";

export default function BuilderProfile() {
  const { user, loading, reload } = useCurrentUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.role === "builder") {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setCompanyName(user.companyName);
      setAddress(user.address);
      setCompanyLogoUrl(user.companyLogoUrl ?? "");
    }
  }, [user]);

  async function onSave() {
    if (!user || user.role !== "builder") return;

    const res = await updateBuilderProfile(user.email, {
      firstName,
      lastName,
      companyName,
      address,
      companyLogoUrl: companyLogoUrl.trim() || undefined,
    });

    if (!res.ok) return Alert.alert("Couldn’t save", res.error);
    await reload();
    Alert.alert("Saved", "Profile updated.");
  }

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

  async function chooseLogoFromCameraRoll() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to choose a logo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setCompanyLogoUrl(uri);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user || user.role !== "builder") {
    return (
      <View style={{ flex: 1, padding: spacing.xl, paddingTop: 60, backgroundColor: colors.background }}>
        <Text style={type.h2}>Not logged in</Text>
        <Pressable onPress={() => router.replace("/")} style={{ marginTop: spacing.md }}>
          <Text style={{ ...type.body, fontWeight: fontWeight.heavy }}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  const reviews = (user.reviews ?? []) as BuilderReview[];
  const computedRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (Number.isFinite(r.rating) ? r.rating : 0), 0) / reviews.length
      : typeof user.companyRating === "number" && Number.isFinite(user.companyRating)
        ? user.companyRating
        : 0;
  const normalizedRating = Math.max(0, Math.min(5, computedRating));
  const stars =
    "★".repeat(Math.round(normalizedRating)) +
    "☆".repeat(5 - Math.round(normalizedRating));

  return (
    <FormScreen backgroundColor={colors.background}>
      <View style={{ padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md, paddingBottom: 30 }}>
        <Text style={type.h1}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Company Logo</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={styles.avatar}>
              {companyLogoUrl.trim() ? (
                <Image source={{ uri: companyLogoUrl.trim() }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={{ fontFamily, fontWeight: fontWeight.heavy, fontSize: fontSize.h2, color: colors.text }}>
                  {companyName.trim().slice(0, 1).toUpperCase() || "C"}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily, fontSize: fontSize.h3, fontWeight: fontWeight.heavy, color: colors.text }} numberOfLines={2}>
                {companyName || "Company Name"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="Choose from Camera Roll" onPress={chooseLogoFromCameraRoll} />
            </View>
            <View style={{ width: 96 }}>
              <Button label="Remove" variant="secondary" onPress={() => setCompanyLogoUrl("")} />
            </View>
          </View>
        </View>

        <View style={[styles.card, { gap: 6 }]}>
          <Text style={styles.fieldLabel}>Company Rating</Text>
          <Text style={{ ...type.body, fontWeight: fontWeight.heavy }}>
            {normalizedRating.toFixed(1)} / 5.0
          </Text>
          <Text style={type.secondary}>
            {stars} ({reviews.length} review{reviews.length === 1 ? "" : "s"})
          </Text>
        </View>

        <Field label="First Name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name" value={lastName} onChangeText={setLastName} />
        <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
        <Field label="Address" value={address} onChangeText={setAddress} />

        <Button label={`Reviews (${reviews.length})`} variant="secondary" onPress={() => setReviewsOpen(true)} />

        <Button
          label="Save Changes"
          onPress={onSave}
          disabled={deleting}
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

        <Modal visible={reviewsOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <Text style={type.h2}>Company Reviews</Text>
                <Pressable onPress={() => setReviewsOpen(false)}>
                  <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>Done</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {reviews.length === 0 ? (
                  <Text style={{ ...type.secondary, marginTop: 6 }}>
                    No reviews yet.
                  </Text>
                ) : (
                  reviews
                    .slice()
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((review) => (
                      <View key={review.id} style={styles.reviewCard}>
                        <Text style={{ fontFamily, fontWeight: fontWeight.heavy, color: colors.text }}>{review.labourerName}</Text>
                        <Text style={{ ...type.secondary, marginTop: 4 }}>
                          {"★".repeat(Math.round(Math.max(0, Math.min(5, review.rating))))}
                          {"☆".repeat(5 - Math.round(Math.max(0, Math.min(5, review.rating))))}
                          {"  "}
                          {Math.max(0, Math.min(5, review.rating)).toFixed(1)} / 5.0
                        </Text>
                        <Text style={{ ...type.body, marginTop: 6 }}>{review.comment}</Text>
                        <Text style={{ ...type.secondary, marginTop: 6, fontSize: fontSize.caption }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </FormScreen>
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
  reviewCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "75%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
});
