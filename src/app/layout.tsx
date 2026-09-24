import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SalesFlow", template: "%s · SalesFlow" },
  description: "De la note vocale au suivi client : email, tâches et fiche client, validés par le commercial.",
  appleWebApp: { capable: true, title: "SalesFlow", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2449c9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
