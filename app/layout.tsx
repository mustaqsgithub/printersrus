import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/ToastProvider";

// Store configuration - this will be moved to environment variables
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "printersrus";
const STORE_DESCRIPTION = process.env.NEXT_PUBLIC_STORE_DESCRIPTION || "Your one-stop shop for printers, ink, toner, and accessories";

export const metadata: Metadata = {
  title: {
    default: STORE_NAME,
    template: `%s | ${STORE_NAME}`,
  },
  description: STORE_DESCRIPTION,
  keywords: ["printers", "ink", "toner", "office supplies", "printing"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-gray-50">
        <ToastProvider>
          <Header />
          <main className="flex-grow bg-gray-50">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
