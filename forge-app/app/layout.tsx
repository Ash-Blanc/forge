import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geist = Geist({
    variable: "--font-sans",
    subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
    weight: "400",
    variable: "--font-serif",
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
                className={`${geist.variable} ${instrumentSerif.variable} antialiased font-sans`}
            >
                <ClerkProvider>{children}</ClerkProvider>
            </body>
        </html>
    );
}
