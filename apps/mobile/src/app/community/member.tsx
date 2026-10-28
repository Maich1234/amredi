import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../session";
import { Feed } from "../../community/Feed";
export default function Member() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  if (!session) return <Redirect href="/auth" />;
  return <Feed author={id} />;
}
