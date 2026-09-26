import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
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
      <head>
        <meta name="google-site-verification" content="628FdW8QNF-wHQVGmWN_2AGzUGE9z7CPeDpoWfvc2HU" />
        {/* OneSignal Web Push - safely initialized only on configured origin */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  window.addEventListener("error", function(e) {
                    if (e && e.message && e.message.indexOf("Can only be used on") !== -1) {
                      e.preventDefault();
                      e.stopPropagation();
                      return true;
                    }
                  }, true);

                  window.addEventListener("unhandledrejection", function(e) {
                    var reason = e && (e.reason ? (typeof e.reason === "string" ? e.reason : (e.reason.message || "")) : "");
                    if (reason && reason.indexOf("Can only be used on") !== -1) {
                      e.preventDefault();
                      e.stopPropagation();
                      return true;
                    }
                  }, true);

                  var hostname = window.location.hostname;
                  var isAllowedHost = hostname === "ai-chat-noa.vercel.app" || hostname === "localhost" || hostname === "127.0.0.1";
                  if (!isAllowedHost) {
                    return;
                  }

                  window.OneSignalDeferred = window.OneSignalDeferred || [];
                  var script = document.createElement("script");
                  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
                  script.defer = true;
                  document.head.appendChild(script);

                  OneSignalDeferred.push(async function(OneSignal) {
                    try {
                      await OneSignal.init({
                        appId: "8f9c9417-530c-41e2-8a65-850d10758258",
                        allowLocalhostAsSecureOrigin: true,
                        notifyButton: { enable: false }
                      });
                    } catch (initErr) {
                    }
                  });
                } catch (err) {
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
