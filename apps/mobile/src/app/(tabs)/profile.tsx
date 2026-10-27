import React, { useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { useAccess } from "../../access";
import { db } from "../../backend";
import { useProfile } from "../../queries";
import { useTheme } from "../../theme";
import { Button, Card, Copy, s } from "../../ui";
export default function Profile() {
  const profile = useProfile();
  const access = useAccess();
  const { dark, toggle } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signout() {
    setBusy(true);
    try {
      const { error } = await db().auth.signOut();
      if (error) throw error;
      router.replace("/");
    } catch {
      setError("Sign out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Copy size={34} strong>
        Your journey. Your pace.
      </Copy>
      <Card>
        <Copy strong size={24}>
          {profile.data?.display_name || "Make yourself at home"}
        </Copy>
        <Copy muted>
          {profile.data?.goal || "Choose the next step that matters to you."}
        </Copy>
        <Button
          secondary
          label="Edit my name and goal"
          onPress={() => router.push("/onboarding")}
        />
      </Card>
      {access.isError && (
        <Button
          secondary
          label="Retry workspace access"
          onPress={() => void access.refetch()}
        />
      )}
      {(access.data?.staff || access.data?.mentor) && (
        <Button
          label="Open my workspace"
          onPress={() => router.push("/workspace")}
        />
      )}
      <Button
        secondary
        label={
          dark ? "Switch to light appearance" : "Switch to dark appearance"
        }
        onPress={toggle}
      />
      <Card>
        <Copy strong>Your privacy matters.</Copy>
        <Copy muted>
          Your profile and applications are shared only with authorised people
          who need them to provide support.
        </Copy>
      </Card>
      <Button secondary label="Sign out" onPress={signout} busy={busy} />
      {!!error && <Copy>{error}</Copy>}
    </ScrollView>
  );
}
