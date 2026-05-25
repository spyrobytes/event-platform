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

type GalleryPublishedEmailProps = {
  guestName: string;
  eventTitle: string;
  hostName: string;
  /** Absolute URL to /e/[slug]/gallery (token appended by the queueing code
   *  when the invite has one). */
  galleryUrl: string;
  /** Optional cover image URL. When present, rendered at the top of the
   *  card; falls back to a text-only header otherwise. */
  coverUrl?: string;
  /** Optional photo count for the body copy ("23 photos are ready"). */
  photoCount?: number;
  unsubscribeUrl?: string;
};

export function GalleryPublishedEmail({
  guestName,
  eventTitle,
  hostName,
  galleryUrl,
  coverUrl,
  photoCount,
  unsubscribeUrl,
}: GalleryPublishedEmailProps) {
  const previewText = `Photos from ${eventTitle} are ready to view`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={heroSection}>
            {coverUrl && (
              <Img
                src={coverUrl}
                alt=""
                width="600"
                height="320"
                style={coverImg}
              />
            )}
            <Heading style={heading}>The photos are here</Heading>
            <Text style={subheading}>
              {hostName} just published the gallery from {eventTitle}.
            </Text>
          </Section>

          <Section style={section}>
            <Text style={text}>Hi {guestName},</Text>
            <Text style={text}>
              {photoCount !== undefined && photoCount > 0
                ? `${photoCount} ${photoCount === 1 ? "photo" : "photos"} from `
                : "Photos from "}
              <strong>{eventTitle}</strong> are ready to view. Thanks for
              celebrating with us.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={galleryUrl}>
                View the gallery
              </Button>
            </Section>

            <Text style={fallbackUrl}>
              Or paste this into your browser:{" "}
              <Link href={galleryUrl} style={link}>
                {galleryUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Sent via{" "}
              <Link href="https://eventfxr.com" style={link}>
                EventFXr
              </Link>
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

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const heroSection = {
  padding: "0 0 24px",
};

const coverImg = {
  display: "block",
  width: "100%",
  height: "auto",
  maxHeight: "320px",
  objectFit: "cover" as const,
  marginBottom: "24px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#1a1a1a",
  padding: "0 48px",
  margin: "0",
};

const subheading = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#6b7280",
  padding: "8px 48px 0",
  margin: "0",
};

const section = {
  padding: "0 48px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#484848",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const fallbackUrl = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#8898aa",
  textAlign: "center" as const,
  wordBreak: "break-all" as const,
  margin: "16px 0 0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 48px 20px",
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
  color: "#1a1a1a",
  textDecoration: "underline",
};

export default GalleryPublishedEmail;
