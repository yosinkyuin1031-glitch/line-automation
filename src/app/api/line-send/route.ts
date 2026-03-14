import { NextRequest, NextResponse } from "next/server";

interface SendRequest {
  channelAccessToken: string;
  type: "broadcast" | "multicast" | "push";
  to?: string | string[];
  messages: Array<{
    type: string;
    text?: string;
    altText?: string;
    contents?: unknown;
  }>;
}

export async function POST(req: NextRequest) {
  const body: SendRequest = await req.json();

  if (!body.channelAccessToken) {
    return NextResponse.json({ error: "チャネルアクセストークンが設定されていません" }, { status: 400 });
  }

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${body.channelAccessToken}`,
  };

  let url: string;
  let payload: Record<string, unknown>;

  switch (body.type) {
    case "broadcast":
      url = "https://api.line.me/v2/bot/message/broadcast";
      payload = { messages: body.messages };
      break;
    case "multicast":
      url = "https://api.line.me/v2/bot/message/multicast";
      payload = { to: body.to, messages: body.messages };
      break;
    case "push":
      url = "https://api.line.me/v2/bot/message/push";
      payload = { to: body.to, messages: body.messages };
      break;
    default:
      return NextResponse.json({ error: "不正な送信タイプ" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || `LINE API error ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "送信エラー" },
      { status: 500 }
    );
  }
}

// 接続テスト（Bot情報取得）
export async function PUT(req: NextRequest) {
  const { channelAccessToken } = await req.json();

  try {
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `接続失敗 (${res.status})` }, { status: res.status });
    }
    const bot = await res.json();
    return NextResponse.json({
      success: true,
      botName: bot.displayName,
      basicId: bot.basicId,
      premiumId: bot.premiumId,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "接続エラー" }, { status: 500 });
  }
}
