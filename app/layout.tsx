/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { SkipLink } from "@/components/ui/skip-link"
import { getNonce } from "@/lib/security/nonce"

const roboto = Roboto({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HAY2010 - Gestion Commerciale",
  description: "Tableau de bord de gestion commerciale et de stock",
  icons: {
    icon: "/hay2010-logo.png",
    apple: "/hay2010-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getNonce()

  return (
    <html lang="fr" className={roboto.variable} suppressHydrationWarning nonce={nonce}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        nonce={nonce}
      >
        <SkipLink />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster position="top-right" closeButton />
      </body>
    </html>
  );
}
