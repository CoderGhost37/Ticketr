import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import localFont from "next/font/local"

import "./globals.css"

import { ConvexClientProvider } from "@/components/ConvexClientProvider"
import SyncUserWithConvex from "@/components/SyncUserWithConvex"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/toaster"

const geistSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-geist-sans",
	weight: "100 900",
})
const geistMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	weight: "100 900",
})

export const metadata: Metadata = {
	title: "Ticketr",
	description: "A ticketing platform for events.",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ConvexClientProvider>
					<ClerkProvider>
						<Header />
						<SyncUserWithConvex />
						<Toaster />
						{children}
					</ClerkProvider>
				</ConvexClientProvider>
			</body>
		</html>
	)
}
