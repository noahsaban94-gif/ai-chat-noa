import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SonnerToaster } from "@/components/ui/sonner-toaster"
import { OneSignalInit } from "@/components/onesignal-init"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "נועה AI ❤️ | ח. סבן חומרי בניין",
  description: "העוזרת האישית והמוח הלוגיסטי-תפעולי של חברת ח. סבן חומרי בניין (1994) בע״מ, עם נעילת מכשירים ואימות OTP רב-מכשירי (PC + Samsung)",
  generator: "v0.app",
  applicationName: "נועה AI",
  openGraph: {
    title: "נועה AI ❤️ | ח. סבן חומרי בניין",
    description: "העוזרת האישית והמוח הלוגיסטי-תפעולי של חברת ח. סבן חומרי בניין (1994) בע״מ, עם נעילת מכשירים ואימות OTP רב-מכשירי (PC + Samsung)",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "נועה AI",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/apple-icon.png",
      },
    ],
  },
  verification: {
    google: "628FdW8QNF-wHQVGmWN_2AGzUGE9z7CPeDpoWfvc2HU",
  },
  other: {
    "google-site-verification": "628FdW8QNF-wHQVGmWN_2AGzUGE9z7CPeDpoWfvc2HU",
  },
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-sans antialiased">
        <OneSignalInit />
        {children}
        <SonnerToaster />
      </body>
    </html>
  )
}
