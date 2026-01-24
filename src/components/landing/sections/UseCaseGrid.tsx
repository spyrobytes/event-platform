import { Section } from "../ui/Section";
import { ReactNode } from "react";

type UseCase = {
  title: string;
  body: string;
  icon: ReactNode;
  color: {
    bg: string;
    text: string;
    ring: string;
  };
};

const items: UseCase[] = [
  {
    title: "Conferences & summits",
    body: "Publish polished pages and manage registrations.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    color: {
      bg: "bg-blue-500/10",
      text: "text-blue-600",
      ring: "ring-blue-500/20",
    },
  },
  {
    title: "Meetups & communities",
    body: "Invite, RSVP, and follow up without chaos.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    color: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
      ring: "ring-emerald-500/20",
    },
  },
  {
    title: "Corporate events",
    body: "Run internal or external events with confidence.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
    color: {
      bg: "bg-violet-500/10",
      text: "text-violet-600",
      ring: "ring-violet-500/20",
    },
  },
  {
    title: "Private gatherings",
    body: "Invitation-only events with clean guest control.",
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    color: {
      bg: "bg-amber-500/10",
      text: "text-amber-600",
      ring: "ring-amber-500/20",
    },
  },
];

export function UseCaseGrid() {
  return (
    <Section id="use-cases" className="bg-white">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            Built for the events you actually run
          </h2>
          <p className="mt-3 text-base text-black/70">
            A pragmatic toolset that adapts to different formats, audiences, and goals.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="group rounded-3xl bg-zinc-50 p-6 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
          >
            <div className={`mb-4 inline-flex size-10 items-center justify-center rounded-xl ${item.color.bg} ${item.color.text} ring-1 ${item.color.ring}`}>
              {item.icon}
            </div>
            <div className="text-sm font-semibold text-black">{item.title}</div>
            <div className="mt-2 text-sm text-black/70">{item.body}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}
