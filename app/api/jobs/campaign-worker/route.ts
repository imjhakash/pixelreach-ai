import { NextRequest, NextResponse } from "next/server";

function verifyCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
}

async function runJob(baseUrl: string, path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  return {
    path,
    ok: res.ok,
    status: res.status,
    body,
  };
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = getBaseUrl(req);

  const generate = await runJob(baseUrl, "/api/jobs/generate-emails");
  const send = await runJob(baseUrl, "/api/jobs/process-send-queue");
  const followUps = await runJob(baseUrl, "/api/jobs/process-followups");

  return NextResponse.json({
    ok: generate.ok && send.ok && followUps.ok,
    generated: generate.body.generated ?? 0,
    sent: send.body.sent ?? 0,
    scheduledFollowUps: followUps.body.scheduled ?? 0,
    jobs: [generate, send, followUps],
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
