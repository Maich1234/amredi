import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "../../session";
import { Reports } from "../../community/Reports";
export default function MyReports() {
  const { session } = useSession();
  return session ? <Reports /> : <Redirect href="/auth" />;
}
