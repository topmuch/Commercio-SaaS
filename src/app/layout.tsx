import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { CartProvider } from "@/lib/cart-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teranga Biz — L'ERP qui comprend votre commerce",
  description:
    "Le premier ERP SaaS conçu pour les distributeurs africains. CRM intelligent, carte territoriale, commandes WhatsApp. Gérez votre distribution au Sénégal, Côte d'Ivoire, Mali et plus.",
  keywords: [
    "ERP Afrique",
    "ERP Sénégal",
    "logiciel distribution",
    "CRM distributeur",
    "gestion commerciale Afrique",
    "WhatsApp Business",
    "carte clients",
    "Teranga Biz",
    "FCFA",
  ],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  manifest: "/manifest.json",
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Teranga',
    'theme-color': '#10B981',
  },
  openGraph: {
    title: "Teranga Biz — L'ERP qui comprend votre commerce",
    description:
      "CRM intelligent, carte territoriale, commandes WhatsApp. Le premier ERP conçu pour les distributeurs africains.",
    type: "website",
    locale: "fr_SN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Teranga" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-slate-50`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ServiceWorkerRegister />
          <CartProvider>
            {children}
          </CartProvider>
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
