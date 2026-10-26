import React from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme";
import { SessionProvider } from "../session";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
    mutations: { retry: false },
  },
});
function Routes() {
  const { colors, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Your fresh start" }} />
        <Stack.Screen name="onboarding" options={{ title: "Make it yours" }} />
        <Stack.Screen name="recover" options={{ title: "Recover account" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Conversation" }} />
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
