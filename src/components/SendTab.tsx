"use client";

import { useState } from "react";
import { MessageTemplate, LineConfig } from "@/lib/types";

interface Props {
  templates: MessageTemplate[];
  config: LineConfig;
}

export default function SendTab({ templates, config }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendType, setSendType] = useState<"broadcast" | "test">("test");
  const [testUserId, setTestUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSend = async () => {
    if (!selectedTemplate || !config.channelAccessToken) return;
    setSending(true);
    setResult(null);

    const messages = selectedTemplate.messages.map((m) => {
      if (m.type === "text") {
        return {
          type: "text",
          text: (m.text || "")
            .replace(/\{name\}/g, "テスト太郎")
            .replace(/\{clinicName\}/g, "テスト整体院")
            .replace(/\{date\}/g, "2026年3月20日")
            .replace(/\{time\}/g, "14:00"),
        };
      }
      return m;
    });

    try {
      const res = await fetch("/api/line-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: config.channelAccessToken,
          type: sendType === "broadcast" ? "broadcast" : "push",
          to: sendType === "test" ? testUserId : undefined,
          messages,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", msg: sendType === "broadcast" ? "全員に送信しました" : "テスト送信しました" });
      } else {
        setResult({ type: "error", msg: data.error });
      }
    } catch (e) {
      setResult({ type: "error", msg: e instanceof Error ? e.message : "送信エラー" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-lg mb-4">メッセージ送信</h3>

        {!config.channelAccessToken && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <p className="text-sm text-yellow-800">設定タブでLINEチャネルアクセストークンを入力してください</p>
          </div>
        )}

        <div className="space-y-4">
          {/* テンプレート選択 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">テンプレート選択</label>
            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">テンプレートを選択...</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* プレビュー */}
          {selectedTemplate && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-2">プレビュー</p>
              <div className="bg-white p-3 rounded-lg border border-gray-200 max-w-xs">
                <div className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg text-sm whitespace-pre-wrap">
                  {(selectedTemplate.messages[0]?.text || "")
                    .replace(/\{name\}/g, "テスト太郎")
                    .replace(/\{clinicName\}/g, "テスト整体院")
                    .replace(/\{date\}/g, "2026年3月20日")
                    .replace(/\{time\}/g, "14:00")}
                </div>
              </div>
            </div>
          )}

          {/* 送信タイプ */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">送信先</label>
            <div className="flex gap-2">
              <button onClick={() => setSendType("test")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  sendType === "test" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                テスト送信（個人）
              </button>
              <button onClick={() => setSendType("broadcast")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  sendType === "broadcast" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                一斉送信（全員）
              </button>
            </div>
          </div>

          {sendType === "test" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">送信先ユーザーID</label>
              <input type="text" value={testUserId} onChange={(e) => setTestUserId(e.target.value)}
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500" />
              <p className="text-xs text-gray-400 mt-1">LINE Developers → チャネル → あなたのユーザーID</p>
            </div>
          )}

          {sendType === "broadcast" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">全友だちに送信されます。送信前に必ずテスト送信で内容を確認してください。</p>
            </div>
          )}

          <button onClick={handleSend}
            disabled={sending || !selectedTemplate || !config.channelAccessToken || (sendType === "test" && !testUserId)}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300">
            {sending ? "送信中..." : sendType === "broadcast" ? "全員に送信" : "テスト送信"}
          </button>

          {result && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              result.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}>{result.msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
