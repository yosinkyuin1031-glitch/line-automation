"use client";

import { useState } from "react";
import { MessageTemplate, LineMessage } from "@/lib/types";

interface Props {
  templates: MessageTemplate[];
  onUpdate: (templates: MessageTemplate[]) => void;
}

const CATEGORIES: { value: MessageTemplate["category"]; label: string; color: string }[] = [
  { value: "followup", label: "フォローアップ", color: "bg-blue-100 text-blue-700" },
  { value: "reminder", label: "リマインド", color: "bg-green-100 text-green-700" },
  { value: "campaign", label: "キャンペーン", color: "bg-orange-100 text-orange-700" },
  { value: "birthday", label: "誕生日", color: "bg-pink-100 text-pink-700" },
  { value: "reactivation", label: "再来院促進", color: "bg-purple-100 text-purple-700" },
  { value: "custom", label: "カスタム", color: "bg-gray-100 text-gray-700" },
];

const PRESET_TEMPLATES: Partial<MessageTemplate>[] = [
  {
    name: "初回来院後フォロー",
    category: "followup",
    description: "初回施術後の経過確認メッセージ",
    messages: [{ type: "text", text: "{name}様\n\n先日はご来院いただきありがとうございました。\n施術後の体調はいかがでしょうか？\n\n好転反応として一時的にだるさや痛みが出ることがありますが、通常2〜3日で落ち着きますのでご安心ください。\n\n何かご不明な点がございましたら、お気軽にご連絡ください。\n\n{clinicName}" }],
  },
  {
    name: "予約リマインド（前日）",
    category: "reminder",
    description: "予約日前日の自動リマインド",
    messages: [{ type: "text", text: "{name}様\n\n明日のご予約のリマインドです。\n\n日時: {date} {time}\n場所: {clinicName}\n\nお気をつけてお越しください。\nご都合が悪くなった場合は、お早めにご連絡ください。" }],
  },
  {
    name: "30日未来院者フォロー",
    category: "reactivation",
    description: "30日以上来院のない方への再来院促進",
    messages: [{ type: "text", text: "{name}様\n\nご無沙汰しております。{clinicName}です。\n\n前回のご来院から少しお時間が空いておりますが、お体の調子はいかがでしょうか？\n\n定期的なメンテナンスは症状の再発予防にとても効果的です。\n\nご都合のよいお日にちがございましたら、お気軽にご予約ください。\n\nスタッフ一同、お待ちしております。" }],
  },
  {
    name: "誕生日メッセージ",
    category: "birthday",
    description: "誕生月の方への特別メッセージ",
    messages: [{ type: "text", text: "{name}様\n\nお誕生日おめでとうございます！🎂\n\n{clinicName}より、ささやかですがお誕生月特典をご用意しております。\n\n今月中のご来院で施術料10%OFF！\n\nぜひこの機会にお体のメンテナンスにお越しください。" }],
  },
];

export default function TemplateTab({ templates, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MessageTemplate["category"]>("followup");
  const [description, setDescription] = useState("");
  const [messageText, setMessageText] = useState("");

  const resetForm = () => {
    setName(""); setCategory("followup"); setDescription(""); setMessageText(""); setEditId(null); setShowForm(false);
  };

  const handleSave = () => {
    if (!name.trim() || !messageText.trim()) return;
    const messages: LineMessage[] = [{ type: "text", text: messageText }];

    if (editId) {
      onUpdate(templates.map((t) => t.id === editId ? { ...t, name, category, description, messages } : t));
    } else {
      onUpdate([...templates, {
        id: `tmpl-${Date.now()}`, name, category, description, messages, createdAt: new Date().toISOString(),
      }]);
    }
    resetForm();
  };

  const handleEdit = (t: MessageTemplate) => {
    setEditId(t.id); setName(t.name); setCategory(t.category); setDescription(t.description);
    setMessageText(t.messages[0]?.text || ""); setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("このテンプレートを削除しますか？")) {
      onUpdate(templates.filter((t) => t.id !== id));
    }
  };

  const importPreset = (preset: Partial<MessageTemplate>) => {
    onUpdate([...templates, {
      id: `tmpl-${Date.now()}`,
      name: preset.name || "",
      category: preset.category || "custom",
      description: preset.description || "",
      messages: preset.messages || [],
      createdAt: new Date().toISOString(),
    }]);
  };

  const getCategoryStyle = (cat: MessageTemplate["category"]) => {
    return CATEGORIES.find((c) => c.value === cat)?.color || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">メッセージテンプレート</h3>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
            + テンプレート作成
          </button>
        </div>

        {/* プリセットインポート */}
        {templates.length === 0 && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800 mb-2">プリセットテンプレートを追加</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEMPLATES.map((p, i) => (
                <button key={i} onClick={() => importPreset(p)}
                  className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100">
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {showForm && (
          <div className="p-4 border-2 border-emerald-300 rounded-xl space-y-3 mb-4">
            <h4 className="font-bold text-gray-800">{editId ? "テンプレート編集" : "新規テンプレート"}</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="テンプレート名"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              <select value={category} onChange={(e) => setCategory(e.target.value as MessageTemplate["category"])}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                メッセージ本文
                <span className="text-gray-400 ml-2">変数: {"{name}"} {"{clinicName}"} {"{date}"} {"{time}"}</span>
              </label>
              <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={6}
                placeholder="メッセージを入力..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!name.trim() || !messageText.trim()}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300">
                {editId ? "更新" : "保存"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">キャンセル</button>
            </div>
          </div>
        )}

        {templates.length === 0 && !showForm ? (
          <p className="text-sm text-gray-500 py-8 text-center">テンプレートがありません</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryStyle(t.category)}`}>
                        {CATEGORIES.find((c) => c.value === t.category)?.label}
                      </span>
                      <p className="font-medium text-gray-800 text-sm">{t.name}</p>
                    </div>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.messages[0]?.text?.slice(0, 50)}...</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(t)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100">編集</button>
                    <button onClick={() => handleDelete(t.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100">削除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
