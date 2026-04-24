import { ReactNode } from "react";
import "./globals.css";
import Navigation from "@/components/Navigation";
import RouteGuard from "@/components/RouteGuard";
import { ReactQueryProvider } from "@/providers/react-query";

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
          <RouteGuard>
            <Navigation />
            {children}
          </RouteGuard>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
