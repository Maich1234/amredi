import React from "react";
import { View, ScrollView, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useSession } from "../session";
import { useTheme } from "../theme";
import { Copy, Button, Card, s } from "../ui";
export default function Welcome() {
  const { session, loading } = useSession();
  const { colors } = useTheme();
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (session) return <Redirect href="/(tabs)" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={s.page}>
        <Image
          source={require("../../assets/amredi-logo.png")}
          accessibilityLabel="Amredi, mother and child"
          style={{
            width: 175,
            height: 63,
            borderRadius: 8,
            backgroundColor: "white",
          }}
          resizeMode="contain"
        />
        <View
          style={{
            height: 250,
            borderRadius: 120,
            backgroundColor: colors.soft,
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 16,
          }}
        >
          <Copy size={62}>♡</Copy>
          <Copy strong size={18}>
            A little support. A new beginning.
          </Copy>
        </View>
        <Copy size={43} strong>
          Your next chapter starts with you.
        </Copy>
        <Copy size={18} muted>
          Find your people. Learn something new. Take the next step, at your own
          pace.
        </Copy>
        <Card>
          <Copy strong>A place to grow, together</Copy>
          <Copy muted>
            Education, practical skills and mentors who walk alongside you.
          </Copy>
        </Card>
        <Button label="Start my journey" onPress={() => router.push("/auth")} />
        <Copy size={13} muted>
          You choose what to share, and when.
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
