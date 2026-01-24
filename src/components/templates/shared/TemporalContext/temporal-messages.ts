/**
 * Temporal Messaging System
 *
 * Generates contextual messages based on event phase and timing.
 * Follows the editorial-first philosophy with crafted, warm messaging.
 */

import type { EventPhase } from "@/hooks/use-event-temporal";

/**
 * Message category for different contexts
 */
export type MessageCategory =
  | "hero" // Hero section headlines
  | "rsvp" // RSVP section messaging
  | "gallery" // Gallery section context
  | "cta" // Call-to-action buttons
  | "countdown" // Countdown labels
  | "celebration"; // Generic celebration messaging

/**
 * Event type for message customization
 */
export type EventType = "wedding" | "conference" | "party" | "general";

/**
 * Message context for generation
 */
type MessageContext = {
  phase: EventPhase;
  daysUntil: number;
  daysSinceEnded: number;
  coupleName?: string; // For weddings: "Sarah & Michael"
  eventName?: string; // General event name
  hostName?: string; // Host name
};

/**
 * Wedding-specific messages by phase
 */
const WEDDING_MESSAGES: Record<EventPhase, Record<MessageCategory, string[]>> = {
  upcoming: {
    hero: [
      "We Can't Wait to Celebrate",
      "Save the Date",
      "Join Us for Our Special Day",
    ],
    rsvp: [
      "Will You Be There?",
      "We'd Love to See You",
      "Please Let Us Know",
    ],
    gallery: [
      "Our Journey Together",
      "Moments We've Shared",
    ],
    cta: [
      "RSVP Now",
      "Reserve Your Spot",
      "Confirm Attendance",
    ],
    countdown: [
      "Until We Say I Do",
      "Until the Big Day",
      "Days to Go",
    ],
    celebration: [
      "Love is in the air",
      "Two hearts, one love",
    ],
  },
  imminent: {
    hero: [
      "It's Almost Time!",
      "The Day Is Approaching",
      "Just a Few Days Away",
    ],
    rsvp: [
      "Last Chance to RSVP",
      "Please RSVP Soon",
      "We Need to Hear from You",
    ],
    gallery: [
      "The Adventure Awaits",
      "Soon to Be Memories",
    ],
    cta: [
      "RSVP Today",
      "Respond Now",
      "Don't Miss Out",
    ],
    countdown: [
      "Until I Do",
      "And Counting",
      "Left to Wait",
    ],
    celebration: [
      "The excitement is building",
      "Love is on the horizon",
    ],
  },
  today: {
    hero: [
      "Today's the Day!",
      "It's Happening!",
      "The Wait Is Over",
    ],
    rsvp: [
      "See You There!",
      "We're So Excited",
    ],
    gallery: [
      "Making Memories Today",
      "A Day to Remember",
    ],
    cta: [
      "View Details",
      "Get Directions",
    ],
    countdown: [
      "Today!",
      "The moment is here",
    ],
    celebration: [
      "Love conquers all",
      "Today we celebrate",
    ],
  },
  ongoing: {
    hero: [
      "Happening Now",
      "Celebrating Love",
      "Together at Last",
    ],
    rsvp: [
      "The Celebration Is Underway",
    ],
    gallery: [
      "Live Moments",
      "As It Happens",
    ],
    cta: [
      "View Schedule",
      "See the Timeline",
    ],
    countdown: [
      "Happening Now",
    ],
    celebration: [
      "Love in action",
      "Celebrating together",
    ],
  },
  ended: {
    hero: [
      "Thank You for Celebrating with Us",
      "What a Beautiful Day",
      "Forever Grateful",
    ],
    rsvp: [
      "Thank You for Joining Us",
      "We're So Glad You Came",
    ],
    gallery: [
      "Relive the Memories",
      "Our Wedding Day",
      "Captured Moments",
    ],
    cta: [
      "View Photos",
      "See the Gallery",
      "Relive the Day",
    ],
    countdown: [
      "Happily Ever After",
    ],
    celebration: [
      "And they lived happily ever after",
      "Love wins",
    ],
  },
  unknown: {
    hero: ["Celebrating Love"],
    rsvp: ["Join the Celebration"],
    gallery: ["Our Gallery"],
    cta: ["Learn More"],
    countdown: [],
    celebration: ["Celebrating together"],
  },
};

/**
 * Conference-specific messages by phase
 */
const CONFERENCE_MESSAGES: Record<EventPhase, Record<MessageCategory, string[]>> = {
  upcoming: {
    hero: ["Join Us", "Be Part of Something Great"],
    rsvp: ["Register Today", "Secure Your Spot"],
    gallery: ["Past Highlights", "Previous Events"],
    cta: ["Register Now", "Get Tickets"],
    countdown: ["Until the Event", "Days Until"],
    celebration: ["Connecting minds", "Building the future"],
  },
  imminent: {
    hero: ["Almost Here!", "Final Days to Register"],
    rsvp: ["Last Chance to Register", "Limited Spots"],
    gallery: ["Get Ready", "What to Expect"],
    cta: ["Register Today", "Don't Miss Out"],
    countdown: ["Days Left", "Register Now"],
    celebration: ["Excitement building", "See you soon"],
  },
  today: {
    hero: ["It's Here!", "Welcome"],
    rsvp: ["Check In", "We're Ready for You"],
    gallery: ["Live Updates"],
    cta: ["View Schedule", "Check In"],
    countdown: ["Today!"],
    celebration: ["Let's begin", "Welcome aboard"],
  },
  ongoing: {
    hero: ["Live Now", "In Session"],
    rsvp: ["Join the Session"],
    gallery: ["Live Feed"],
    cta: ["View Sessions", "Join Now"],
    countdown: ["Happening Now"],
    celebration: ["Learning together", "In progress"],
  },
  ended: {
    hero: ["Thank You for Attending", "See You Next Time"],
    rsvp: ["Thanks for Joining", "Stay Connected"],
    gallery: ["Event Recap", "Highlights"],
    cta: ["View Recordings", "See Photos"],
    countdown: ["Until Next Time"],
    celebration: ["Thank you", "See you next year"],
  },
  unknown: {
    hero: ["Welcome"],
    rsvp: ["Register"],
    gallery: ["Gallery"],
    cta: ["Learn More"],
    countdown: [],
    celebration: ["Welcome"],
  },
};

