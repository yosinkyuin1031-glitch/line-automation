import { supabase } from "./supabase";
import {
  LineConfig,
  MessageTemplate,
  ScheduledMessage,
  Contact,
  StepMessage,
  SendHistoryEntry,
} from "./types";

// ========== Auth ==========

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: unknown) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

async function getUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("ログインが必要です");
  return session.user.id;
}

// ========== Config (Settings) ==========

export async function getConfig(): Promise<LineConfig> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("la_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return { channelAccessToken: "", channelSecret: "" };
  return {
    channelAccessToken: data.channel_access_token || "",
    channelSecret: data.channel_secret || "",
    utageApiUrl: data.utage_url || undefined,
    utageApiKey: data.utage_api_key || undefined,
  };
}

export async function saveConfig(c: LineConfig): Promise<void> {
  const userId = await getUserId();
  const { data: existing } = await supabase
    .from("la_settings")
    .select("id")
    .eq("user_id", userId)
    .single();

  const row = {
    user_id: userId,
    channel_access_token: c.channelAccessToken,
    channel_secret: c.channelSecret,
    utage_url: c.utageApiUrl || null,
    utage_api_key: c.utageApiKey || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("la_settings").update(row).eq("id", existing.id);
  } else {
    await supabase.from("la_settings").insert(row);
  }
}

// ========== Templates ==========

export async function getTemplates(): Promise<MessageTemplate[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("la_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as MessageTemplate["category"],
    messages: (row.content as unknown as MessageTemplate["messages"]) || [],
    description: row.description || "",
    createdAt: row.created_at,
  }));
}

export async function saveTemplates(templates: MessageTemplate[]): Promise<void> {
  const userId = await getUserId();

  // Get existing template IDs
  const { data: existing } = await supabase
    .from("la_templates")
    .select("id")
    .eq("user_id", userId);

  const existingIds = new Set((existing || []).map((r) => r.id));
  const newIds = new Set(templates.map((t) => t.id));

  // Delete removed templates
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("la_templates").delete().in("id", toDelete);
  }

  // Upsert all templates
  for (const t of templates) {
    const row = {
      id: t.id,
      user_id: userId,
      name: t.name,
      category: t.category,
      description: t.description,
      content: t.messages as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };

    if (existingIds.has(t.id)) {
      await supabase.from("la_templates").update(row).eq("id", t.id);
    } else {
      await supabase.from("la_templates").insert({ ...row, created_at: t.createdAt || new Date().toISOString() });
    }
  }
}

// ========== Contacts ==========

export async function getContacts(): Promise<Contact[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("la_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data || []).map((row) => ({
    id: row.id,
    lineUserId: row.line_user_id || undefined,
    name: row.display_name,
    phone: row.phone || undefined,
    tags: row.tags || [],
    lastVisit: row.last_visit_date || undefined,
    visitCount: row.visit_count || 0,
    memo: row.memo || undefined,
    createdAt: row.created_at,
  }));
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  const userId = await getUserId();

  const { data: existing } = await supabase
    .from("la_contacts")
    .select("id")
    .eq("user_id", userId);

  const existingIds = new Set((existing || []).map((r) => r.id));
  const newIds = new Set(contacts.map((c) => c.id));

  // Delete removed contacts
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("la_contacts").delete().in("id", toDelete);
  }

  // Upsert contacts
  for (const c of contacts) {
    const row = {
      id: c.id,
      user_id: userId,
      display_name: c.name,
      line_user_id: c.lineUserId || null,
      phone: c.phone || null,
      tags: c.tags,
      last_visit_date: c.lastVisit || null,
      visit_count: c.visitCount,
      memo: c.memo || null,
      updated_at: new Date().toISOString(),
    };

    if (existingIds.has(c.id)) {
      await supabase.from("la_contacts").update(row).eq("id", c.id);
    } else {
      await supabase.from("la_contacts").insert({ ...row, created_at: c.createdAt || new Date().toISOString() });
    }
  }
}

// ========== Scheduled Messages ==========

