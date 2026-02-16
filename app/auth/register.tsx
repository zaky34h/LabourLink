import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Modal,
  Image,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import * as ImagePicker from "expo-image-picker";
import { loginUser, registerUser, type Role, type User } from "../../src/auth/storage";
import { FormScreen } from "../../src/ui/FormScreen";

export default function Register() {
  const [role, setRole] = useState<Role>("builder");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");

  // Builder fields
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");

  // Labourer fields
  const [occupation, setOccupation] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ✅ NEW labourer fields
  const [experienceYears, setExperienceYears] = useState("");
  const [certificationsText, setCertificationsText] = useState(""); // comma separated
  const [photoUri, setPhotoUri] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Common
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function isEmailValid(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  function toggleDate(dateString: string) {
    setAvailableDates((prev) =>
      prev.includes(dateString)
        ? prev.filter((d) => d !== dateString)
        : [...prev, dateString]
    );
  }

  function parseCertifications(input: string) {
    return input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function pickPhotoFromLibrary() {
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
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setPhotoUri(uri);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setPhotoUri(uri);
  }

  function onChoosePhoto() {
    Alert.alert("Select Photo", "Choose where to get the profile photo from.", [
      { text: "Camera", onPress: () => { void takePhoto(); } },
      { text: "Camera Roll", onPress: () => { void pickPhotoFromLibrary(); } },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function onCreateAccount() {
    if (submitting) return;
    Keyboard.dismiss();
    if (!firstName.trim() || !lastName.trim())
      return Alert.alert("Missing info", "Please enter your first and last name.");
    if (!about.trim())
      return Alert.alert("Missing info", "Please add a short bio (About Yourself).");
    if (!isEmailValid(email))
      return Alert.alert("Invalid email", "Please enter a valid email address.");
    if (password.length < 6)
      return Alert.alert("Weak password", "Password must be at least 6 characters.");

    let user: User;

    if (role === "builder") {
      if (!companyName.trim())
        return Alert.alert("Missing info", "Please enter your company name.");
      if (!address.trim())
        return Alert.alert("Missing info", "Please enter your address.");

      user = {
        role: "builder",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        about: about.trim(),
        companyName: companyName.trim(),
        address: address.trim(),
        reviews: [],
        companyRating: 0,
        email: email.trim(),
        password,
      };
    } else {
      if (!occupation.trim())
        return Alert.alert("Missing info", "Please enter your occupation.");

      const rate = Number(pricePerHour);
      if (!Number.isFinite(rate) || rate <= 0)
        return Alert.alert("Invalid rate", "Price per hour must be a number greater than 0.");

      if (availableDates.length === 0)
        return Alert.alert("Availability missing", "Please select at least 1 available date.");

      const exp = Number(experienceYears);
      if (!Number.isFinite(exp) || exp < 0)
        return Alert.alert("Invalid experience", "Experience must be a number 0 or higher.");

      const certs = parseCertifications(certificationsText);
      if (certs.length === 0)
        return Alert.alert("Missing certifications", "Add at least 1 certification (comma separated).");
      if (!bsb.trim()) return Alert.alert("Missing info", "Please enter your BSB.");
      if (!accountNumber.trim()) return Alert.alert("Missing info", "Please enter your account number.");

      user = {
        role: "labourer",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        about: about.trim(),
        occupation: occupation.trim(),
        pricePerHour: rate,
        availableDates,

        // ✅ NEW fields required by LabourerUser
        experienceYears: exp,
        certifications: certs,
        photoUrl: photoUri || undefined,
        bsb: bsb.trim(),
        accountNumber: accountNumber.trim(),

        email: email.trim(),
        password,
      };
    }

    setSubmitting(true);
    try {
      const res = await registerUser(user);
      if (!res.ok) return Alert.alert("Couldn’t create account", res.error);

      const loginRes = await loginUser(email.trim(), password);
      if (!loginRes.ok) {
        return Alert.alert("Account created", "Please log in.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
      }

      if (loginRes.user.role === "builder") router.replace("/builder/home");
      else router.replace("/labourer/home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen>
      <View style={{ padding: 24, paddingTop: 60, gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: "900" }}>Create Account</Text>

        {/* Role toggle */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setRole("builder")}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: role === "builder" ? "#111" : "#FEF08A",
              borderWidth: 1,
              borderColor: role === "builder" ? "#111" : "#111111",
            }}
          >
            <Text style={{ fontWeight: "800", color: role === "builder" ? "#FDE047" : "#111" }}>
              Builder
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRole("labourer")}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: role === "labourer" ? "#111" : "#FEF08A",
              borderWidth: 1,
              borderColor: role === "labourer" ? "#111" : "#111111",
            }}
          >
            <Text style={{ fontWeight: "800", color: role === "labourer" ? "#FDE047" : "#111" }}>
              Labourer
            </Text>
          </Pressable>
        </View>

        {/* Common fields */}
        <Field label="First Name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name" value={lastName} onChangeText={setLastName} />
        <Field label="About Yourself" value={about} onChangeText={setAbout} multiline />

        {/* Role-specific fields */}
        {role === "builder" ? (
          <>
            <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
            <Field label="Address" value={address} onChangeText={setAddress} />
          </>
        ) : (
          <>
            <Field label="Occupation" value={occupation} onChangeText={setOccupation} />

            <Field
              label="Price Per Hour"
              value={pricePerHour}
              onChangeText={setPricePerHour}
              keyboardType="numeric"
            />

            {/* ✅ New Labourer fields */}
            <Field
              label="Experience (Years)"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="numeric"
              placeholder="e.g. 3"
            />

            <Field
              label="Certifications (comma separated)"
              value={certificationsText}
              onChangeText={setCertificationsText}
              placeholder="White Card, Working at Heights, ..."
            />
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700" }}>Profile Photo</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#111111",
                    backgroundColor: "#FDE047",
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text style={{ fontWeight: "900", fontSize: 18 }}>
                      {firstName[0] ?? "L"}
                      {lastName[0] ?? ""}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={onChoosePhoto}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 10,
                      backgroundColor: "#111",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#FDE047", fontWeight: "800" }}>Add Photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPhotoUri("")}
                    style={{
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#111111",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "800" }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Field label="BSB" value={bsb} onChangeText={setBsb} keyboardType="number-pad" />
            <Field
              label="Account Number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
            />

            {/* Availability Calendar */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700" }}>Availability (Calendar)</Text>

              <Pressable
                onPress={() => setCalendarOpen(true)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#111111",
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ fontWeight: "700" }}>
                  {availableDates.length === 0
                    ? "Select available dates"
                    : `${availableDates.length} date(s) selected`}
                </Text>
              </Pressable>

              {availableDates.length > 0 && (
                <Text style={{ opacity: 0.7 }}>
                  {availableDates.slice(0, 4).join(", ")}
                  {availableDates.length > 4 ? " ..." : ""}
                </Text>
              )}
            </View>
          </>
        )}

        {/* Common login fields */}
        <Field
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <Pressable
          onPress={onCreateAccount}
          disabled={submitting}
          style={{
            padding: 16,
            backgroundColor: submitting ? "#444" : "#111",
            borderRadius: 12,
            alignItems: "center",
            marginTop: 8,
            opacity: submitting ? 0.85 : 1,
          }}
        >
          <Text style={{ color: "#FDE047", fontWeight: "800" }}>
            {submitting ? "Creating..." : "Create Account"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/")}>
          <Text style={{ textAlign: "center", fontWeight: "700" }}>Back to Login</Text>
        </Pressable>
      </View>

      {/* Calendar modal */}
      <Modal visible={calendarOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Pick available dates</Text>
              <Pressable onPress={() => setCalendarOpen(false)}>
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            <Calendar
              onDayPress={(day) => toggleDate(day.dateString)}
              markedDates={availableDates.reduce((acc, d) => {
                acc[d] = { selected: true };
                return acc;
              }, {} as Record<string, any>)}
            />
          </View>
        </View>
      </Modal>
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
