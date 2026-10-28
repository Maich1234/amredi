import React, { useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { useAccess } from "../../access";
import { db } from "../../backend";
import { useProfile } from "../../queries";
import { useTheme } from "../../theme";
import { useCommunityProfile } from "../../community/data";
import { PrivateImage } from "../../community/media";
import { useSession } from "../../session";
import { Button, Card, Copy, s } from "../../ui";
export default function Profile() {
  const profile = useProfile();
  const community = useCommunityProfile();
  const { session } = useSession();
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
      <Copy size={28} strong>
        Your journey. Your pace.
      </Copy>
      <Card>
        <PrivateImage
          avatar
          size={80}
          path={community.data?.avatar_path ?? null}
          label={
            community.data?.display_name ?? profile.data?.display_name ?? "You"
          }
        />
        <Copy strong size={24}>
          {community.data?.display_name ?? "Your community profile"}
        </Copy>
        <Copy muted>
          {community.data?.bio ||
            "Share a little about yourself, at your pace."}
        </Copy>
        <Button
          label="Edit community profile"
          onPress={() => router.push("/community/edit-profile")}
        />
        <Button
          secondary
          label="View my posts"
          onPress={() =>
            router.push({
              pathname: "/community/member",
              params: { id: session!.user.id },
            })
          }
        />
        <Button
          secondary
          label="Community reports"
          onPress={() => router.push("/community/reports")}
        />
        <Button
          secondary
          label="Blocked members"
          onPress={() => router.push("/community/blocked")}
        />
      </Card>
      <Card>
        <Copy strong size={24}>
          {profile.data?.display_name || "Make yourself at home"}
        </Copy>
        <Copy muted>
          {profile.data?.goal || "Choose the next step that matters to you."}
        </Copy>
        <Button
          secondary
          label="My applications"
          onPress={() => router.push("/my-applications")}
        />
        <Button
          secondary
          label="Edit my name and goal"
          onPress={() => router.push("/onboarding")}
        />
      </Card>
      <Button
        secondary
        label="My reports"
        onPress={() => router.push("/my-reports")}
      />
      {access.isError && (
        <Button
          secondary
          label="Retry workspace access"
          onPress={() => void access.refetch()}
        />
      )}
      {(access.data?.staff || access.data?.mentor) && (
        <Button
          label={
            access.data?.staff
              ? "Open staff workspace"
              : "Open mentor workspace"
          }
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
          Your community profile and posts are visible to signed-in members.
          Your support goals and applications remain restricted to authorised
          people providing support.
        </Copy>
      </Card>
      <Button secondary label="Sign out" onPress={signout} busy={busy} />
      {!!error && <Copy>{error}</Copy>}
    </ScrollView>
  );
}
