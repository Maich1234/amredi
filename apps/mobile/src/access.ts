import { useQuery } from "@tanstack/react-query";
import { db } from "./backend";
import { useSession } from "./session";
export function useAccess() {
  const { session } = useSession();
  return useQuery({
    queryKey: ["access", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const [staff, mentor] = await Promise.all([
        db()
          .from("staff_members")
          .select("active")
          .eq("user_id", session!.user.id)
          .maybeSingle(),
        db()
          .from("mentors")
          .select("verified")
          .eq("id", session!.user.id)
          .maybeSingle(),
      ]);
      if (staff.error || mentor.error) throw staff.error || mentor.error;
      return {
        staff: staff.data?.active === true,
        mentor: mentor.data?.verified === true,
      };
    },
  });
}
