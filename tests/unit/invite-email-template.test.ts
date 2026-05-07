import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { InviteEmail } from "@/emails/InviteEmail";

const baseProps = {
  eventTitle: "Test Event",
  eventDate: "Saturday, Jan 1",
  eventTime: "6:00 PM",
  hostName: "Host",
  rsvpUrl: "https://example.test/rsvp/tok",
};

describe("InviteEmail — QR block", () => {
  it("renders the inline QR Img and helper copy when qrAvailable is true", async () => {
    const html = await render(InviteEmail({ ...baseProps, qrAvailable: true }));
    expect(html).toMatch(/src=['"]?cid:rsvp-qr\.png['"]?/);
    expect(html).toContain("Access pass QR code for Test Event");
    expect(html).toContain("Show this QR at the venue");
    expect(html).toContain("Your access pass");
  });

  it("omits the QR block when qrAvailable is false", async () => {
    const html = await render(InviteEmail({ ...baseProps, qrAvailable: false }));
    expect(html).not.toContain("cid:rsvp-qr.png");
    expect(html).not.toContain("Show this QR at the venue");
  });

  it("omits the QR block when qrAvailable is undefined (default)", async () => {
    const html = await render(InviteEmail({ ...baseProps }));
    expect(html).not.toContain("cid:rsvp-qr.png");
    expect(html).not.toContain("Show this QR at the venue");
  });

  it("RSVP CTA and link remain present regardless of QR availability", async () => {
    const htmlOff = await render(InviteEmail({ ...baseProps, qrAvailable: false }));
    expect(htmlOff).toContain(baseProps.rsvpUrl);
    expect(htmlOff).toContain("RSVP Now");

    const htmlOn = await render(InviteEmail({ ...baseProps, qrAvailable: true }));
    expect(htmlOn).toContain(baseProps.rsvpUrl);
    expect(htmlOn).toContain("RSVP Now");
  });
});
