export interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  // 宴(うたげ)連携
  utageApiUrl?: string;
  utageApiKey?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: "followup" | "reminder" | "campaign" | "birthday" | "reactivation" | "custom";
  messages: LineMessage[];
  description: string;
  createdAt: string;
}

export interface LineMessage {
  type: "text" | "image" | "flex" | "richmenu";
  text?: string;
  imageUrl?: string;
  altText?: string;
  flexJson?: string;
}

export interface ScheduledMessage {
  id: string;
  templateId: string;
  scheduledAt: string; // ISO datetime
  targetType: "all" | "segment" | "individual";
  targetIds?: string[]; // userId list
  segmentFilter?: SegmentFilter;
  status: "scheduled" | "sent" | "failed" | "cancelled";
  sentAt?: string;
  sentCount?: number;
}

export interface SegmentFilter {
  lastVisitDays?: number; // 最終来院からの日数
  visitCountMin?: number;
  visitCountMax?: number;
  tags?: string[];
}

export interface Contact {
  id: string;
  lineUserId?: string;
  name: string;
  phone?: string;
  tags: string[];
  lastVisit?: string;
  visitCount: number;
  memo?: string;
  createdAt: string;
}

export interface StepMessage {
  id: string;
  name: string;
  trigger: "follow" | "days_after_visit" | "manual";
  triggerDays?: number; // trigger後の日数
  steps: StepItem[];
  active: boolean;
  createdAt: string;
}

export interface StepItem {
  dayOffset: number; // トリガーからの日数
  hour: number; // 送信時刻（時）
  templateId: string;
}

export type TabType = "templates" | "send" | "contacts" | "step" | "settings";
