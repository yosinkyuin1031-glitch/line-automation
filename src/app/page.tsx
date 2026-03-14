"use client";

import { useState, useEffect } from "react";
import { TabType, MessageTemplate, LineConfig, Contact, ScheduledMessage } from "@/lib/types";
import { getConfig, saveConfig, getTemplates, saveTemplates, getContacts, saveContacts, getScheduled, saveScheduled } from "@/lib/storage";
import TemplateTab from "@/components/TemplateTab";
import SendTab from "@/components/SendTab";
import ContactsTab from "@/components/ContactsTab";
import ScheduleTab from "@/components/ScheduleTab";

export default function Home() {
  const [tab, setTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [config, setConfig] = useState<LineConfig>({ channelAccessToken: "", channelSecret: "" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);

  useEffect(() => {
    setTemplates(getTemplates());
    setConfig(getConfig());
    setContacts(getContacts());
    setScheduled(getScheduled());
  }, []);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "templates", label: "テンプレート", icon: "📝" },
    { id: "send", label: "送信", icon: "📤" },
    { id: "contacts", label: "コンタクト", icon: "👥" },
    { id: "schedule", label: "スケジュール", icon: "📅" },
    { id: "settings", label: "設定", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800">
            <span className="text-emerald-600">LINE</span>メッセージ自動化
          </h1>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-[52px] z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === "templates" && (
          <TemplateTab templates={templates} onUpdate={(t) => { saveTemplates(t); setTemplates(t); }} />
        )}
        {tab === "send" && <SendTab templates={templates} config={config} contacts={contacts} />}
        {tab === "contacts" && (
          <ContactsTab contacts={contacts} onUpdate={(c) => { saveContacts(c); setContacts(c); }} />
        )}
        {tab === "schedule" && (
          <ScheduleTab
            templates={templates}
            contacts={contacts}
            scheduled={scheduled}
            config={config}
            onUpdate={(s) => { saveScheduled(s); setScheduled(s); }}
          />
        )}
        {tab === "settings" && (
          <SettingsView config={config} onSave={(c) => { saveConfig(c); setConfig(c); }} />
        )}
      </main>
    </div>
  );
}

function SettingsView({ config, onSave }: { config: LineConfig; onSave: (c: LineConfig) => void }) {
  const [c, setC] = useState(config);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [utageTestResult, setUtageTestResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [utageTesting, setUtageTesting] = useState(false);

  const save = () => { onSave(c); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const testConnection = async () => {
    if (!c.channelAccessToken) return;
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/line-send", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelAccessToken: c.channelAccessToken }),
      });
      const data = await res.json();
      setTestResult(res.ok ? { type: "success", msg: `接続OK: ${data.botName} (@${data.basicId})` } : { type: "error", msg: data.error });
    } catch { setTestResult({ type: "error", msg: "接続失敗" }); }
    setTesting(false);
  };

  const testUtageConnection = async () => {
    if (!c.utageApiUrl) return;
    setUtageTesting(true); setUtageTestResult(null);
    try {
      const res = await fetch(c.utageApiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${c.utageApiKey || ""}`,
          "Accept": "application/json",
        },
      });
      if (res.ok) {
        setUtageTestResult({ type: "success", msg: `接続OK (ステータス: ${res.status})` });
      } else {
        setUtageTestResult({ type: "error", msg: `接続失敗 (ステータス: ${res.status})` });
      }
    } catch {
      setUtageTestResult({ type: "error", msg: "接続失敗: ネットワークエラーまたはCORSエラーの可能性があります" });
    }
    setUtageTesting(false);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">LINE Messaging API設定</h3>
        <div className="p-3 bg-emerald-50 rounded-lg">
          <p className="text-xs text-emerald-700">
            LINE Developersコンソール → Messaging API → チャネルアクセストークン(長期)を発行して入力してください。
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">チャネルアクセストークン</label>
          <textarea value={c.channelAccessToken} onChange={(e) => setC({ ...c, channelAccessToken: e.target.value })}
            rows={3} placeholder="チャネルアクセストークン(長期)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">チャネルシークレット</label>
          <input type="password" value={c.channelSecret} onChange={(e) => setC({ ...c, channelSecret: e.target.value })}
            placeholder="チャネルシークレット"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={testConnection} disabled={testing || !c.channelAccessToken}
          className="w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 disabled:opacity-50">
          {testing ? "テスト中..." : "接続テスト"}
        </button>
        {testResult && (
          <p className={`text-xs px-3 py-2 rounded-lg ${testResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{testResult.msg}</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">宴（うたげ）連携</h3>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-700">
            宴のLINE連携を使用している場合、APIの競合に注意が必要です。
            宴側でWebhookを設定している場合、このツールからの送信は宴と独立して動作します。
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">宴 API URL（任意）</label>
          <input type="url" value={c.utageApiUrl || ""} onChange={(e) => setC({ ...c, utageApiUrl: e.target.value })}
            placeholder="https://utage-system.com/api/..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">宴 APIキー（任意）</label>
          <input type="password" value={c.utageApiKey || ""} onChange={(e) => setC({ ...c, utageApiKey: e.target.value })}
            placeholder="API Key"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={testUtageConnection} disabled={utageTesting || !c.utageApiUrl}
          className="w-full py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-200 disabled:opacity-50">
          {utageTesting ? "テスト中..." : "宴 接続テスト"}
        </button>
        {utageTestResult && (
          <p className={`text-xs px-3 py-2 rounded-lg ${utageTestResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{utageTestResult.msg}</p>
        )}
      </div>

      <button onClick={save}
        className={`w-full py-2.5 rounded-lg text-sm font-medium ${saved ? "bg-green-500 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
        {saved ? "保存しました" : "設定を保存"}
      </button>
    </div>
  );
}
