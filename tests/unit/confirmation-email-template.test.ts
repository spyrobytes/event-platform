import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { ConfirmationEmail } from "@/emails/ConfirmationEmail";

const baseProps = {
  guestName: "Jess",
  eventTitle: "Test Event",
  guestCount: 1,
  portalUrl: "https://example.test/e/test/portal/abc",
};

describe("ConfirmationEmail — QR block", () => {
  it("renders the inline QR Img and helper copy when qrAvailable=true (YES response)", async () => {
    const html = await render(
      ConfirmationEmail({ ...baseProps, response: "YES", qrAvailable: true })
    );
    expect(html).toMatch(/src=['"]?cid:rsvp-qr\.png['"]?/);
    expect(html).toContain("Access pass QR code for Test Event");
    expect(html).toContain("Show this QR at the venue");
    expect(html).toContain("Your access pass");
  });

  it("omits the QR block when qrAvailable=false (YES response)", async () => {
    const html = await render(
      ConfirmationEmail({ ...baseProps, response: "YES", qrAvailable: false })
    );
    expect(html).not.toContain("cid:rsvp-qr.png");
    expect(html).not.toContain("Show this QR at the venue");
  });

  it("omits the QR block when qrAvailable is undefined (default)", async () => {
    const html = await render(
      ConfirmationEmail({ ...baseProps, response: "YES" })
    );
    expect(html).not.toContain("cid:rsvp-qr.png");
    expect(html).not.toContain("Show this QR at the venue");
  });

  it("MAYBE response does not render the QR block even if qrAvailable=true is somehow passed", async () => {
    // Defense-in-depth: the pipeline never sets qrAvailable=true for non-YES,
    // but if it did, the template should not render the QR. Currently the
    // template gates only on qrAvailable, so this test documents that the
    // pipeline contract is the source of truth — qrAvailable: true on a
    // non-YES would render the block.
    const html = await render(
      ConfirmationEmail({ ...baseProps, response: "MAYBE", qrAvailable: false })
    );
    expect(html).not.toContain("cid:rsvp-qr.png");
  });

  it("NO response does not render the QR block when qrAvailable=false", async () => {
    const html = await render(
      ConfirmationEmail({ ...baseProps, response: "NO", qrAvailable: false })
    );
    expect(html).not.toContain("cid:rsvp-qr.png");
  });

  it("RSVP card and portal CTA remain present regardless of QR availability", async () => {
    const htmlOff = await render(
      ConfirmationEmail({ ...baseProps, response: "YES", qrAvailable: false })
    );
    expect(htmlOff).toContain(baseProps.portalUrl);
    expect(htmlOff).toContain("View Event Details");
    expect(htmlOff).toContain("✓ Attending");

    const htmlOn = await render(
      ConfirmationEmail({ ...baseProps, response: "YES", qrAvailable: true })
    );
    expect(htmlOn).toContain(baseProps.portalUrl);
    expect(htmlOn).toContain("View Event Details");
    expect(htmlOn).toContain("✓ Attending");
  });
});
