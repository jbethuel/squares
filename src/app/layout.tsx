import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";
import { STORAGE_KEY } from "@/domain/storage";
import "./globals.css";

export const metadata: Metadata = {
  title: "squares",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "squares", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c211b",
};

/**
 * Resolve the theme before first paint. The app is dark by default and the
 * preference lives in the same blob as everything else, so without this the
 * first frame of a light-theme launch is a flash of the dark one.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var pref = raw ? (JSON.parse(raw).theme || "system") : "system";
    var dark = pref === "dark" || (pref === "system" && !matchMedia("(prefers-color-scheme: light)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <main className="app">{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
