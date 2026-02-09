import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import { registerUser, type Role, type User } from "../../src/auth/storage";

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

  // Common
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  async function onCreateAccount() {
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

      user = {
        role: "labourer",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        about: about.trim(),
        occupation: occupation.trim(),
        pricePerHour: rate,
        availableDates,
        email: email.trim(),
        password,
      };
    }

    const res = await registerUser(user);
    if (!res.ok) return Alert.alert("Couldn’t create account", res.error);

    Alert.alert("Account created", "Now log in.", [
      { text: "OK", onPress: () => router.replace("/") }, // "/" = Login (app/index.tsx)
    ]);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 14 }}>
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
            backgroundColor: role === "builder" ? "#111" : "#fff",
            borderWidth: 1,
            borderColor: role === "builder" ? "#111" : "#ddd",
          }}
        >
          <Text style={{ fontWeight: "800", color: role === "builder" ? "#fff" : "#111" }}>
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
            backgroundColor: role === "labourer" ? "#111" : "#fff",
            borderWidth: 1,
            borderColor: role === "labourer" ? "#111" : "#ddd",
          }}
        >
          <Text style={{ fontWeight: "800", color: role === "labourer" ? "#fff" : "#111" }}>
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
                borderColor: "#E6E6EA",
                backgroundColor: "#FAFAFC",
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
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12, alignItems: "center", marginTop: 8 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Create Account</Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/")}>
        <Text style={{ textAlign: "center", fontWeight: "700" }}>Back to Login</Text>
      </Pressable>

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