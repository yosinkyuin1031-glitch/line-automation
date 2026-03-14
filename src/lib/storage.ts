import { LineConfig, MessageTemplate, ScheduledMessage, Contact, StepMessage, SendHistoryEntry } from "./types";

const KEYS = {
  config: "line-auto-config",
  templates: "line-auto-templates",
  scheduled: "line-auto-scheduled",
  contacts: "line-auto-contacts",
  steps: "line-auto-steps",
  sendHistory: "line-auto-send-history",
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}
function set<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getConfig(): LineConfig { return get(KEYS.config, { channelAccessToken: "", channelSecret: "" }); }
export function saveConfig(c: LineConfig) { set(KEYS.config, c); }

export function getTemplates(): MessageTemplate[] { return get(KEYS.templates, []); }
export function saveTemplates(data: MessageTemplate[]) { set(KEYS.templates, data); }

export function getScheduled(): ScheduledMessage[] { return get(KEYS.scheduled, []); }
export function saveScheduled(data: ScheduledMessage[]) { set(KEYS.scheduled, data); }

export function getContacts(): Contact[] { return get(KEYS.contacts, []); }
export function saveContacts(data: Contact[]) { set(KEYS.contacts, data); }

export function getSteps(): StepMessage[] { return get(KEYS.steps, []); }
export function saveSteps(data: StepMessage[]) { set(KEYS.steps, data); }

export function getSendHistory(): SendHistoryEntry[] { return get(KEYS.sendHistory, []); }
export function saveSendHistory(data: SendHistoryEntry[]) { set(KEYS.sendHistory, data); }
export function addSendHistory(entry: SendHistoryEntry) {
  const history = getSendHistory();
  history.unshift(entry);
  // Keep last 100 entries
  if (history.length > 100) history.length = 100;
  saveSendHistory(history);
}
