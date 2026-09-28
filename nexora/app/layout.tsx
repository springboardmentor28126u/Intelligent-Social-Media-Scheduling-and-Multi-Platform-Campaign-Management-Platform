import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialPilot — Plan. Post. Perform. | Intelligent Social Media SaaS",
  description: "SocialPilot helps creators, businesses and marketing teams create, schedule, publish and analyze social media content from one intelligent workspace.",
  keywords: ["social media scheduling", "SocialPilot AI", "Instagram scheduler", "LinkedIn automation", "social analytics"],
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-[#635BFF]/20 selection:text-[#635BFF]">
        {children}
      </body>
    </html>
  );
}
