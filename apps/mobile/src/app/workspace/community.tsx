import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "../../session";
import { useAccess } from "../../access";
import { ScrollAccess } from "../../access-ui";
import { Reports } from "../../community/Reports";
export default function Moderation() {
  const { session } = useSession();
  const access = useAccess();
  if (!session) return <Redirect href="/auth" />;
  if (!access.data?.staff)
    return (
      <ScrollAccess
        pending={access.isPending}
        error={access.isError}
        retry={() => void access.refetch()}
      />
    );
  return <Reports staff />;
}
