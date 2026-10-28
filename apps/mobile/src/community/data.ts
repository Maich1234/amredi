import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { db } from "../backend";
import { useSession } from "../session";
import type { Database } from "../database.types";
export type CommunityProfile =
  Database["public"]["Tables"]["community_profiles"]["Row"];
export type Post = Database["public"]["Tables"]["community_posts"]["Row"] & {
  community_profiles: CommunityProfile | null;
  community_likes: { count: number }[];
  community_comments: { count: number }[];
  liked: boolean;
  saved: boolean;
};
export type Cursor = { created_at: string; id: string } | null;
export function useCommunityProfile(id?: string) {
  const { session } = useSession();
  const user = id ?? session?.user.id;
  return useQuery({
    queryKey: ["community", "profile", session?.user.id, user],
    enabled: !!session && !!user,
    queryFn: async () => {
      const { data, error } = await db()
        .from("community_profiles")
        .select("*")
        .eq("id", user!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
const selection =
  "*,community_profiles(*),community_likes(count),community_comments(count)" as const;
async function hydrate(
  rows: Omit<Post, "liked" | "saved">[],
  user: string,
): Promise<Post[]> {
  if (!rows.length) return [];
  const ids = rows.map((p) => p.id);
  const [likes, saves] = await Promise.all([
    db()
      .from("community_likes")
      .select("post_id")
      .eq("user_id", user)
      .in("post_id", ids),
    db()
      .from("community_saves")
      .select("post_id")
      .eq("user_id", user)
      .in("post_id", ids),
  ]);
  if (likes.error || saves.error) throw likes.error || saves.error;
  const liked = new Set(likes.data?.map((l) => l.post_id)),
    saved = new Set(saves.data?.map((s) => s.post_id));
  return rows.map((p) => ({
    ...p,
    liked: liked.has(p.id),
    saved: saved.has(p.id),
  }));
}
export function useFeed(mode: "all" | "mine" | "saved", author?: string) {
  const { session } = useSession();
  const user = session?.user.id;
  return useInfiniteQuery({
    queryKey: ["community", "feed", user, mode, author],
    enabled: !!user,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      let q = db()
        .from("community_posts")
        .select(
          mode === "saved"
            ? (`${selection},community_saves!inner(user_id)` as const)
            : selection,
        )
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(15);
      if (mode === "mine" || author) q = q.eq("author_id", author ?? user!);
      if (mode === "saved") q = q.eq("community_saves.user_id", user!);
      if (pageParam)
        q = q.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      const { data, error } = await q;
      if (error) throw error;
      return hydrate(data as unknown as Omit<Post, "liked" | "saved">[], user!);
    },
    getNextPageParam: (page) =>
      page.length === 15
        ? { created_at: page[14].created_at, id: page[14].id }
        : undefined,
  });
}
export function usePost(id: string) {
  const { session } = useSession();
  return useQuery({
    queryKey: ["community", "post", session?.user.id, id],
    enabled: !!session && !!id,
    queryFn: async () => {
      const { data, error } = await db()
        .from("community_posts")
        .select(selection)
        .eq("id", id)
        .eq("hidden", false)
        .maybeSingle();
      if (error) throw error;
      return data ? (await hydrate([data], session!.user.id))[0] : null;
    },
  });
}
export function friendlyError(error: unknown) {
  const message = (error as { message?: string })?.message;
  return message?.includes("Please pause")
    ? message
    : "That didn’t go through. Check your connection and try again. Your text is still here.";
}
