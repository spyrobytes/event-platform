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

type PasswordResetEmailProps = {
  resetUrl: string;
  expiresInHours: number;
};

export function PasswordResetEmail({
  resetUrl,
  expiresInHours,
}: PasswordResetEmailProps) {
  const previewText = "Reset your password for EventFXr";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset Your Password</Heading>

          <Section style={section}>
            <Text style={text}>
              We received a request to reset your password for your EventFXr
              account. Click the button below to choose a new password.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={text}>
              This link will expire in {expiresInHours}{" "}
              {expiresInHours === 1 ? "hour" : "hours"}.
            </Text>

            <Text style={text}>
              If you didn&apos;t request a password reset, you can safely ignore
              this email. Your password will remain unchanged.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by{" "}
              <Link href="https://eventfxr.com" style={link}>
                EventFXr
              </Link>
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

export default PasswordResetEmail;
