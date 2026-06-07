import { ComponentProps } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Bottom-tab icon: filled when active, outline when inactive.
 * Pass the FILLED icon name (e.g. "home"); the outline variant is used when inactive.
 */
export function TabBarIcon({
  name,
  focused,
  showDot = false,
}: {
  name: IoniconName;
  focused: boolean;
  showDot?: boolean;
}) {
  const outline = `${String(name)}-outline` as IoniconName;
  return (
    <View style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
      <Ionicons
        name={focused ? name : outline}
        size={23}
        color={focused ? colors.text : colors.textSecondary}
      />
      {showDot ? (
        <View
          style={{
            position: "absolute",
            top: 1,
            right: 2,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: colors.dangerText,
            borderWidth: 1.5,
            borderColor: colors.background,
          }}
        />
      ) : null}
    </View>
  );
}
