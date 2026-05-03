import {
  Body,
  Button,
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

type InviteEmailProps = {
  guestName?: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  eventDescription?: string;
  hostName: string;
  rsvpUrl: string;
  unsubscribeUrl?: string;
  logoUrl?: string;
  rsvpDeadline?: string;
  ceremonyDate?: string;
  ceremonyTime?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionDate?: string;
  receptionTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  /** Public-portal RSVP code. Rendered as an alternative entry point along
   *  with `publicRsvpUrl` — both must be present to show the code block. */
  rsvpCode?: string;
  publicRsvpUrl?: string;
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
  unsubscribeUrl,
  logoUrl,
  rsvpDeadline,
  ceremonyDate,
  ceremonyTime,
  ceremonyVenue,
  ceremonyAddress,
  receptionDate,
  receptionTime,
  receptionVenue,
  receptionAddress,
  rsvpCode,
  publicRsvpUrl,
}: InviteEmailProps) {
  const showCodeBlock = !!(rsvpCode && publicRsvpUrl);
  const previewText = `You're invited to ${eventTitle}`;
  const hasCeremony = !!(ceremonyDate || ceremonyTime || ceremonyVenue);
  const hasReception = !!(receptionDate || receptionTime || receptionVenue);
  const hasWeddingEvents = hasCeremony || hasReception;

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

              {hasWeddingEvents ? (
                <>
                  {hasCeremony && (
                    <Section style={subEventBlock}>
                      <Text style={subEventHeading}>Ceremony</Text>
                      {ceremonyDate && (
                        <Text style={eventDetail}>
                          <strong>Date:</strong> {ceremonyDate}
                        </Text>
                      )}
                      {ceremonyTime && (
                        <Text style={eventDetail}>
                          <strong>Time:</strong> {ceremonyTime}
                        </Text>
                      )}
                      {ceremonyVenue && (
                        <Text style={eventDetail}>
                          <strong>Venue:</strong> {ceremonyVenue}
                        </Text>
                      )}
                      {ceremonyAddress && (
                        <Text style={eventDetail}>
                          <strong>Address:</strong> {ceremonyAddress}
                        </Text>
                      )}
                    </Section>
                  )}
                  {hasReception && (
                    <Section style={subEventBlock}>
                      <Text style={subEventHeading}>Reception</Text>
                      {receptionDate && (
                        <Text style={eventDetail}>
                          <strong>Date:</strong> {receptionDate}
                        </Text>
                      )}
                      {receptionTime && (
                        <Text style={eventDetail}>
                          <strong>Time:</strong> {receptionTime}
                        </Text>
                      )}
                      {receptionVenue && (
                        <Text style={eventDetail}>
                          <strong>Venue:</strong> {receptionVenue}
                        </Text>
                      )}
                      {receptionAddress && (
                        <Text style={eventDetail}>
                          <strong>Address:</strong> {receptionAddress}
                        </Text>
                      )}
                    </Section>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}

              {eventDescription && (
                <Text style={eventDescriptionStyle}>{eventDescription}</Text>
              )}
            </Section>

            {rsvpDeadline && (
              <Section style={deadlineCallout}>
                <Text style={deadlineLabel}>Please respond by</Text>
                <Text style={deadlineValue}>{rsvpDeadline}</Text>
              </Section>
            )}

            <Section style={buttonContainer}>
              <Button style={button} href={rsvpUrl}>
                RSVP Now
              </Button>
            </Section>

            <Text style={text}>
              Click the button above to let us know if you can make it!
            </Text>

            {showCodeBlock && (
              <Section style={codeBlock}>
                <Text style={codeBlockIntro}>
                  Or visit{" "}
                  <Link href={publicRsvpUrl} style={link}>
                    {publicRsvpUrl}
                  </Link>{" "}
                  and enter your invitation code:
                </Text>
                <Text style={codeValue}>{rsvpCode}</Text>
              </Section>
            )}

            <Text style={keepLinkNote}>
              <strong>Keep this email.</strong>{" "}
              {showCodeBlock
                ? "Both the link above and the code below are personal to you — either one lets you RSVP, claim gifts from the registry, and revisit the event page."
                : "The link above is personal to you — it's how you RSVP, claim gifts from the registry, and revisit the event page."}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This invitation was sent via{" "}
              <Link href="https://eventfxr.com" style={link}>
                EventFXr
              </Link>
            </Text>
            <Text style={footerText}>
              If you didn&apos;t expect this email, you can safely ignore it.
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

const deadlineCallout = {
  backgroundColor: "#f5f3ff",
  border: "1px solid #ddd6fe",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0 0 0",
  textAlign: "center" as const,
};

const deadlineLabel = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#7c3aed",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 4px 0",
};

const deadlineValue = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0",
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

const keepLinkNote = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#525252",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "16px 0 0 0",
};

const codeBlock = {
  backgroundColor: "#f5f3ff",
  border: "1px solid #ddd6fe",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0 0 0",
  textAlign: "center" as const,
};

const codeBlockIntro = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#525252",
  margin: "0 0 12px 0",
};

const codeValue = {
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: "20px",
  fontWeight: "700",
  letterSpacing: "0.06em",
  color: "#1a1a1a",
  margin: "0",
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

const subEventBlock = {
  margin: "0 0 16px 0",
  padding: "0 0 12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const subEventHeading = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#7c3aed",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 6px 0",
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