export async function getScheduled(): Promise<ScheduledMessage[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("la_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data || []).map((row) => {
    const config = (row.target_config || {}) as Record<string, unknown>;
    return {
      id: row.id,
      templateId: row.template_id || "",
      scheduledAt: row.scheduled_at,
      targetType: (row.target_type as ScheduledMessage["targetType"]) || "all",
      targetIds: (config.targetIds as string[]) || undefined,
      segmentFilter: config.segmentFilter
        ? (config.segmentFilter as ScheduledMessage["segmentFilter"])
        : undefined,
      status: (row.status as ScheduledMessage["status"]) || "scheduled",
      sentAt: row.sent_at || undefined,
      sentCount: row.sent_count || undefined,
    };
  });
}

export async function saveScheduled(scheduled: ScheduledMessage[]): Promise<void> {
  const userId = await getUserId();

  const { data: existing } = await supabase
    .from("la_schedules")
    .select("id")
    .eq("user_id", userId);

  const existingIds = new Set((existing || []).map((r) => r.id));
  const newIds = new Set(scheduled.map((s) => s.id));

  // Delete removed schedules
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("la_schedules").delete().in("id", toDelete);
  }

  for (const s of scheduled) {
    const row = {
      id: s.id,
      user_id: userId,
      template_id: s.templateId || null,
      scheduled_at: s.scheduledAt,
      target_type: s.targetType,
      target_config: {
        targetIds: s.targetIds || null,
        segmentFilter: s.segmentFilter || null,
      },
      status: s.status,
      sent_at: s.sentAt || null,
      sent_count: s.sentCount || null,
    };

    if (existingIds.has(s.id)) {
      await supabase.from("la_schedules").update(row).eq("id", s.id);
    } else {
      await supabase.from("la_schedules").insert(row);
    }
  }
}

// ========== Step Messages ==========

export async function getSteps(): Promise<StepMessage[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("la_step_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    trigger: row.trigger_type as StepMessage["trigger"],
    triggerDays: row.trigger_days || undefined,
    steps: (row.steps as unknown as StepMessage["steps"]) || [],
    active: row.active ?? true,
    createdAt: row.created_at,
  }));
}

export async function saveSteps(steps: StepMessage[]): Promise<void> {
  const userId = await getUserId();

  const { data: existing } = await supabase
    .from("la_step_messages")
    .select("id")
    .eq("user_id", userId);

  const existingIds = new Set((existing || []).map((r) => r.id));
  const newIds = new Set(steps.map((s) => s.id));

  const toDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("la_step_messages").delete().in("id", toDelete);
  }

  for (const s of steps) {
    const row = {
      id: s.id,
      user_id: userId,
      name: s.name,
      trigger_type: s.trigger,
      trigger_days: s.triggerDays || null,
      steps: s.steps as unknown as Record<string, unknown>,
      active: s.active,
      updated_at: new Date().toISOString(),
    };

    if (existingIds.has(s.id)) {
      await supabase.from("la_step_messages").update(row).eq("id", s.id);
    } else {
      await supabase.from("la_step_messages").insert({ ...row, created_at: s.createdAt || new Date().toISOString() });
    }
  }
}

// ========== Send History ==========

export async function getSendHistory(): Promise<SendHistoryEntry[]> {
  const userId = await getUserId();
  const { data } = await supabase
    .from("la_send_history")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(100);

  return (data || []).map((row) => ({
    id: row.id,
    templateId: row.template_id || "",
    templateName: row.template_name,
    sendType: row.send_type as SendHistoryEntry["sendType"],
    targetDescription: row.target_description || "",
    success: row.success ?? false,
    errorMessage: row.error_message || undefined,
    sentAt: row.sent_at,
  }));
}

export async function saveSendHistory(_data: SendHistoryEntry[]): Promise<void> {
  // Not used directly - use addSendHistory instead
}

export async function addSendHistory(entry: SendHistoryEntry): Promise<void> {
  const userId = await getUserId();
  await supabase.from("la_send_history").insert({
    user_id: userId,
    template_id: entry.templateId,
    template_name: entry.templateName,
    send_type: entry.sendType,
    target_description: entry.targetDescription,
    success: entry.success,
    error_message: entry.errorMessage || null,
    sent_at: entry.sentAt,
  });
}
