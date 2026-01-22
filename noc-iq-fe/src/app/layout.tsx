import { ReactNode } from "react";
import "./globals.css";
import Navigation from "@/components/Navigation";

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
        <Navigation />
        <main style={{ padding: "1rem" }}>{children}</main>
      </body>
    </html>
  );
}
