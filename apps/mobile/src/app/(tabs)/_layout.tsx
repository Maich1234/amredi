import React from "react";
import { ActivityIndicator, Text } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useSession } from "../../session";
import { useTheme } from "../../theme";
export default function Layout() {
  const { session, loading } = useSession();
  const { colors } = useTheme();
  if (loading) return <ActivityIndicator />;
  if (!session) return <Redirect href="/auth" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {[
        ["index", "Today", "⌂"],
        ["opportunities", "Explore", "◇"],
        ["support", "Support", "♡"],
        ["messages", "Messages", "✉"],
        ["profile", "You", "○"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 24, color }}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
