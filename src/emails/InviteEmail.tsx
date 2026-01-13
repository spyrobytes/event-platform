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

type InviteEmailProps = {
  guestName?: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  eventDescription?: string;
  hostName: string;
  rsvpUrl: string;
};

export function InviteEmail({
  guestName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventDescription,
  hostName,
  rsvpUrl,
}: InviteEmailProps) {
  const previewText = `You're invited to ${eventTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You&apos;re Invited!</Heading>

          <Section style={section}>
            <Text style={text}>
              {guestName ? `Hi ${guestName},` : "Hi there,"}
            </Text>

            <Text style={text}>
              <strong>{hostName}</strong> has invited you to an event:
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
              {eventDescription && (
                <Text style={eventDescriptionStyle}>{eventDescription}</Text>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={rsvpUrl}>
                RSVP Now
              </Button>
            </Section>

            <Text style={text}>
              Click the button above to let us know if you can make it!
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This invitation was sent via{" "}
              <Link href="https://eventsfixer.com" style={link}>
                EventsFixer
              </Link>
            </Text>
            <Text style={footerText}>
              If you didn&apos;t expect this email, you can safely ignore it.
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

const eventDescriptionStyle = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  marginTop: "16px",
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

export default InviteEmail;
