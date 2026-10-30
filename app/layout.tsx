import type { Metadata } from "next";
import "./globals.css";
import "./hollywood.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { template: "%s | DUDE Hollywood", default: "DUDE Hollywood — A screen for every story" },
  description: "Discover Hollywood movies and watch in your preferred quality.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>;
}
