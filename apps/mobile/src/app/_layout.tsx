import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Image, Platform, View, useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme";
import { SessionProvider, useSession } from "../session";

// Hold the native brand mark until bundled fonts and the initial session are ready.
if (Platform.OS !== "web") {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
}
function BrandedLoading() {
  const dark = useColorScheme() === "dark";
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: dark ? "#19151A" : "#FBF8F7",
      }}
    >
      <Image
        accessibilityLabel="Amredi is loading"
        source={
          dark
            ? require("../../assets/splash-icon-dark.png")
            : require("../../assets/splash-icon.png")
        }
        style={{ width: 160, height: 160 }}
      />
    </View>
  );
}

const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
    mutations: { retry: false },
  },
});
function Routes() {
  const { colors, dark } = useTheme();
  const { loading } = useSession();
  useEffect(() => {
    if (!loading && Platform.OS !== "web") SplashScreen.hide();
  }, [loading]);
  if (loading) return <BrandedLoading />;
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "AmrediSans-Bold" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Your fresh start" }} />
        <Stack.Screen name="onboarding" options={{ title: "Make it yours" }} />
        <Stack.Screen name="recover" options={{ title: "Recover account" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Conversation" }} />
        <Stack.Screen name="workspace/index" options={{ title: "Workspace" }} />
        <Stack.Screen
          name="workspace/mentorships"
          options={{ title: "My mentorships" }}
        />
        <Stack.Screen
          name="workspace/programmes"
          options={{ title: "Programmes" }}
        />
        <Stack.Screen
          name="workspace/programme/[id]"
          options={{ title: "Programme editor" }}
        />
        <Stack.Screen
          name="workspace/applications/[id]"
          options={{ title: "Applications" }}
        />
        <Stack.Screen
          name="milestones/[id]"
          options={{ title: "Our milestones" }}
        />
        <Stack.Screen
          name="workspace/matching"
          options={{ title: "Mentor matching" }}
        />
        <Stack.Screen
          name="workspace/match/[id]"
          options={{ title: "Choose mentor" }}
        />
        <Stack.Screen
          name="workspace/reports"
          options={{ title: "Member reports" }}
        />
        <Stack.Screen
          name="workspace/audit"
          options={{ title: "Audit history" }}
        />
        <Stack.Screen name="my-reports" options={{ title: "My reports" }} />
        <Stack.Screen
          name="community/edit-profile"
          options={{ title: "Community profile" }}
        />
        <Stack.Screen
          name="community/compose"
          options={{ title: "Your post" }}
        />
        <Stack.Screen
          name="community/options"
          options={{ title: "Post options" }}
        />
        <Stack.Screen
          name="community/member"
          options={{ title: "Community member" }}
        />
        <Stack.Screen
          name="community/blocked"
          options={{ title: "Blocked members" }}
        />
        <Stack.Screen
          name="community/reports"
          options={{ title: "Your reports" }}
        />
        <Stack.Screen name="post/[id]" options={{ title: "Conversation" }} />
        <Stack.Screen
          name="workspace/community"
          options={{ title: "Community moderation" }}
        />
        <Stack.Screen
          name="my-applications"
          options={{ title: "Applications" }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="programme/[id]"
          options={{ title: "Opportunity" }}
        />
      </Stack>
    </>
  );
}
export default function Root() {
  const [loaded, error] = useFonts({
    "AmrediSans-Regular": require("../../assets/fonts/AmrediSans-Regular.ttf"),
    "AmrediSans-Bold": require("../../assets/fonts/AmrediSans-Bold.ttf"),
  });
  if (!loaded && !error) return <BrandedLoading />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={client}>
            <SessionProvider>
              <Routes />
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
