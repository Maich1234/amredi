import React from "react";
import { ScrollView } from "react-native";
import { Redirect, router } from "expo-router";
import { useAccess } from "../../access";
import { useSession } from "../../session";
import { Button, Card, Copy, s } from "../../ui";
export default function Workspace() {
  const { session, loading } = useSession();
  const access = useAccess();
  if (loading) return <Copy>Loading account…</Copy>;
  if (!session) return <Redirect href="/auth" />;
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Copy size={34} strong>
        Make room for someone to grow.
      </Copy>
      <Copy muted>Your approved tools, in one place.</Copy>
      {access.isPending ? (
        <Copy>Checking your access…</Copy>
      ) : access.isError ? (
        <Card>
          <Copy>We couldn’t check your access.</Copy>
          <Button label="Try again" onPress={() => void access.refetch()} />
        </Card>
      ) : (
        <>
          {access.data.mentor && (
            <Card>
              <Copy strong size={23}>
                My mentorships
              </Copy>
              <Copy muted>
                View assigned members and work on milestones together.
              </Copy>
              <Button
                label="Open mentor workspace"
                onPress={() => router.push("/workspace/mentorships")}
              />
            </Card>
          )}
          {access.data.staff && (
            <Card>
              <Copy strong size={23}>
                Programme management
              </Copy>
              <Copy muted>Publish opportunities and review applications.</Copy>
              <Button
                label="Manage programmes"
                onPress={() => router.push("/workspace/programmes")}
              />
            </Card>
          )}
          {!access.data.mentor && !access.data.staff && (
            <Card>
              <Copy strong>Approval needed</Copy>
              <Copy muted>
                Mentor and staff workspaces become available after approval by
                the Amredi team.
              </Copy>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}
