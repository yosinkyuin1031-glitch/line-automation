"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageTemplate, LineConfig, Contact, SendHistoryEntry } from "@/lib/types";
import { getSendHistory, addSendHistory } from "@/lib/storage";

interface Props {
  templates: MessageTemplate[];
  config: LineConfig;
  contacts: Contact[];
}

export default function SendTab({ templates, config, contacts }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendType, setSendType] = useState<"test" | "broadcast" | "multicast">("test");
  const [testUserId, setTestUserId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [history, setHistory] = useState<SendHistoryEntry[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const h = await getSendHistory();
      setHistory(h);
    } catch (e) {
      console.error("送信履歴の読み込みエラー:", e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

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

    let apiType: "push" | "broadcast" | "multicast" = "push";
    let to: string | string[] | undefined;
    let targetDescription = "";

    if (sendType === "broadcast") {
      apiType = "broadcast";
      targetDescription = "全員（ブロードキャスト）";
    } else if (sendType === "test") {
      apiType = "push";
      to = testUserId;
      targetDescription = `テスト送信 (${testUserId.slice(0, 10)}...)`;
    } else if (sendType === "multicast") {
      apiType = "multicast";
      const userIds = contacts
        .filter((c) => selectedContactIds.includes(c.id) && c.lineUserId)
        .map((c) => c.lineUserId!);
      to = userIds;
      targetDescription = `${userIds.length}名にマルチキャスト`;
      if (userIds.length === 0) {
        setResult({ type: "error", msg: "LINE ユーザーIDを持つコンタクトが選択されていません" });
        setSending(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/line-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: config.channelAccessToken,
          type: apiType,
          to,
          messages,
        }),
      });
      const data = await res.json();
      const success = !!data.success;

      const entry: SendHistoryEntry = {
        id: `hist-${Date.now()}`,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        sendType,
        targetDescription,
        success,
        errorMessage: success ? undefined : data.error,
        sentAt: new Date().toISOString(),
      };
      await addSendHistory(entry);
      await loadHistory();

      if (success) {
        const msg =
          sendType === "broadcast"
            ? "全員に送信しました"
            : sendType === "multicast"
            ? `${(to as string[]).length}名に送信しました`
            : "テスト送信しました";
        setResult({ type: "success", msg });
      } else {
        setResult({ type: "error", msg: data.error });
      }
    } catch (e) {
      const entry: SendHistoryEntry = {
        id: `hist-${Date.now()}`,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        sendType,
        targetDescription,
        success: false,
        errorMessage: e instanceof Error ? e.message : "送信エラー",
        sentAt: new Date().toISOString(),
      };
      await addSendHistory(entry);
      await loadHistory();

      setResult({ type: "error", msg: e instanceof Error ? e.message : "送信エラー" });
    } finally {
      setSending(false);
    }
  };

  const canSend =
    selectedTemplate &&
    config.channelAccessToken &&
    (sendType === "broadcast" ||
      (sendType === "test" && testUserId) ||
      (sendType === "multicast" && selectedContactIds.length > 0));

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
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">テンプレートを選択...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
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
              {(["test", "multicast", "broadcast"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSendType(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                    sendType === type
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {type === "test"
                    ? "テスト（個人）"
                    : type === "multicast"
                    ? "選択送信"
                    : "一斉送信（全員）"}
                </button>
              ))}
            </div>
          </div>

          {sendType === "test" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">送信先ユーザーID</label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">LINE Developers → チャネル → あなたのユーザーID</p>
            </div>
          )}

          {sendType === "multicast" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                送信先コンタクトを選択（{selectedContactIds.length}名選択中）
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">
                    コンタクトタブで連絡先を追加してください
                  </p>
                ) : (
                  contacts.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer ${
                        !c.lineUserId ? "opacity-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                        disabled={!c.lineUserId}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-gray-700">{c.name}</span>
                      {c.lineUserId ? (
                        <span className="text-xs text-gray-400 font-mono">
                          {c.lineUserId.slice(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-xs text-red-400">IDなし</span>
                      )}
                      {c.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {sendType === "broadcast" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">全友だちに送信されます。送信前に必ずテスト送信で内容を確認してください。</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !canSend}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300"
          >
            {sending
              ? "送信中..."
              : sendType === "broadcast"
              ? "全員に送信"
              : sendType === "multicast"
              ? `${selectedContactIds.length}名に送信`
              : "テスト送信"}
          </button>

          {result && (
            <p
              className={`text-xs px-3 py-2 rounded-lg ${
                result.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {result.msg}
            </p>
          )}
        </div>
      </div>

      {/* Send History */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-lg mb-4">送信履歴</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">送信履歴はありません</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map((h) => (
              <div key={h.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        h.success ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <p className="text-sm font-medium text-gray-800">{h.templateName}</p>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                      {h.sendType === "test"
                        ? "テスト"
                        : h.sendType === "broadcast"
                        ? "一斉"
                        : "選択"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(h.sentAt).toLocaleString("ja-JP")} - {h.targetDescription}
                  </p>
                  {h.errorMessage && (
                    <p className="text-xs text-red-500 mt-0.5">{h.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
