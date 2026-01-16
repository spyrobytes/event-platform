import {
  Body,
  Button,
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

type ReminderEmailProps = {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  hostName: string;
  eventUrl: string;
  guestCount: number;
};

export function ReminderEmail({
  guestName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  hostName,
  eventUrl,
  guestCount,
}: ReminderEmailProps) {
  const previewText = `Reminder: ${eventTitle} is tomorrow!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Event Reminder</Heading>

          <Section style={section}>
            <Text style={text}>Hi {guestName},</Text>

            <Text style={text}>
              This is a friendly reminder that <strong>{eventTitle}</strong> is
              happening tomorrow! We&apos;re looking forward to seeing you
              there.
            </Text>

            <Section style={reminderCard}>
              <Text style={reminderLabel}>Tomorrow</Text>
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
              {guestCount > 1 && (
                <Text style={guestCountText}>
                  Your party: {guestCount}{" "}
                  {guestCount === 1 ? "guest" : "guests"}
                </Text>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={eventUrl}>
                View Event Details
              </Button>
            </Section>

            <Section style={tipSection}>
              <Text style={tipTitle}>Quick Tips</Text>
              <Text style={tipText}>
                • Check the weather and dress accordingly
              </Text>
              <Text style={tipText}>
                • Plan your travel route in advance
              </Text>
              <Text style={tipText}>
                • Add the event to your calendar if you haven&apos;t already
              </Text>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This reminder was sent via{" "}
              <Link href="https://eventsfixer.com" style={link}>
                EventsFixer
              </Link>
            </Text>
            <Text style={footerText}>
              If you can no longer attend, please contact the event organizer.
            </Text>
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

const reminderCard = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #f59e0b",
};

const reminderLabel = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#92400e",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const eventTitleStyle = {
  fontSize: "24px",
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

const guestCountText = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: "12px",
  paddingTop: "12px",
  borderTop: "1px solid #e5e7eb",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#7c3aed",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const tipSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0",
};

const tipTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 8px 0",
};

const tipText = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "2px 0",
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

export default ReminderEmail;
