export type Lead = {
  id: string;
  user_id: string;
  list_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  location: string | null;
  linkedin_url: string | null;
  website: string | null;
  notes: string | null;
  custom_fields: Record<string, string> | null;
  status: "new" | "emailed" | "replied" | "bounced" | "unsubscribed";
  created_at: string;
};

export type LeadList = {
  id: string;
  user_id: string;
  name: string;
  location_tag: string | null;
  total_leads: number;
  created_at: string;
};

export type SenderProfile = {
  id: string;
  user_id: string;
  company_name: string;
  company_address: string | null;
  services: string | null;
  portfolio_url: string | null;
  details: string | null;
  from_name: string;
  reply_to: string | null;
  daily_limit: number;
  delay_seconds: number;
  openrouter_api_key_encrypted: string | null;
  openrouter_model: string;
  openrouter_fallback_model: string | null;
  openrouter_temperature: number;
  openrouter_max_tokens: number;
  created_at: string;
};

export type EmailAccount = {
  id: string;
  user_id: string;
  sender_profile_id: string;
  label: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass_encrypted: string;
  imap_host: string | null;
  imap_port: number | null;
  imap_user: string | null;
  imap_pass_encrypted: string | null;
  imap_enabled: boolean;
  is_active: boolean;
  daily_sent: number;
  rotation_order: number;
  created_at: string;
};

export type Campaign = {
  id: string;
  user_id: string;
  sender_profile_id: string;
  lead_list_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  subject_prompt: string;
  body_prompt: string;
  total_leads: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  reply_count: number;
  created_at: string;
  started_at: string | null;
};

export type FollowUp = {
  id: string;
  campaign_id: string;
  step: number;
  delay_days: number;
  subject_prompt: string;
  body_prompt: string;
};

export type EmailSend = {
  id: string;
  campaign_id: string;
  follow_up_id: string | null;
  lead_id: string;
  email_account_id: string;
  tracking_id: string;
  subject: string;
  body_html: string;
  status: "pending_gen" | "ready" | "sent" | "failed" | "bounced";
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  created_at: string;
};

export type PromptStudioSettings = {
  id: string;
  user_id: string;
  subject_prompt: string;
  body_prompt: string;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_replied: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
};
