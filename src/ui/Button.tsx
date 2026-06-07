import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { colors, radii, fontFamily, fontSize, fontWeight } from "../theme";

type Variant = "primary" | "secondary" | "destructive";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

const VARIANTS = {
  primary: { bg: colors.primary, text: colors.onPrimary, border: colors.primary, borderWidth: 0 },
  secondary: {
    bg: colors.background,
    text: colors.text,
    border: colors.borderStrong,
    borderWidth: 1.5,
  },
  destructive: {
    bg: colors.dangerBg,
    text: colors.dangerText,
    border: colors.dangerText,
    borderWidth: 1,
  },
} as const;

export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.borderWidth },
        pressed && { opacity: 0.85 },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.label, { color: v.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.heavy },
});
