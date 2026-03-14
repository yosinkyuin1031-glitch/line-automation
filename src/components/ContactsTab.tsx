"use client";

import { useState, useRef } from "react";
import { Contact } from "@/lib/types";

interface Props {
  contacts: Contact[];
  onUpdate: (contacts: Contact[]) => void;
}

export default function ContactsTab({ contacts, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [tags, setTags] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collect all unique tags
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags))).sort();

  // Filter contacts
  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = !filterTag || c.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const resetForm = () => {
    setName("");
    setLineUserId("");
    setTags("");
    setShowForm(false);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      name: name.trim(),
      lineUserId: lineUserId.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      visitCount: 0,
      createdAt: new Date().toISOString(),
    };
    onUpdate([...contacts, newContact]);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("この連絡先を削除しますか？")) {
      onUpdate(contacts.filter((c) => c.id !== id));
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setImportResult("CSVにデータがありません");
        return;
      }

      // Skip header row
      const newContacts: Contact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) continue;
        newContacts.push({
          id: `contact-${Date.now()}-${i}`,
          name: cols[0],
          lineUserId: cols[1] || undefined,
          tags: cols[2]
            ? cols[2].split("|").map((t) => t.trim()).filter(Boolean)
            : [],
          visitCount: 0,
          createdAt: new Date().toISOString(),
        });
      }

      if (newContacts.length > 0) {
        onUpdate([...contacts, ...newContacts]);
        setImportResult(`${newContacts.length}件のコンタクトをインポートしました`);
      } else {
        setImportResult("インポートできるデータがありませんでした");
      }
      setTimeout(() => setImportResult(null), 3000);
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">
            コンタクト管理
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({contacts.length}件)
            </span>
          </h3>
          <div className="flex gap-2">
            <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 cursor-pointer">
              CSVインポート
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              + コンタクト追加
            </button>
          </div>
        </div>

        {importResult && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            {importResult}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前・タグで検索..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全タグ</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="p-4 border-2 border-emerald-300 rounded-xl space-y-3 mb-4">
            <h4 className="font-bold text-gray-800">新規コンタクト</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名前 *"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={lineUserId}
                onChange={(e) => setLineUserId(e.target.value)}
                placeholder="LINE ユーザーID"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="タグ（カンマ区切り: 新規, VIP, 腰痛）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!name.trim()}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300"
              >
                追加
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

        {/* CSV format hint */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            CSV形式: name, userId, tags（タグは | 区切り）
            <br />
            例: 山田太郎, Uxxxx, 新規|VIP
          </p>
        </div>

        {/* Contact list */}
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            {contacts.length === 0
              ? "コンタクトがありません"
              : "該当するコンタクトがありません"}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {c.name}
                    </p>
                    {c.lineUserId && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {c.lineUserId}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {c.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {c.lastVisit && (
                        <span className="text-xs text-gray-400">
                          最終来院: {c.lastVisit.split("T")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
