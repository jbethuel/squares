import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";
import { STORAGE_KEY } from "@squares/domain/storage";
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
 *
 * This runs before React hydrates and rewrites `data-theme` on the very element
 * the server rendered as `dark`, which is a hydration mismatch by construction —
 * see `suppressHydrationWarning` on `<html>` below.
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
    /*
      The bootstrap script above sets `data-theme` on this element before React
      hydrates, so on a light-preference device the server's `dark` and the
      client's `light` disagree — deliberately, because the alternative is a
      dark flash on every launch. This suppression applies to this element
      alone and one level deep; every child is still checked normally.
    */
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <main className="app">{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
