import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { redirect } from "next/navigation"

import { api } from "../../../../convex/_generated/api"

import { Ticket } from "@/components/ticket"

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
	throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export default async function TicketSuccess() {
	const { userId } = await auth()
	if (!userId) {
		redirect("/")
	}

	const tickets = await convex.query(api.events.getUserTickets, { userId })
	const latestTicket = tickets[tickets.length - 1]

	if (!latestTicket) {
		redirect("/")
	}

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-3xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Ticket Purchase Successful!</h1>
					<p className="mt-2 text-gray-600">Your ticket has been confirmed and is ready to use</p>
				</div>

				<Ticket ticketId={latestTicket._id} />
			</div>
		</div>
	)
}
