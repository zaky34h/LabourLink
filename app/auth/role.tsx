import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, spacing, type } from "../../src/theme";
import Button from "../../src/ui/Button";

export default function RoleSelect() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Who are you?</Text>
      <Text style={styles.subtitle}>
        Choose a role to continue. (We can allow switching later.)
      </Text>

      <Button
        label="I’m a Builder"
        onPress={() => router.push("/builder/home")}
        style={{ marginTop: spacing.sm }}
      />

      <Button
        label="I’m a Labourer / Tradie"
        onPress={() => router.push("/labourer/home")}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: { ...type.h1 },
  subtitle: { ...type.secondary, marginTop: spacing.sm, marginBottom: spacing.md },
});
