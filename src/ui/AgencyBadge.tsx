import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, fontFamily, fontSize, fontWeight } from "../theme";

/**
 * "via {Agency}" pill for agency-managed labourers. Deliberately NEUTRAL
 * (bordered, field-coloured) so it reads as a provenance tag and is visually
 * distinct from the sage/amber/danger STATUS badges used elsewhere.
 */
export function AgencyBadge({
  agencyName,
  style,
}: {
  agencyName?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.badge, style]}>
      <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
      <Text style={styles.text} numberOfLines={1}>
        via {agencyName || "Agency"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.field,
  },
  text: {
    fontFamily,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
});
