import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Modal,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import { loginUser, registerUser, type Role, type User } from "../../src/auth/storage";
import { FormScreen } from "../../src/ui/FormScreen";

export default function Register() {
  const [role, setRole] = useState<Role>("builder");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");

  const [pricePerHour, setPricePerHour] = useState("");
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [experienceYears, setExperienceYears] = useState("");
  const [certifications, setCertifications] = useState<string[]>([""]);
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function isEmailValid(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  function toggleUnavailableDate(dateString: string) {
    setUnavailableDates((prev) =>
      prev.includes(dateString)
        ? prev.filter((d) => d !== dateString)
        : [...prev, dateString]
    );
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

  async function onCreateAccount() {
    if (submitting) return;
    Keyboard.dismiss();
    if (!firstName.trim() || !lastName.trim()) {
      return Alert.alert("Missing info", "Please enter your first and last name.");
    }
    if (!about.trim()) {
      return Alert.alert("Missing info", "Please add a short bio (About Yourself).");
    }
    if (!isEmailValid(email)) {
      return Alert.alert("Invalid email", "Please enter a valid email address.");
    }
    if (password.length < 6) {
      return Alert.alert("Weak password", "Password must be at least 6 characters.");
    }

    let user: User;

    if (role === "builder") {
      if (!companyName.trim()) {
        return Alert.alert("Missing info", "Please enter your company name.");
      }
      if (!address.trim()) {
        return Alert.alert("Missing info", "Please enter your address.");
      }

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
      const rate = Number(pricePerHour);
      if (!Number.isFinite(rate) || rate <= 0) {
        return Alert.alert("Invalid rate", "Price per hour must be a number greater than 0.");
      }

      const exp = Number(experienceYears);
      if (!Number.isFinite(exp) || exp < 0) {
        return Alert.alert("Invalid experience", "Experience must be a number 0 or higher.");
      }

      if (parsedCertifications.length === 0) {
        return Alert.alert("Missing certifications", "Add at least 1 certification.");
      }
      if (!bsb.trim()) return Alert.alert("Missing info", "Please enter your BSB.");
      if (!accountNumber.trim()) return Alert.alert("Missing info", "Please enter your account number.");

      user = {
        role: "labourer",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        about: about.trim(),
        pricePerHour: rate,
        unavailableDates: unavailableDates.slice().sort(),
        experienceYears: exp,
        certifications: parsedCertifications,
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
      else if (loginRes.user.role === "owner") router.replace("/owner/home");
      else router.replace("/labourer/home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen>
      <View style={{ padding: 24, paddingTop: 60, gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: "900" }}>Create Account</Text>

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
              borderColor: "#111111",
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
              borderColor: "#111111",
            }}
          >
            <Text style={{ fontWeight: "800", color: role === "labourer" ? "#FDE047" : "#111" }}>
              Labourer
            </Text>
          </Pressable>
        </View>

        <Field label="First Name" value={firstName} onChangeText={setFirstName} />
        <Field label="Last Name" value={lastName} onChangeText={setLastName} />
        <Field label="About Yourself" value={about} onChangeText={setAbout} multiline />

        {role === "builder" ? (
          <>
            <Field label="Company Name" value={companyName} onChangeText={setCompanyName} />
            <Field label="Address" value={address} onChangeText={setAddress} />
          </>
        ) : (
          <>
            <Field
              label="Price Per Hour"
              value={pricePerHour}
              onChangeText={setPricePerHour}
              keyboardType="numeric"
            />

            <Field
              label="Experience (Years)"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="numeric"
              placeholder="e.g. 3"
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

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700" }}>Unavailabilities</Text>
              <Text style={{ opacity: 0.75 }}>
                Labourers are available on all days by default. Add only dates you cannot work.
              </Text>

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
                  {unavailableDates.length === 0
                    ? "Add unavailable dates"
                    : `${unavailableDates.length} date(s) unavailable`}
                </Text>
              </Pressable>

              {unavailableDates.length > 0 && (
                <Text style={{ opacity: 0.7 }}>
                  {unavailableDates.slice(0, 4).join(", ")}
                  {unavailableDates.length > 4 ? " ..." : ""}
                </Text>
              )}
            </View>
          </>
        )}

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

      <Modal visible={calendarOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Pick unavailable dates</Text>
              <Pressable onPress={() => setCalendarOpen(false)}>
                <Text style={{ fontWeight: "900" }}>Done</Text>
              </Pressable>
            </View>

            <Calendar
              onDayPress={(day) => toggleUnavailableDate(day.dateString)}
              markedDates={unavailableDates.reduce((acc, d) => {
                acc[d] = {
                  selected: true,
                  selectedColor: "#111",
                  selectedTextColor: "#FDE047",
                };
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
