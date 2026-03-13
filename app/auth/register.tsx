import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Keyboard, Image } from "react-native";
import { router } from "expo-router";
import { loginUser, registerUser } from "../../src/auth/storage";
import { routeForUser } from "../../src/auth/routing";
import { AuthSocialButtons } from "../../src/auth/AuthSocialButtons";
import { FormScreen } from "../../src/ui/FormScreen";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function isEmailValid(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function onCreateAccount() {
    if (submitting) return;
    Keyboard.dismiss();

    if (!isEmailValid(email)) {
      return Alert.alert("Invalid email", "Please enter a valid email address.");
    }
    if (password.length < 6) {
      return Alert.alert("Weak password", "Password must be at least 6 characters.");
    }

    setSubmitting(true);
    try {
      const res = await registerUser({
        role: "pending",
        firstName: "",
        lastName: "",
        email: email.trim(),
        password,
      });
      if (!res.ok) return Alert.alert("Couldn’t create account", res.error);

      const loginRes = await loginUser(email.trim(), password);
      if (!loginRes.ok) {
        return Alert.alert("Account created", "Please log in.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
      }

      router.replace(routeForUser(loginRes.user));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen backgroundColor="#FFF8D9">
      <View style={{ flex: 1, backgroundColor: "#FFF8D9", padding: 24, paddingTop: 44, gap: 14 }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: -70,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: "#FFE15A",
            opacity: 0.45,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: -70,
            width: 340,
            height: 340,
            borderRadius: 170,
            backgroundColor: "#111111",
            opacity: 0.08,
          }}
        />

        <View style={{ alignItems: "center", marginTop: 2 }}>
          <Image
            source={require("../../assets/labourlink-logo.png")}
            style={{ width: 220, height: 96 }}
            resizeMode="contain"
          />
          <Text style={{ marginTop: 2, fontWeight: "700", opacity: 0.75 }}>Create your account</Text>
          <Text style={{ marginTop: 8, textAlign: "center", opacity: 0.72, lineHeight: 20 }}>
            Start with your email and password. We’ll collect the rest after your first sign in.
          </Text>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#111111",
            borderRadius: 18,
            backgroundColor: "#fff",
            padding: 16,
            gap: 14,
          }}
        >
          <AuthSocialButtons />

          <Field
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimum 6 characters"
          />

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

          <Pressable
            onPress={() => router.replace("/")}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: "#111111",
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "700" }}>Back to Login</Text>
          </Pressable>
        </View>
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
        }}
      />
    </View>
  );
}
