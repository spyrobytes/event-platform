import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { updateEmailStatus } from "@/lib/email";

const MAILGUN_WEBHOOK_SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
const FRESHNESS_WINDOW_SECONDS = 15 * 60;

type MailgunWebhookPayload = {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  "event-data": {
    event: string;
    timestamp: number;
    id?: string;
    message: {
      headers: {
        "message-id": string;
      };
    };
    recipient?: string;
    "delivery-status"?: {
      code?: number;
      message?: string;
      description?: string;
    };
    severity?: string;
    reason?: string;
  };
};

function verifySignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  if (!MAILGUN_WEBHOOK_SIGNING_KEY) {
    console.warn("MAILGUN_WEBHOOK_SIGNING_KEY not set, skipping verification");
    return true;
  }

  const encodedToken = crypto
    .createHmac("sha256", MAILGUN_WEBHOOK_SIGNING_KEY)
    .update(timestamp.concat(token))
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(encodedToken),
    Buffer.from(signature)
  );
}

function isTimestampFresh(timestamp: string): boolean {
  const webhookTime = Number(timestamp);
  if (Number.isNaN(webhookTime)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - webhookTime);
  return age <= FRESHNESS_WINDOW_SECONDS;
}

type MappedStatus = "DELIVERED" | "OPENED" | "FAILED" | "BOUNCED";

function mapEventToStatus(event: string): MappedStatus | null {
  switch (event) {
    case "delivered":
      return "DELIVERED";
    case "opened":
      return "OPENED";
    case "failed":
    case "rejected":
      return "FAILED";
    case "bounced":
    case "complained":
      return "BOUNCED";
    default:
      return null;
  }
}

function extractErrorDetail(eventData: MailgunWebhookPayload["event-data"]): string | null {
  const ds = eventData["delivery-status"];
  if (!ds) return null;
  const parts = [
    ds.code && `code=${ds.code}`,
    ds.message,
    ds.description,
    eventData.severity && `severity=${eventData.severity}`,
    eventData.reason && `reason=${eventData.reason}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : null;
}

export async function POST(request: NextRequest) {
  try {
    const payload: MailgunWebhookPayload = await request.json();

    const { timestamp, token, signature } = payload.signature;
    if (!verifySignature(timestamp, token, signature)) {
      console.error("Invalid Mailgun webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    if (!isTimestampFresh(timestamp)) {
      console.warn(`Mailgun webhook rejected: stale timestamp ${timestamp}`);
      return NextResponse.json(
        { error: "Stale timestamp" },
        { status: 400 }
      );
    }

    const eventData = payload["event-data"];
    const event = eventData.event;
    const messageId = eventData.message?.headers?.["message-id"];
    const cleanMessageId = messageId
      ? messageId.replace(/^<|>$/g, "")
      : null;
    const eventTimestamp = new Date(eventData.timestamp * 1000);

    await db.emailEvent.create({
      data: {
        providerMessageId: cleanMessageId,
        eventType: event,
        recipientEmail: eventData.recipient ?? null,
        payload: payload as unknown as Prisma.InputJsonValue,
        occurredAt: eventTimestamp,
      },
    });

    if (!cleanMessageId) {
      console.warn("Webhook received without message-id, logged to email_events");
      return NextResponse.json({ status: "logged" });
    }

    const status = mapEventToStatus(event);
    if (!status) {
      return NextResponse.json({ status: "logged", event });
    }

    const errorDetail =
      status === "FAILED" || status === "BOUNCED"
        ? extractErrorDetail(eventData)
        : null;

    await updateEmailStatus(cleanMessageId, status, eventTimestamp, errorDetail);

    console.log(`Mailgun webhook: ${event} for ${cleanMessageId}`);
    return NextResponse.json({ status: "processed", event });
  } catch (error) {
    console.error("Mailgun webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
