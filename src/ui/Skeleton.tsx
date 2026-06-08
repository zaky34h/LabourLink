import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii, spacing } from "../theme";

/**
 * Theme-styled shimmer placeholder for loading states.
 * No animation libs in this project (no reanimated), so the shimmer is a
 * native-driven opacity pulse — cheap, runs on the UI thread, syncs visually.
 * Fill uses the tan `border` cream so it reads on both `background` and `surface`.
 */

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border, opacity }, style]}
    />
  );
}

/** A surface card placeholder matching the app's list-card layout. */
export function SkeletonCard({
  showAvatar = false,
  lines = 3,
  style,
}: {
  showAvatar?: boolean;
  lines?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {showAvatar ? (
        <View style={styles.row}>
          <Skeleton width={40} height={40} radius={radii.pill} />
          <Skeleton width="55%" height={16} style={styles.avatarTitle} />
        </View>
      ) : (
        <Skeleton width="60%" height={16} />
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? "40%" : "85%"}
          height={12}
          style={styles.line}
        />
      ))}
    </View>
  );
}

/** A column of repeated card placeholders. */
export function SkeletonList({
  count = 6,
  showAvatar = false,
  lines = 3,
}: {
  count?: number;
  showAvatar?: boolean;
  lines?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showAvatar={showAvatar} lines={lines} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatarTitle: { marginLeft: spacing.sm },
  line: { marginTop: spacing.sm },
});
