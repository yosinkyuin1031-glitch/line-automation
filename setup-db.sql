-- LINE自動化アプリ Supabase テーブル定義
-- プレフィックス: la_ (line automation)

-- la_settings: LINE API認証情報・宴設定
CREATE TABLE la_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_access_token TEXT NOT NULL DEFAULT '',
  channel_secret TEXT NOT NULL DEFAULT '',
  utage_url TEXT,
  utage_api_key TEXT,
  clinic_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- la_templates: メッセージテンプレート
CREATE TABLE la_templates (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  description TEXT DEFAULT '',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- la_contacts: LINE連絡先
CREATE TABLE la_contacts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  line_user_id TEXT,
  display_name TEXT NOT NULL,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  last_visit_date TEXT,
  visit_count INT DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- la_schedules: 予約配信
CREATE TABLE la_schedules (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id TEXT REFERENCES la_templates(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'broadcast',
  target_config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  sent_count INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- la_send_history: 送信ログ
CREATE TABLE la_send_history (
  id TEXT PRIMARY KEY DEFAULT 'hist-' || extract(epoch from now())::bigint::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id TEXT,
  template_name TEXT NOT NULL,
  send_type TEXT NOT NULL,
  target_description TEXT DEFAULT '',
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- la_step_messages: ステップ配信
CREATE TABLE la_step_messages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'follow',
  trigger_days INT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS ポリシー
ALTER TABLE la_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_send_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_step_messages ENABLE ROW LEVEL SECURITY;

-- la_settings policies
CREATE POLICY "la_settings_select" ON la_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "la_settings_insert" ON la_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "la_settings_update" ON la_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "la_settings_delete" ON la_settings FOR DELETE USING (auth.uid() = user_id);

-- la_templates policies
CREATE POLICY "la_templates_select" ON la_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "la_templates_insert" ON la_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "la_templates_update" ON la_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "la_templates_delete" ON la_templates FOR DELETE USING (auth.uid() = user_id);

-- la_contacts policies
CREATE POLICY "la_contacts_select" ON la_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "la_contacts_insert" ON la_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "la_contacts_update" ON la_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "la_contacts_delete" ON la_contacts FOR DELETE USING (auth.uid() = user_id);

-- la_schedules policies
CREATE POLICY "la_schedules_select" ON la_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "la_schedules_insert" ON la_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "la_schedules_update" ON la_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "la_schedules_delete" ON la_schedules FOR DELETE USING (auth.uid() = user_id);

-- la_send_history policies
CREATE POLICY "la_send_history_select" ON la_send_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "la_send_history_insert" ON la_send_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "la_send_history_delete" ON la_send_history FOR DELETE USING (auth.uid() = user_id);

-- la_step_messages policies
CREATE POLICY "la_step_messages_select" ON la_step_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "la_step_messages_insert" ON la_step_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "la_step_messages_update" ON la_step_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "la_step_messages_delete" ON la_step_messages FOR DELETE USING (auth.uid() = user_id);
