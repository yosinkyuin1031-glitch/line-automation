"use client";

import { useState, useEffect, useCallback } from "react";
import { TabType, MessageTemplate, LineConfig, Contact, ScheduledMessage } from "@/lib/types";
import {
  getConfig, saveConfig, getTemplates, saveTemplates,
  getContacts, saveContacts, getScheduled, saveScheduled,
  signIn, signUp, signOut, getSession, onAuthStateChange,
} from "@/lib/storage";
import TemplateTab from "@/components/TemplateTab";
import SendTab from "@/components/SendTab";
import ContactsTab from "@/components/ContactsTab";
import ScheduleTab from "@/components/ScheduleTab";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [tab, setTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [config, setConfig] = useState<LineConfig>({ channelAccessToken: "", channelSecret: "" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [t, c, ct, s] = await Promise.all([
        getTemplates(),
        getConfig(),
        getContacts(),
        getScheduled(),
      ]);
      setTemplates(t);
      setConfig(c);
      setContacts(ct);
      setScheduled(s);
    } catch (e) {
      console.error("データ読み込みエラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (session) {
        setAuthed(true);
        setUserEmail(session.user?.email || "");
        loadData();
      } else {
        setAuthed(false);
        setLoading(false);
      }
    };
    checkAuth();

    const { data: listener } = onAuthStateChange((session) => {
      if (session) {
        setAuthed(true);
        setUserEmail((session as { user?: { email?: string } })?.user?.email || "");
        loadData();
      } else {
        setAuthed(false);
        setTemplates([]);
        setConfig({ channelAccessToken: "", channelSecret: "" });
        setContacts([]);
        setScheduled([]);
      }
    });

    return () => { listener?.subscription.unsubscribe(); };
  }, [loadData]);

  const handleUpdateTemplates = async (t: MessageTemplate[]) => {
    setTemplates(t);
    await saveTemplates(t);
  };

  const handleUpdateContacts = async (c: Contact[]) => {
    setContacts(c);
    await saveContacts(c);
  };

  const handleUpdateScheduled = async (s: ScheduledMessage[]) => {
    setScheduled(s);
    await saveScheduled(s);
  };

  const handleSaveConfig = async (c: LineConfig) => {
    setConfig(c);
    await saveConfig(c);
  };

  if (authed === null || (authed && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <LoginView onSuccess={() => {}} />;
  }

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            <span className="text-emerald-600">LINE</span>メッセージ自動化
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{userEmail}</span>
            <button onClick={() => signOut()}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">
              ログアウト
            </button>
          </div>
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
          <TemplateTab templates={templates} onUpdate={handleUpdateTemplates} />
        )}
        {tab === "send" && <SendTab templates={templates} config={config} contacts={contacts} />}
        {tab === "contacts" && (
          <ContactsTab contacts={contacts} onUpdate={handleUpdateContacts} />
        )}
        {tab === "schedule" && (
          <ScheduleTab
            templates={templates}
            contacts={contacts}
            scheduled={scheduled}
            config={config}
            onUpdate={handleUpdateScheduled}
          />
        )}
        {tab === "settings" && (
          <SettingsView config={config} onSave={handleSaveConfig} />
        )}
      </main>
    </div>
  );
}

function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setSignUpSuccess(true);
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "認証エラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">
            <span className="text-emerald-600">LINE</span>メッセージ自動化
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp ? "アカウント作成" : "ログイン"}
          </p>
        </div>

        {signUpSuccess ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。
              </p>
            </div>
            <button onClick={() => { setIsSignUp(false); setSignUpSuccess(false); }}
              className="text-sm text-emerald-600 hover:underline">
              ログイン画面へ戻る
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">パスワード</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading || !email || !password}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300">
              {loading ? "処理中..." : isSignUp ? "アカウント作成" : "ログイン"}
            </button>

            <p className="text-center text-xs text-gray-500">
              {isSignUp ? "既にアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-emerald-600 hover:underline ml-1">
                {isSignUp ? "ログイン" : "新規作成"}
              </button>
            </p>
          </form>
        )}
      </div>
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
