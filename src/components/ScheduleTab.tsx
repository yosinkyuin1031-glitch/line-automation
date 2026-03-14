"use client";

import { useState, useMemo } from "react";
import { MessageTemplate, ScheduledMessage, Contact } from "@/lib/types";

interface Props {
  templates: MessageTemplate[];
  contacts: Contact[];
  scheduled: ScheduledMessage[];
  onUpdate: (scheduled: ScheduledMessage[]) => void;
}

const STATUS_LABELS: Record<ScheduledMessage["status"], { label: string; color: string }> = {
  scheduled: { label: "予約済み", color: "bg-blue-100 text-blue-700" },
  sent: { label: "送信済み", color: "bg-green-100 text-green-700" },
  failed: { label: "失敗", color: "bg-red-100 text-red-700" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-600" },
};

export default function ScheduleTab({ templates, contacts, scheduled, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [targetType, setTargetType] = useState<"all" | "individual" | "segment">("all");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags))).sort();

  const resetForm = () => {
    setTemplateId("");
    setTargetType("all");
    setSelectedContactIds([]);
    setTagFilter("");
    setScheduledAt("");
    setShowForm(false);
  };

  const handleSchedule = () => {
    if (!templateId || !scheduledAt) return;

    const newScheduled: ScheduledMessage = {
      id: `sched-${Date.now()}`,
      templateId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      targetType,
      targetIds: targetType === "individual" ? selectedContactIds : undefined,
      segmentFilter: targetType === "segment" && tagFilter ? { tags: [tagFilter] } : undefined,
      status: "scheduled",
    };

    onUpdate([...scheduled, newScheduled]);
    resetForm();
  };

  const handleCancel = (id: string) => {
    onUpdate(
      scheduled.map((s) =>
        s.id === id ? { ...s, status: "cancelled" as const } : s
      )
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("このスケジュールを削除しますか？")) {
      onUpdate(scheduled.filter((s) => s.id !== id));
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getTemplateName = (id: string) =>
    templates.find((t) => t.id === id)?.name || "不明なテンプレート";

  const getTargetDescription = (s: ScheduledMessage) => {
    if (s.targetType === "all") return "全員";
    if (s.targetType === "segment" && s.segmentFilter?.tags) {
      return `タグ: ${s.segmentFilter.tags.join(", ")}`;
    }
    if (s.targetType === "individual" && s.targetIds) {
      return `${s.targetIds.length}名を選択`;
    }
    return "不明";
  };

  // Calendar view data
  const calendarData = useMemo(() => {
    const upcoming = scheduled.filter((s) => s.status === "scheduled");
    const grouped: Record<string, ScheduledMessage[]> = {};
    for (const s of upcoming) {
      const date = s.scheduledAt.split("T")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(s);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [scheduled]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">
            スケジュール配信
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({scheduled.filter((s) => s.status === "scheduled").length}件予約中)
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              {viewMode === "list" ? "カレンダー表示" : "リスト表示"}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              + 配信予約
            </button>
          </div>
        </div>

        {/* Schedule form */}
        {showForm && (
          <div className="p-4 border-2 border-emerald-300 rounded-xl space-y-4 mb-4">
            <h4 className="font-bold text-gray-800">新規配信予約</h4>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                テンプレート
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                送信先
              </label>
              <div className="flex gap-2">
                {(["all", "individual", "segment"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTargetType(type)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      targetType === type
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {type === "all" ? "全員" : type === "individual" ? "個別選択" : "タグ絞り込み"}
                  </button>
                ))}
              </div>
            </div>

            {targetType === "individual" && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">
                    コンタクトがありません
                  </p>
                ) : (
                  contacts.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-gray-700">{c.name}</span>
                      {c.lineUserId && (
                        <span className="text-xs text-gray-400 font-mono">
                          {c.lineUserId.slice(0, 10)}...
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}

            {targetType === "segment" && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">タグを選択...</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                送信日時
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-700">
                現在のバージョンではスケジュール予約はローカルに保存されます。自動送信機能は今後追加予定です。
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSchedule}
                disabled={!templateId || !scheduledAt}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300"
              >
                予約する
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* Calendar view */}
        {viewMode === "calendar" && (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-gray-600">タイムライン</h4>
            {calendarData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                予約中の配信はありません
              </p>
            ) : (
              calendarData.map(([date, items]) => (
                <div key={date} className="border-l-2 border-emerald-300 pl-4">
                  <p className="text-sm font-bold text-emerald-700 mb-1">{date}</p>
                  {items.map((s) => (
                    <div key={s.id} className="p-2 bg-emerald-50 rounded-lg mb-1 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-800 font-medium">
                          {getTemplateName(s.templateId)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(s.scheduledAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          - {getTargetDescription(s)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(s.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        取消
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <>
            {scheduled.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                スケジュールされた配信はありません
              </p>
            ) : (
              <div className="space-y-2">
                {scheduled
                  .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
                  .map((s) => {
                    const st = STATUS_LABELS[s.status];
                    return (
                      <div key={s.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}
                              >
                                {st.label}
                              </span>
                              <p className="font-medium text-gray-800 text-sm">
                                {getTemplateName(s.templateId)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(s.scheduledAt).toLocaleString("ja-JP")} -{" "}
                              {getTargetDescription(s)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {s.status === "scheduled" && (
                              <button
                                onClick={() => handleCancel(s.id)}
                                className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg text-xs hover:bg-yellow-100"
                              >
                                取消
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