/**
 * Party-specific messages by phase
 */
const PARTY_MESSAGES: Record<EventPhase, Record<MessageCategory, string[]>> = {
  upcoming: {
    hero: ["Let's Party!", "You're Invited"],
    rsvp: ["Are You In?", "Join the Fun"],
    gallery: ["Get Ready to Party"],
    cta: ["RSVP Now", "Count Me In"],
    countdown: ["Until Party Time", "Days to Party"],
    celebration: ["It's going to be epic", "Get excited"],
  },
  imminent: {
    hero: ["It's Almost Party Time!", "Get Ready"],
    rsvp: ["Last Chance!", "RSVP ASAP"],
    gallery: ["The Countdown Is On"],
    cta: ["RSVP Today", "Don't Miss It"],
    countdown: ["To Party Time", "And Counting"],
    celebration: ["So close", "Almost time"],
  },
  today: {
    hero: ["Party Time!", "Let's Celebrate!"],
    rsvp: ["See You Tonight!"],
    gallery: ["Party Pics Coming Soon"],
    cta: ["Get Directions", "See Details"],
    countdown: ["Tonight!"],
    celebration: ["Let's go!", "Party time"],
  },
  ongoing: {
    hero: ["Party in Progress!", "Having a Blast"],
    rsvp: ["The Party's On!"],
    gallery: ["Live Party Pics"],
    cta: ["See the Party"],
    countdown: ["Happening Now"],
    celebration: ["Best. Party. Ever.", "Living it up"],
  },
  ended: {
    hero: ["What a Night!", "Thanks for Coming"],
    rsvp: ["Hope You Had Fun!"],
    gallery: ["Party Pics", "Best Moments"],
    cta: ["See the Photos", "Relive the Fun"],
    countdown: ["Until Next Time"],
    celebration: ["That was awesome", "Great memories"],
  },
  unknown: {
    hero: ["Party Time"],
    rsvp: ["Join Us"],
    gallery: ["Photos"],
    cta: ["Learn More"],
    countdown: [],
    celebration: ["Let's party"],
  },
};

/**
 * Get messages for an event type
 */
function getMessagesForEventType(
  eventType: EventType
): Record<EventPhase, Record<MessageCategory, string[]>> {
  switch (eventType) {
    case "wedding":
      return WEDDING_MESSAGES;
    case "conference":
      return CONFERENCE_MESSAGES;
    case "party":
      return PARTY_MESSAGES;
    default:
      return WEDDING_MESSAGES; // Default to wedding as it's most comprehensive
  }
}

/**
 * Get a random message from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a message for a specific context
 */
export function getTemporalMessage(
  eventType: EventType,
  phase: EventPhase,
  category: MessageCategory,
  options?: { random?: boolean }
): string {
  const messages = getMessagesForEventType(eventType);
  const phaseMessages = messages[phase]?.[category] || messages.unknown[category];

  if (!phaseMessages || phaseMessages.length === 0) {
    return "";
  }

  return options?.random ? pickRandom(phaseMessages) : phaseMessages[0];
}

/**
 * Get all messages for a phase and category
 */
export function getAllTemporalMessages(
  eventType: EventType,
  phase: EventPhase,
  category: MessageCategory
): string[] {
  const messages = getMessagesForEventType(eventType);
  return messages[phase]?.[category] || messages.unknown[category] || [];
}

/**
 * Generate a personalized message with name substitution
 */
export function getPersonalizedMessage(
  eventType: EventType,
  phase: EventPhase,
  category: MessageCategory,
  context: MessageContext
): string {
  let message = getTemporalMessage(eventType, phase, category);

  // Substitute placeholders if context provides names
  if (context.coupleName) {
    message = message.replace(/\{couple\}/g, context.coupleName);
  }
  if (context.eventName) {
    message = message.replace(/\{event\}/g, context.eventName);
  }
  if (context.hostName) {
    message = message.replace(/\{host\}/g, context.hostName);
  }

  return message;
}

/**
 * Get CTA text based on phase
 */
export function getTemporalCTA(
  eventType: EventType,
  phase: EventPhase,
  ctaType: "rsvp" | "gallery" | "schedule" | "general" = "general"
): string {
  // Map CTA types to appropriate messages
  if (ctaType === "rsvp") {
    switch (phase) {
      case "upcoming":
        return eventType === "wedding" ? "RSVP Now" : "Register";
      case "imminent":
        return "RSVP Today";
      case "today":
      case "ongoing":
        return "View Details";
      case "ended":
        return "Thank You";
      default:
        return "RSVP";
    }
  }

  if (ctaType === "gallery") {
    switch (phase) {
      case "ended":
        return "View Photos";
      default:
        return "See Gallery";
    }
  }

  return getTemporalMessage(eventType, phase, "cta");
}
