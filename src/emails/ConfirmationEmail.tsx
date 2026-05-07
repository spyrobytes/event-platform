import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { QR_ATTACHMENT_FILENAME } from "@/lib/qr";

type RsvpResponse = "YES" | "NO" | "MAYBE";

type ConfirmationEmailProps = {
  guestName: string;
  eventTitle: string;
  response: RsvpResponse;
  guestCount: number;
  portalUrl?: string;
  unsubscribeUrl?: string;
  logoUrl?: string;
  /** When true, render the inline QR code block. processEmail() sets this
   *  only for YES responses; the template trusts that contract. */
  qrAvailable?: boolean;
};

const RESPONSE_CONFIG: Record<
  RsvpResponse,
  {
    title: string;
    message: string;
    cardBg: string;
    cardBorder: string;
    statusColor: string;
    statusLabel: string;
  }
> = {
  YES: {
    title: "See You There!",
    message: "We're excited to have you join us!",
    cardBg: "#ecfdf5",
    cardBorder: "#10b981",
    statusColor: "#059669",
    statusLabel: "✓ Attending",
  },
  NO: {
    title: "We'll Miss You",
    message:
      "Thank you for letting us know. We understand you won't be able to make it.",
    cardBg: "#fef2f2",
    cardBorder: "#f87171",
    statusColor: "#dc2626",
    statusLabel: "✗ Not Attending",
  },
  MAYBE: {
    title: "RSVP Received",
    message:
      "We've noted your response. Take your time deciding — we'll send you a reminder closer to the event.",
    cardBg: "#fffbeb",
    cardBorder: "#fbbf24",
    statusColor: "#d97706",
    statusLabel: "? Maybe",
  },
};

export function ConfirmationEmail({
  guestName,
  eventTitle,
  response,
  guestCount,
  portalUrl,
  unsubscribeUrl,
  logoUrl,
  qrAvailable,
}: ConfirmationEmailProps) {
  const config = RESPONSE_CONFIG[response];
  const previewText =
    response === "YES"
      ? `You're confirmed for ${eventTitle}`
      : response === "NO"
        ? `Your RSVP for ${eventTitle} has been received`
        : `We've noted your response for ${eventTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Section style={logoContainer}>
              <Img
                src={logoUrl}
                alt="EventFXr"
                width="56"
                height="56"
                style={logoImage}
              />
            </Section>
          )}

          <Heading style={heading}>{config.title}</Heading>

          <Section style={section}>
            <Text style={text}>Hi {guestName},</Text>

            <Text style={text}>{config.message}</Text>

            <Section
              style={{
                ...confirmationCard,
                backgroundColor: config.cardBg,
                borderColor: config.cardBorder,
              }}
            >
              <Text style={confirmationLabel}>Your RSVP — {eventTitle}</Text>
              <Text style={{ ...confirmationResponse, color: config.statusColor }}>
                {config.statusLabel}
              </Text>
              {response === "YES" && guestCount > 1 && (
                <Text style={guestCountText}>
                  {guestCount} {guestCount === 1 ? "guest" : "guests"} total
                </Text>
              )}
            </Section>

            {qrAvailable && (
              <Section style={qrCallout}>
                <Text style={qrLabel}>Your access pass</Text>
                <Img
                  src={`cid:${QR_ATTACHMENT_FILENAME}`}
                  alt={`Access pass QR code for ${eventTitle}`}
                  width="200"
                  height="200"
                  style={qrImage}
                />
                <Text style={qrHelper}>
                  Show this QR at the venue — staff can verify your invitation at a glance.
                </Text>
              </Section>
            )}

            {portalUrl && (
              <Section style={portalSection}>
                <Link href={portalUrl} style={portalButton}>
                  {response === "NO"
                    ? "Browse Gift Registry"
                    : "View Event Details"}
                </Link>
                <Text style={portalHint}>
                  {response === "NO"
                    ? "Even though you can't attend, you can still browse the gift registry using your personal link."
                    : "Access event information, gallery, schedule, and gift registry."}
                </Text>
              </Section>
            )}

            {response === "YES" && (
              <Text style={reminderText}>
                We&apos;ll send you a reminder closer to the event date.
              </Text>
            )}

            {response === "MAYBE" && (
              <Text style={reminderText}>
                We&apos;ll follow up with a reminder so you can confirm when
                you&apos;re ready.
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This confirmation was sent via{" "}
              <Link href="https://eventfxr.com" style={link}>
                EventFXr
              </Link>
            </Text>
            <Text style={footerText}>
              {response === "NO"
                ? "Changed your mind? Contact the event organizer to update your response."
                : "If you need to change your response, please contact the event organizer."}
            </Text>
            {unsubscribeUrl && (
              <Text style={footerText}>
                <Link href={unsubscribeUrl} style={link}>
                  Unsubscribe
                </Link>{" "}
                from future emails about this event.
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const logoContainer = {
  padding: "0 48px 8px 48px",
  textAlign: "center" as const,
};

const logoImage = {
  display: "block",
  margin: "0 auto",
};

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#1a1a1a",
  padding: "0 48px",
};

const section = {
  padding: "0 48px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#484848",
};

const confirmationCard = {
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  borderWidth: "1px",
  borderStyle: "solid" as const,
  textAlign: "center" as const,
};

const confirmationLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const confirmationResponse = {
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
};

const guestCountText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "8px 0 0 0",
};

const portalSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const portalButton = {
  display: "inline-block",
  backgroundColor: "#7c3aed",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
};

const portalHint = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "8px 0 0 0",
};

const reminderText = {
  fontSize: "14px",
  color: "#6b7280",
  fontStyle: "italic" as const,
};

const qrCallout = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0 0 0",
  textAlign: "center" as const,
};

const qrLabel = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#7c3aed",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 12px 0",
};

const qrImage = {
  display: "block",
  margin: "0 auto",
  borderRadius: "4px",
  maxWidth: "100%",
  height: "auto",
};

const qrHelper = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#525252",
  margin: "12px 0 0 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  padding: "0 48px",
};

const footerText = {
  fontSize: "12px",
  lineHeight: "16px",
  color: "#8898aa",
  margin: "4px 0",
};

const link = {
  color: "#7c3aed",
  textDecoration: "underline",
};

export default ConfirmationEmail;
