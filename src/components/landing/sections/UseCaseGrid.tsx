import Image from "next/image";
import { Section } from "../ui/Section";
import { RevealOnScroll } from "../ui/RevealOnScroll";
import styles from "./UseCaseGrid.module.css";

type UseCase = {
  title: string;
  blurb: string;
  capabilities: string[];
  image: {
    src: string;
    alt: string;
    /** intrinsic capture dimensions — drives the frame's aspect ratio */
    width: number;
    height: number;
    /** tall phone captures get a narrower frame */
    variant: "phone" | "wide";
  };
};

/**
 * Every capability named here is shipped — screenshots are real renders
 * (template previews and the live discovery page), consistent with the
 * showcase section's "no mockups" promise.
 */
const useCases: UseCase[] = [
  {
    title: "Weddings & celebrations",
    blurb:
      "The invitation rollout wedding organizers picked first — cinematic pages with the logistics handled.",
    capabilities: [
      "Share invites over WhatsApp or SMS — guests never install an app",
      "Invitation-code RSVP keeps the guest list yours",
      "Animated invitation cards, and a photo gallery for after the big day",
    ],
    image: {
      src: "/landing/use-cases/rsvp.jpg",
      alt: "RSVP section of a live wedding page asking guests for their invitation code",
      width: 1690,
      height: 675,
      variant: "wide",
    },
  },
  {
    title: "Private gatherings",
    blurb: "Birthdays, showers, dinner parties — invitation-only without the group-chat chaos.",
    capabilities: [
      "Secure tokenized links — no guest accounts, no public listing",
      "Control which sections each guest can see",
      "RSVPs with plus-ones, confirmations, and reminders by email",
    ],
    image: {
      src: "/landing/use-cases/party.jpg",
      alt: "Party template with a playful gradient hero and when-and-where cards",
      width: 860,
      height: 1760,
      variant: "phone",
    },
  },
  {
    title: "Conferences & summits",
    blurb: "A public page built to be found — and to check people in.",
    capabilities: [
      "SEO-indexed pages with agendas, speakers, and sponsors",
      "QR passes attached to every confirmation email",
      "Real-time RSVP tracking as registrations come in",
    ],
    image: {
      src: "/landing/use-cases/conference.jpg",
      alt: "Conference template hero with date, time, and venue cards",
      width: 860,
      height: 1760,
      variant: "phone",
    },
  },
  {
    title: "Meetups & communities",
    blurb: "Grow attendance from discovery, not just your follower list.",
    capabilities: [
      "Listed in EventFXr discovery, with per-city pages",
      "Automated confirmations and reminders for every RSVP",
      "A livestream page for the people who can't make it in person",
    ],
    image: {
      src: "/landing/use-cases/discover.jpg",
      alt: "EventFXr discovery page showing featured event cards with dates and cities",
      width: 1824,
      height: 941,
      variant: "wide",
    },
  },
];

function CapabilityList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-black/75">
          <svg
            className="mt-0.5 size-4 shrink-0 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function UseCaseGrid() {
  return (
    <Section id="use-cases" className="bg-white">
      <RevealOnScroll visibleClassName={styles.rowsVisible}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            Built for the events you actually run
          </h2>
          <p className="mt-3 text-base text-black/70">
            Four event formats, each with the specific tooling it needs — every
            screenshot is the real product.
          </p>
        </div>

        <div className="mt-14 space-y-16 lg:space-y-20">
          {useCases.map((useCase, index) => (
            <div
              key={useCase.title}
              className={`${styles.row} grid items-center gap-8 lg:grid-cols-12 lg:gap-12`}
              style={{ "--reveal-i": index % 2 } as React.CSSProperties}
            >
              <div
                className={[
                  "lg:col-span-5",
                  index % 2 === 1 ? "lg:order-2 lg:col-start-8" : "",
                ].join(" ")}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-black">
                  {useCase.title}
                </h3>
                <p className="mt-2 text-base text-black/70">{useCase.blurb}</p>
                <CapabilityList items={useCase.capabilities} />
              </div>

              <div
                className={[
                  "lg:col-span-7",
                  index % 2 === 1 ? "lg:order-1 lg:col-start-1" : "",
                  useCase.image.variant === "phone" ? "flex justify-center" : "",
                ].join(" ")}
              >
                <div
                  className={[
                    "overflow-hidden rounded-3xl bg-zinc-50 ring-1 ring-black/5 shadow-sm",
                    useCase.image.variant === "phone" ? "w-full max-w-[300px]" : "",
                  ].join(" ")}
                >
                  <Image
                    src={useCase.image.src}
                    alt={useCase.image.alt}
                    width={useCase.image.width}
                    height={useCase.image.height}
                    className="h-auto w-full"
                    sizes={
                      useCase.image.variant === "phone"
                        ? "300px"
                        : "(min-width: 1024px) 55vw, 92vw"
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </RevealOnScroll>
    </Section>
  );
}
