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
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { clearSession, type BuilderReview } from "../../src/auth/storage";
import { useCurrentUser } from "../../src/auth/useCurrentUser";
import { updateBuilderProfile } from "../../src/auth/updateProfile";

export default function BuilderProfile() {
  const { user, loading, reload } = useCurrentUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [about, setAbout] = useState("");
  const [address, setAddress] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [reviewsOpen, setReviewsOpen] = useState(false);

  useEffect(() => {
    if (user?.role === "builder") {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setCompanyName(user.companyName);
      setAbout(user.about);
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
      about,
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
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 14, paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 26, fontWeight: "900" }}>Profile</Text>

      <View style={{ padding: 14, borderWidth: 1, borderColor: "#111111", borderRadius: 12, gap: 10 }}>
        <Text style={{ fontWeight: "900" }}>Company Logo</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: "#FDE047",
              borderWidth: 1,
              borderColor: "#111111",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {companyLogoUrl.trim() ? (
              <Image source={{ uri: companyLogoUrl.trim() }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ fontWeight: "900", fontSize: 22 }}>
                {companyName.trim().slice(0, 1).toUpperCase() || "C"}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 18, fontWeight: "900" }} numberOfLines={2}>
              {companyName || "Company Name"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={chooseLogoFromCameraRoll}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: "#111",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FDE047", fontWeight: "900" }}>Choose from Camera Roll</Text>
          </Pressable>

          <Pressable
            onPress={() => setCompanyLogoUrl("")}
            style={{
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#111111",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ fontWeight: "900" }}>Remove</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderColor: "#111111", borderRadius: 12 }}>
        <Text style={{ fontWeight: "800" }}>Company Rating</Text>
        <Text style={{ marginTop: 6, opacity: 0.85, fontWeight: "800" }}>
          {normalizedRating.toFixed(1)} / 5.0
        </Text>
        <Text style={{ marginTop: 4, opacity: 0.75 }}>
          {stars} ({reviews.length} review{reviews.length === 1 ? "" : "s"})
        </Text>
      </View>

      <Field label="First Name" value={firstName} onChangeText={setFirstName} />
      <Field label="Last Name" value={lastName} onChangeText={setLastName} />
      <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
      <Field label="About Yourself" value={about} onChangeText={setAbout} multiline />
      <Field label="Address" value={address} onChangeText={setAddress} />

      <Pressable
        onPress={() => setReviewsOpen(true)}
        style={{ padding: 16, borderWidth: 1, borderColor: "#111111", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "900" }}>
          Reviews ({reviews.length})
        </Text>
      </Pressable>

      <Pressable
        onPress={onSave}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12, alignItems: "center", marginTop: 6 }}
      >
        <Text style={{ color: "#FDE047", fontWeight: "800" }}>Save Changes</Text>
      </Pressable>

      <Pressable
        onPress={logout}
        style={{ padding: 16, borderWidth: 1, borderColor: "#111111", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "800" }}>Logout</Text>
      </Pressable>

      <Modal visible={reviewsOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "75%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Company Reviews</Text>
              <Pressable onPress={() => setReviewsOpen(false)}>
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {reviews.length === 0 ? (
                <Text style={{ opacity: 0.7, fontWeight: "700", marginTop: 6 }}>
                  No reviews yet.
                </Text>
              ) : (
                reviews
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((review) => (
                    <View
                      key={review.id}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "#111111",
                        borderRadius: 12,
                        marginBottom: 10,
                        backgroundColor: "#fff",
                      }}
                    >
                      <Text style={{ fontWeight: "900" }}>{review.labourerName}</Text>
                      <Text style={{ marginTop: 4, opacity: 0.8 }}>
                        {"★".repeat(Math.round(Math.max(0, Math.min(5, review.rating))))}
                        {"☆".repeat(5 - Math.round(Math.max(0, Math.min(5, review.rating))))}
                        {"  "}
                        {Math.max(0, Math.min(5, review.rating)).toFixed(1)} / 5.0
                      </Text>
                      <Text style={{ marginTop: 6, opacity: 0.85 }}>{review.comment}</Text>
                      <Text style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
