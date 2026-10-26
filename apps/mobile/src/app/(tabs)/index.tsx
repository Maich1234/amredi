import React from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "../../queries";
import { db } from "../../backend";
import { useTheme } from "../../theme";
import { Copy, Card, Button, s } from "../../ui";
export default function Home() {
  const profile = useProfile();
  const { colors } = useTheme();
  const applications = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("applications")
        .select("id,status,programmes(title)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.row}>
        <Copy size={13} strong>
          YOUR NEXT CHAPTER
        </Copy>
        <Copy muted>One step at a time</Copy>
      </View>
      <Copy size={34} strong>
        {profile.data
          ? `Hello, ${profile.data.display_name}.`
          : "A fresh start, together."}
      </Copy>
      <Copy muted>You don’t have to figure everything out today.</Copy>
      <View
        style={{
          backgroundColor: colors.soft,
          padding: 26,
          borderRadius: 28,
          gap: 16,
        }}
      >
        <Copy size={13} strong>
          MY NEXT STEP
        </Copy>
        <Copy size={27} strong>
          {profile.data?.goal || "Start with what matters to you."}
        </Copy>
        <Copy>Small steps count. Let’s find one that feels right.</Copy>
        <Button
          label={profile.data ? "Explore opportunities" : "Choose my goal"}
          onPress={() =>
            router.push(profile.data ? "/(tabs)/opportunities" : "/onboarding")
          }
        />
      </View>
      <Copy size={22} strong>
        A little support goes a long way.
      </Copy>
      <Card>
        <Copy strong>Find someone in your corner</Copy>
        <Copy muted>Connect with a mentor through the Amredi team.</Copy>
        <Button
          secondary
          label="Find support"
          onPress={() => router.push("/(tabs)/support")}
        />
      </Card>
      <Copy size={22} strong>
        Your applications
      </Copy>
      {applications.isPending ? (
        <Copy muted>Loading your applications…</Copy>
      ) : applications.isError ? (
        <Card>
          <Copy>We couldn’t load your applications.</Copy>
          <Button
            secondary
            label="Try again"
            onPress={() => void applications.refetch()}
          />
        </Card>
      ) : applications.data?.length ? (
        applications.data.map((a) => (
          <Card key={a.id}>
            <Copy strong>
              {(a.programmes as unknown as { title: string })?.title ||
                "Programme"}
            </Copy>
            <Copy muted>{a.status.replaceAll("_", " ")}</Copy>
          </Card>
        ))
      ) : (
        <Card>
          <Copy strong>Your next opportunity is ahead.</Copy>
          <Copy muted>
            When you apply for a programme, you can follow its progress here.
          </Copy>
        </Card>
      )}
      {profile.isError && (
        <Button
          secondary
          label="Retry profile"
          onPress={() => void profile.refetch()}
        />
      )}
    </ScrollView>
  );
}
