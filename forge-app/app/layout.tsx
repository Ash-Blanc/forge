import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "FORGE | Build from Research",
    description: "Turn academic papers into SaaS businesses. AI-powered analysis for builders and researchers.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${sans.variable} ${jbMono.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
