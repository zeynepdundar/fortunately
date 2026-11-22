import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fortunately — AI job-fit copilot",
  description:
    "Turn every 'Unfortunately' into a 'Fortunately'. AI job-fit copilot.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
