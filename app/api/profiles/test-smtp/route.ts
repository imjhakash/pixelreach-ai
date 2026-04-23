import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, from_email } = await req.json();

  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port),
      secure: Number(smtp_port) === 465,
      auth: { user: smtp_user, pass: smtp_pass },
    });

    await transporter.verify();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connection failed" },
      { status: 400 }
    );
  }
}
