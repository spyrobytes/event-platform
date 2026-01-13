import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { updateEmailStatus } from "@/lib/email";
import type { EmailStatus } from "@prisma/client";

const MAILGUN_WEBHOOK_SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

type MailgunWebhookPayload = {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  "event-data": {
    event: string;
    timestamp: number;
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
  };
};

/**
 * Verify Mailgun webhook signature
 */
function verifySignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  if (!MAILGUN_WEBHOOK_SIGNING_KEY) {
    console.warn("MAILGUN_WEBHOOK_SIGNING_KEY not set, skipping verification");
    return true; // Allow in development
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

/**
 * Map Mailgun event to our EmailStatus
 */
function mapEventToStatus(event: string): EmailStatus | null {
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

/**
 * POST /api/webhooks/mailgun
 * Handle Mailgun webhook events for email delivery status
 */
export async function POST(request: NextRequest) {
  try {
    const payload: MailgunWebhookPayload = await request.json();

    // Verify signature
    const { timestamp, token, signature } = payload.signature;
    if (!verifySignature(timestamp, token, signature)) {
      console.error("Invalid Mailgun webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const eventData = payload["event-data"];
    const event = eventData.event;
    const messageId = eventData.message?.headers?.["message-id"];

    if (!messageId) {
      console.warn("Webhook received without message-id");
      return NextResponse.json({ status: "ignored" });
    }

    // Clean message ID (Mailgun includes angle brackets)
    const cleanMessageId = messageId.replace(/^<|>$/g, "");

    // Map event to our status
    const status = mapEventToStatus(event);
    if (!status) {
      // Event we don't track, acknowledge but don't process
      return NextResponse.json({ status: "ignored", event });
    }

    // Update email status
    const eventTimestamp = new Date(eventData.timestamp * 1000);
    await updateEmailStatus(cleanMessageId, status, eventTimestamp);

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

/**
 * HEAD /api/webhooks/mailgun
 * Mailgun uses HEAD requests to verify webhook endpoint
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
