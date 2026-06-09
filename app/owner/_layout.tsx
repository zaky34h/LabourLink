import { Tabs } from "expo-router";
import { TabBarIcon } from "../../src/ui/TabBarIcon";
import { colors, fontFamily, fontWeight } from "../../src/theme";

export default function OwnerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily,
          fontWeight: fontWeight.bold,
          fontSize: 11,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="builders"
        options={{
          title: "Companies",
          tabBarIcon: ({ focused }) => <TabBarIcon name="business" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="labourers"
        options={{
          title: "Labourers",
          tabBarIcon: ({ focused }) => <TabBarIcon name="people" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => <TabBarIcon name="document-text" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: "Support",
          tabBarIcon: ({ focused }) => <TabBarIcon name="shield-checkmark" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="builder/[email]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="labourer/[email]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
