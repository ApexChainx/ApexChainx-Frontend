import { ReactNode } from "react";
import "./globals.css";
import Navigation from "@/components/Navigation";
import RouteGuard from "@/components/RouteGuard";
import { ReactQueryProvider } from "@/providers/react-query";
import { ToastProvider } from "@/components/ui/toast";

export const metadata = {
  title: "NOCIQ",
  description: "Base app shell",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <ToastProvider>
            <RouteGuard>
              <Navigation />
              {children}
            </RouteGuard>
          </ToastProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
