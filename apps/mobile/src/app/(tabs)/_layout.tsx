import React from "react";
import { ActivityIndicator, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
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
        headerTitleStyle: { fontFamily: "AmrediSans-Bold", fontSize: 18 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: "AmrediSans-Regular", fontSize: 11 },
        tabBarItemStyle: { paddingTop: 5 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {[
        ["index", "Home", "home-outline", "home"],
        ["opportunities", "Explore", "compass-outline", "compass"],
        ["support", "Support", "heart-outline", "heart"],
        ["messages", "Messages", "message-outline", "message"],
        ["profile", "You", "account-circle-outline", "account-circle"],
      ].map(([name, title, icon, activeIcon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  minWidth: 50,
                  height: 30,
                  borderRadius: 16,
                  backgroundColor: focused ? colors.soft : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name={
                    (focused ? activeIcon : icon) as React.ComponentProps<
                      typeof MaterialCommunityIcons
                    >["name"]
                  }
                  size={23}
                  color={focused ? colors.pink : colors.muted}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
