import { ConvexHttpClient } from "convex/browser"
import { headers } from "next/headers"
import type Stripe from "stripe"

import { api } from "../../../../../convex/_generated/api"

import type { StripeCheckoutMetaData } from "@/actions/stripe"
import { stripe } from "@/lib/stripe"

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
	throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export async function POST(req: Request) {
	const body = await req.text()
	const headersList = await headers()
	const signature = headersList.get("stripe-signature") as string

	let event: Stripe.Event

	try {
		event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
	} catch (err) {
		console.error("Webhook construction failed:", err)
		return new Response(`Webhook Error: ${(err as Error).message}`, {
			status: 400,
		})
	}

	if (event.type === "checkout.session.completed") {
		const session = event.data.object as Stripe.Checkout.Session
		const metadata = session.metadata as StripeCheckoutMetaData

		try {
			await convex.mutation(api.events.purchaseTicket, {
				eventId: metadata.eventId,
				userId: metadata.userId,
				waitingListId: metadata.waitingListId,
				paymentInfo: {
					paymentIntentId: session.payment_intent as string,
					amount: session.amount_total ?? 0,
				},
			})
		} catch (error) {
			console.error("Error processing webhook:", error)
			return new Response("Error processing webhook", { status: 500 })
		}
	}

	return new Response(null, { status: 200 })
}
