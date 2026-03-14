import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  loginWithAppleIdentityToken,
  loginWithGoogleIdToken,
} from "./storage";
import { routeForUser } from "./routing";

WebBrowser.maybeCompleteAuthSession();

type Provider = "google" | "apple";
const FALLBACK_GOOGLE_CLIENT_ID = "missing-google-client-id";
const GOOGLE_BUTTON_LIGHT = require("../../assets/google-continue-light.png");

const GOOGLE_IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "").trim();
const GOOGLE_ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "").trim();
const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "").trim();

function hasGoogleClientId() {
  if (Platform.OS === "ios") return Boolean(GOOGLE_IOS_CLIENT_ID);
  if (Platform.OS === "android") return Boolean(GOOGLE_ANDROID_CLIENT_ID);
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}

export function AuthSocialButtons() {
  const isExpoGo =
    Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    async function finishGoogleSignIn(idToken: string) {
      setBusyProvider("google");
      const res = await loginWithGoogleIdToken(idToken);
      setBusyProvider(null);
      if (!res.ok) return Alert.alert("Google sign in failed", res.error);
      router.replace(routeForUser(res.user));
    }

    if (!response) return;
    if (response.type === "error") {
      setBusyProvider(null);
      Alert.alert("Google sign in failed", response.error?.message || "Please try again.");
      return;
    }
    if (response.type !== "success") {
      if (response.type !== "dismiss" && response.type !== "cancel") {
        setBusyProvider(null);
      }
      return;
    }

    const idToken = response.params.id_token || response.authentication?.idToken;
    if (!idToken) {
      setBusyProvider(null);
      Alert.alert("Google sign in failed", "Google did not return an identity token.");
      return;
    }

    void finishGoogleSignIn(idToken);
  }, [response]);

  async function onGooglePress() {
    if (busyProvider) return;
    if (isExpoGo) {
      return Alert.alert(
        "Google sign in needs a dev build",
        "Expo Go is fine for normal frontend testing, but Google and Apple sign in need a native development build."
      );
    }
    if (!hasGoogleClientId()) {
      return Alert.alert(
        "Google sign in not configured",
        "Add the Google Expo client IDs in your environment before using Google sign in."
      );
    }
    if (!request) {
      return Alert.alert("Google sign in unavailable", "The Google auth request is still loading.");
    }

    setBusyProvider("google");
    const result = await promptAsync();
    if (result.type !== "success") {
      setBusyProvider(null);
    }
  }

  async function onApplePress() {
    if (busyProvider) return;
    if (isExpoGo) {
      return Alert.alert(
        "Apple sign in needs a dev build",
        "Expo Go uses its own app identity, so Sign in with Apple cannot be tested there."
      );
    }
    setBusyProvider("apple");

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return Alert.alert("Apple sign in failed", "Apple did not return an identity token.");
      }

      const res = await loginWithAppleIdentityToken({
        identityToken: credential.identityToken,
        user: credential.user,
        email: credential.email,
        firstName: credential.fullName?.givenName,
        lastName: credential.fullName?.familyName,
      });
      if (!res.ok) return Alert.alert("Apple sign in failed", res.error);

      router.replace(routeForUser(res.user));
    } catch (error: any) {
      if (error?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple sign in failed", error?.message || "Please try again.");
      }
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <View style={{ gap: 14 }}>
      {isExpoGo ? (
        <Text style={{ textAlign: "center", opacity: 0.7, lineHeight: 20 }}>
          Expo Go is fine for regular UI testing. Social sign in is only enabled in a native dev build.
        </Text>
      ) : null}
      <Pressable
        onPress={onGooglePress}
        disabled={busyProvider !== null}
        style={{
          width: "100%",
          height: 52,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#9A9A9A",
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          opacity: busyProvider && busyProvider !== "google" ? 0.6 : 1,
          position: "relative",
        }}
      >
        <View
          style={{
            width: "100%",
            height: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingHorizontal: 16,
            opacity: busyProvider === "google" ? 0.45 : 1,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              overflow: "hidden",
              marginLeft: -4,
            }}
          >
            <Image
              source={GOOGLE_BUTTON_LIGHT}
              resizeMode="stretch"
              style={{
                position: "absolute",
                left: -6,
                top: -7,
                width: 156,
                height: 34,
              }}
            />
          </View>
          <Text
            style={{
              color: "#1F1F1F",
              fontSize: 18,
              fontWeight: "500",
            }}
          >
            Continue with Google
          </Text>
        </View>
        {busyProvider === "google" ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color="#111111" />
          </View>
        ) : null}
      </Pressable>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ width: "100%", height: 52, opacity: busyProvider && busyProvider !== "apple" ? 0.6 : 1 }}
          onPress={onApplePress}
        />
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "#11111122" }} />
        <Text style={{ fontWeight: "700", opacity: 0.5 }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "#11111122" }} />
      </View>
    </View>
  );
}
