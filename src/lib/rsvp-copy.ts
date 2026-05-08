type RsvpResponse = "YES" | "NO" | "MAYBE";

// Phrased as "look for" rather than "with your QR code" so the message stays
// honest when the host opts out of confirmation-email QR attachment
// (Event.attachQrToConfirmation) or the QR pipeline degrades.
export function defaultRsvpSuccessMessage(response: RsvpResponse | null): string {
  if (response === "YES") {
    return "Your RSVP is confirmed. Check your inbox for the confirmation email — look for your access QR code inside, and show it at the venue when you arrive.";
  }
  return "Your RSVP has been recorded. You'll receive a confirmation email shortly.";
}
