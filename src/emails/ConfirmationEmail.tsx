import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type RsvpResponse = "YES" | "NO" | "MAYBE";

type ConfirmationEmailProps = {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  response: RsvpResponse;
  guestCount: number;
  hostName: string;
  portalUrl?: string;
  unsubscribeUrl?: string;
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
  eventDate,
  eventTime,
  eventLocation,
  response,
  guestCount,
  hostName,
  portalUrl,
  unsubscribeUrl,
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
              <Text style={confirmationLabel}>Your RSVP</Text>
              <Text style={{ ...confirmationResponse, color: config.statusColor }}>
                {config.statusLabel}
              </Text>
              {response === "YES" && guestCount > 1 && (
                <Text style={guestCountText}>
                  {guestCount} {guestCount === 1 ? "guest" : "guests"} total
                </Text>
              )}
            </Section>

            {response !== "NO" && (
              <Section style={eventCard}>
                <Heading as="h2" style={eventTitleStyle}>
                  {eventTitle}
                </Heading>

                <Text style={eventDetail}>
                  <strong>Date:</strong> {eventDate}
                </Text>
                <Text style={eventDetail}>
                  <strong>Time:</strong> {eventTime}
                </Text>
                {eventLocation && (
                  <Text style={eventDetail}>
                    <strong>Location:</strong> {eventLocation}
                  </Text>
                )}
                <Text style={eventDetail}>
                  <strong>Hosted by:</strong> {hostName}
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
              <Link href="https://eventsfixer.com" style={link}>
                EventsFixer
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

const eventCard = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #e5e7eb",
};

const eventTitleStyle = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 16px 0",
};

const eventDetail = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#484848",
  margin: "4px 0",
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
