import type { Metadata } from "next";
import "./globals.css";
import "./biggboss.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { template: "%s | Dude • Bigg Boss Tamil", default: "Dude • Bigg Boss Tamil — Season 10" },
  description: "Watch Bigg Boss Tamil Season 10 episodes, promos and highlights in your preferred quality.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>;
}
