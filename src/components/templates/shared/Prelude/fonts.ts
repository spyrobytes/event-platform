import { Great_Vibes, Dancing_Script } from "next/font/google";

export const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-prelude-romantic",
});

export const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-prelude-modern",
});
