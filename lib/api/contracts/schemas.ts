import { z } from 'zod';

export const memberSummarySchema = z.object({
  age: z.number().nullable().optional(),
  avatar: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  current_goal_minutes: z.number().nullable().optional(),
  current_streak_days: z.number().nullable().optional(),
  family_id: z.number().nullable().optional(),
  family_name: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  grade_level: z.string().nullable().optional(),
  id: z.number(),
  interests: z.string().nullable().optional(),
  name: z.string(),
  pin: z.string().nullable().optional(),
  reading_level: z.string().nullable().optional(),
  role: z.string().optional(),
  updated_at: z.string().nullable().optional(),
});

export const authAccountSummarySchema = z.object({
  created_at: z.string().nullable().optional(),
  id: z.number(),
  last_login_at: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  system_role: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
});

export const cabinetBindingSummarySchema = z.object({
  cabinet_name: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  family_id: z.number().nullable().optional(),
  family_name: z.string().nullable().optional(),
  id: z.number().optional(),
  initialized: z.boolean(),
  updated_at: z.string().nullable().optional(),
});

export const authSessionSchema = z.object({
  account: authAccountSummarySchema,
  cabinet: cabinetBindingSummarySchema,
  token: z.string(),
  user: memberSummarySchema,
});

export const authIdentitySchema = authSessionSchema.omit({
  token: true,
});

export const pairExchangeSchema = z.object({
  cabinet: cabinetBindingSummarySchema,
  pair_code: z.string(),
  pair_token: z.string(),
  requires_setup: z.boolean(),
});

export const pairIssueSchema = z.object({
  bind_url: z.string(),
  cabinet: cabinetBindingSummarySchema,
  expires_at: z.string(),
  pair_code: z.string(),
});

export const borrowLogSchema = z.object({
  action: z.string(),
  action_time: z.string().optional(),
  id: z.number().optional(),
  time: z.string().optional(),
  title: z.string().optional(),
});

export const cabinetCompartmentSchema = z.object({
  book: z.string().nullable(),
  cid: z.number(),
  status: z.string(),
  x: z.number(),
  y: z.number(),
});

export const memberStatsSchema = z.object({
  avatar: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  goal_reached: z.boolean(),
  id: z.number().optional(),
  name: z.string().optional(),
  recent: z.array(borrowLogSchema),
  role: z.string().optional(),
  today_ops: z.number(),
  total_store: z.number(),
  total_take: z.number(),
  weekly_goal: z.number(),
  weekly_takes: z.number(),
});

export const booklistItemSchema = z.object({
  assigned_by_user_id: z.number().nullable().optional(),
  author: z.string().nullable().optional(),
  book_id: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  created_at: z.string().optional(),
  description: z.string().nullable().optional(),
  done: z.boolean(),
  done_at: z.string().nullable().optional(),
  id: z.number(),
  note: z.string().nullable().optional(),
  title: z.string(),
});

export const badgeSummarySchema = z.object({
  badge_key: z.string(),
  unlocked_at: z.string(),
});

export const weeklyReportSchema = z.object({
  books: z.array(z.string()),
  summary: z.string(),
});

export const monthlyReportSchema = z.object({
  most_active: z.string().optional(),
  summary: z.string().optional(),
  top_category: z.string().optional(),
  total_books: z.number().optional(),
});

export const familyMemberSchema = z.object({
  avatar: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  id: z.number(),
  name: z.string(),
  role: z.string().optional(),
});

export const familySummarySchema = z.object({
  created_at: z.string().optional(),
  family_name: z.string(),
  id: z.number(),
  member_count: z.number().optional(),
  owner_account_id: z.number().nullable().optional(),
  owner_username: z.string().nullable().optional(),
});

export const familyDetailSchema = familySummarySchema.extend({
  members: z.array(familyMemberSchema),
});

export const accountSummarySchema = z.object({
  created_at: z.string().optional(),
  id: z.number(),
  last_login_at: z.string().nullable().optional(),
  linked_user_count: z.number().optional(),
  owned_family_count: z.number().optional(),
  phone: z.string().nullable().optional(),
  status: z.string().optional(),
  system_role: z.string().optional(),
  updated_at: z.string().optional(),
  username: z.string().nullable().optional(),
});

export const accountUserRelationSchema = z.object({
  account_id: z.number(),
  avatar: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  created_at: z.string().optional(),
  name: z.string().optional(),
  relation_type: z.string(),
  role: z.string().optional(),
  user_id: z.number(),
});

export const userAccountRelationSchema = z.object({
  account_id: z.number(),
  created_at: z.string().optional(),
  phone: z.string().nullable().optional(),
  relation_type: z.string(),
  status: z.string().optional(),
  user_id: z.number(),
  username: z.string().nullable().optional(),
});

const booleanLikeSchema = z.union([z.boolean(), z.number()]).transform((value) => Boolean(value));

export const bookSummarySchema = z.object({
  age_max: z.number().nullable().optional(),
  age_min: z.number().nullable().optional(),
  author: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  compartment_ids: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  difficulty_level: z.string().nullable().optional(),
  id: z.number(),
  isbn: z.string().nullable().optional(),
  is_on_shelf: booleanLikeSchema.optional(),
  keywords: z.string().nullable().optional(),
  on_shelf_count: z.number().optional(),
  publish_year: z.number().nullable().optional(),
  publisher: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  title: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const readingEventSchema = z.object({
  book_id: z.number().nullable().optional(),
  book_title: z.string().nullable().optional(),
  event_time: z.string(),
  event_type: z.string(),
  id: z.number(),
  metadata_json: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  user_id: z.number().nullable().optional(),
  user_name: z.string().nullable().optional(),
});

export const aiInsightSchema = z.object({
  insight: z.string(),
});

export const messageSchema = z.object({
  message: z.string().optional(),
});

export const memberGoalSchema = z.object({
  user_id: z.number(),
  weekly_target: z.number(),
});

export const familyWriteResultSchema = z.object({
  family: familySummarySchema,
  id: z.number().optional(),
});

export const bookWriteResultSchema = z.object({
  book: bookSummarySchema,
  id: z.number().optional(),
});

export const readingEventWriteResultSchema = z.object({
  event: readingEventSchema,
  id: z.number(),
});

export const shelfActionResultSchema = z.object({
  ai_reply: z.string().nullable().optional(),
  reply: z.string().nullable().optional(),
});

export const ocrIngestResultSchema = shelfActionResultSchema.extend({
  audio_b64: z.string().nullable().optional(),
  audio_format: z.string().nullable().optional(),
});
