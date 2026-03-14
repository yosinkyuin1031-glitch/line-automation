import { NextRequest, NextResponse } from "next/server";

interface ScheduleExecRequest {
  channelAccessToken: string;
  messages: Array<{ type: string; text?: string; altText?: string; contents?: unknown }>;
  targetType: "all" | "segment" | "individual";
  targetIds?: string[];
  utageApiUrl?: string;
  utageApiKey?: string;
  templateName?: string;
}

export async function POST(req: NextRequest) {
  const body: ScheduleExecRequest = await req.json();

  if (!body.channelAccessToken) {
    return NextResponse.json({ error: "トークン未設定" }, { status: 400 });
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${body.channelAccessToken}`,
  };

  let url: string;
  let payload: Record<string, unknown>;
  let sentCount = 0;

  try {
    if (body.targetType === "all") {
      url = "https://api.line.me/v2/bot/message/broadcast";
      payload = { messages: body.messages };
    } else if (body.targetIds && body.targetIds.length > 0) {
      if (body.targetIds.length === 1) {
        url = "https://api.line.me/v2/bot/message/push";
        payload = { to: body.targetIds[0], messages: body.messages };
      } else {
        url = "https://api.line.me/v2/bot/message/multicast";
        payload = { to: body.targetIds, messages: body.messages };
      }
      sentCount = body.targetIds.length;
    } else {
      return NextResponse.json({ error: "送信先が指定されていません" }, { status: 400 });
    }

    const lineRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!lineRes.ok) {
      const err = await lineRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || `LINE API error ${lineRes.status}`, sentCount: 0 },
        { status: lineRes.status }
      );
    }

    // 宴へ送信ログを同期
    if (body.utageApiUrl && body.utageApiKey) {
      try {
        await fetch(body.utageApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${body.utageApiKey}`,
          },
          body: JSON.stringify({
            action: "line_message_sent",
            template_name: body.templateName || "スケジュール送信",
            target_type: body.targetType,
            target_count: sentCount,
            sent_at: new Date().toISOString(),
          }),
        });
      } catch {
        // 宴同期失敗はLINE送信をブロックしない
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: body.targetType === "all" ? -1 : sentCount,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "実行エラー" },
      { status: 500 }
    );
  }
}
