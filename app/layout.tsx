import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./hollywood.css";
import "./premium.css";
import "./catalog.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { template: "%s | DUDE Hollywood", default: "DUDE Hollywood — All movies" },
  description: "Discover Hollywood movies and watch in your preferred quality.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#101a2b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>;
}
