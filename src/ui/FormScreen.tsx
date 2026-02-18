import React from "react";
import { Platform, KeyboardAvoidingView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

export function FormScreen({
  children,
  backgroundColor = "#fff",
}: {
  children: React.ReactNode;
  backgroundColor?: string;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="always"
          extraScrollHeight={20}
          // ✅ THIS is the key: lets children take full screen height
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, backgroundColor }}
        >
          {children}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
