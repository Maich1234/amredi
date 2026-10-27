import { db } from "./backend";
export type Conversation = {
  id: string;
  mentorship_id: string;
  blocked_by: string | null;
  mentorships: {
    member_id: string;
    mentor_id: string;
    status: string;
    mentors: { display_name: string; bio: string };
    profiles: { display_name: string } | null;
  };
};
export const conversationFields =
  "id,mentorship_id,blocked_by,mentorships!inner(member_id,mentor_id,status,mentors(display_name,bio),profiles(display_name))";
export async function conversations() {
  const { data, error } = await db()
    .from("conversations")
    .select(conversationFields)
    .order("id")
    .limit(50);
  if (error) throw error;
  return data as unknown as Conversation[];
}

export function conversationName(c: Conversation, userId: string) {
  return c.mentorships.mentor_id === userId
    ? c.mentorships.profiles?.display_name || "Former mentee"
    : c.mentorships.mentors?.display_name || "Your mentor";
}
