import { useQuery } from "@tanstack/react-query";
import { db, Profile } from "./backend";
import { useSession } from "./session";
export function useProfile() {
  const { session } = useSession();
  return useQuery({
    queryKey: ["profile", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db()
        .from("profiles")
        .select("id,display_name,goal")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}
