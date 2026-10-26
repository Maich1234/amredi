import { db } from "./backend";
export type Conversation = {
  id: string;
  blocked_by: string | null;
  mentorships: {
    member_id: string;
    mentor_id: string;
    status: string;
    mentors: { display_name: string; bio: string };
  };
};
export const conversationFields =
  "id,blocked_by,mentorships!inner(member_id,mentor_id,status,mentors(display_name,bio))";
export async function conversations() {
  const { data, error } = await db()
    .from("conversations")
    .select(conversationFields)
    .order("id")
    .limit(50);
  if (error) throw error;
  return data as unknown as Conversation[];
}
