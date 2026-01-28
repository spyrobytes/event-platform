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

type NoResponseReminderEmailProps = {
  guestName?: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  hostName: string;
  rsvpUrl: string;
  rsvpDeadline?: string;
  reminderNumber: number;
};

export function NoResponseReminderEmail({
  guestName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  hostName,
  rsvpUrl,
  rsvpDeadline,
  reminderNumber,
}: NoResponseReminderEmailProps) {
  const previewText = `Reminder: Please RSVP for ${eventTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Just a Friendly Reminder</Heading>

          <Section style={section}>
            <Text style={text}>
              {guestName ? `Hi ${guestName},` : "Hi there,"}
            </Text>

            <Text style={text}>
              We noticed you haven&apos;t responded to the invitation for{" "}
              <strong>{eventTitle}</strong> yet. We&apos;d love to know if you
              can make it!
            </Text>

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

            {rsvpDeadline && (
              <Section style={deadlineSection}>
                <Text style={deadlineText}>
                  Please respond by <strong>{rsvpDeadline}</strong>
                </Text>
              </Section>
            )}

            <Section style={buttonContainer}>
              <Button style={button} href={rsvpUrl}>
                RSVP Now
              </Button>
            </Section>

            <Text style={text}>
              Your response helps the host plan for the event. Even if you
              can&apos;t attend, please let them know!
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This is reminder #{reminderNumber} sent via{" "}
              <Link href="https://eventsfixer.com" style={link}>
                EventsFixer
              </Link>
            </Text>
            <Text style={footerText}>
              If you&apos;ve already responded or didn&apos;t expect this email,
              you can safely ignore it.
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

const eventCard = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #e5e7eb",
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

const deadlineSection = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "16px 0",
  border: "1px solid #f59e0b",
};

const deadlineText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#92400e",
  margin: "0",
  textAlign: "center" as const,
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

export default NoResponseReminderEmail;
