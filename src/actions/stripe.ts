"use server"

import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { headers } from "next/headers"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { DURATIONS } from "../../convex/constants"

import { stripe } from "@/lib/stripe"

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
	throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export async function createStripeConnectCustomer() {
	const { userId } = await auth()

	if (!userId) {
		throw new Error("Not authenticated")
	}

	// Check if user already has a connect account
	const existingStripeConnectId = await convex.query(api.users.getUsersStripeConnectId, {
		userId,
	})

	if (existingStripeConnectId) {
		return { account: existingStripeConnectId }
	}

	// Create new connect account
	const account = await stripe.accounts.create({
		type: "express",
		capabilities: {
			card_payments: { requested: true },
			transfers: { requested: true },
		},
	})

	// Update user with stripe connect id
	await convex.mutation(api.users.updateOrCreateUserStripeConnectId, {
		userId,
		stripeConnectId: account.id,
	})

	return { account: account.id }
}

export async function createStripeConnectLoginLink(stripeAccountId: string) {
	if (!stripeAccountId) {
		throw new Error("No Stripe account ID provided")
	}

	try {
		const loginLink = await stripe.accounts.createLoginLink(stripeAccountId)
		return loginLink.url
	} catch (error) {
		console.error("Error creating Stripe Connect login link:", error)
		throw new Error("Failed to create Stripe Connect login link")
	}
}

export async function getStripeConnectAccount() {
	const { userId } = await auth()

	if (!userId) {
		throw new Error("Not authenticated")
	}

	const stripeConnectId = await convex.query(api.users.getUsersStripeConnectId, {
		userId,
	})

	return {
		stripeConnectId: stripeConnectId || null,
	}
}

export type AccountStatus = {
	isActive: boolean
	requiresInformation: boolean
	requirements: {
		currently_due: string[]
		eventually_due: string[]
		past_due: string[]
	}
	chargesEnabled: boolean
	payoutsEnabled: boolean
}

export async function getStripeConnectAccountStatus(
	stripeAccountId: string
): Promise<AccountStatus> {
	if (!stripeAccountId) {
		throw new Error("No Stripe account ID provided")
	}

	try {
		const account = await stripe.accounts.retrieve(stripeAccountId)

		return {
			isActive: account.details_submitted && !account.requirements?.currently_due?.length,
			requiresInformation: !!(
				account.requirements?.currently_due?.length ||
				account.requirements?.eventually_due?.length ||
				account.requirements?.past_due?.length
			),
			requirements: {
				currently_due: account.requirements?.currently_due || [],
				eventually_due: account.requirements?.eventually_due || [],
				past_due: account.requirements?.past_due || [],
			},
			chargesEnabled: account.charges_enabled,
			payoutsEnabled: account.payouts_enabled,
		}
	} catch (error) {
		console.error("Error fetching Stripe Connect account status:", error)
		throw new Error("Failed to fetch Stripe Connect account status")
	}
}

export async function createStripeConnectAccountLink(account: string) {
	try {
		const headersList = await headers()
		const origin = headersList.get("origin") || ""

		const accountLink = await stripe.accountLinks.create({
			account,
			refresh_url: `${origin}/connect/refresh/${account}`,
			return_url: `${origin}/connect/return/${account}`,
			type: "account_onboarding",
		})

		return { url: accountLink.url }
	} catch (error) {
		console.error("An error occurred when calling the Stripe API to create an account link:", error)
		if (error instanceof Error) {
			throw new Error(error.message)
		}
		throw new Error("An unknown error occurred")
	}
}

export type StripeCheckoutMetaData = {
	eventId: Id<"events">
	userId: string
	waitingListId: Id<"waitingList">
}

export async function createStripeCheckoutSession({
	eventId,
}: {
	eventId: Id<"events">
}) {
	const { userId } = await auth()
	if (!userId) {
		throw new Error("Not authenticated")
	}

	// Get event details
	const event = await convex.query(api.events.getById, { eventId })
	if (!event) {
		throw new Error("Event not found")
	}

	// Get waiting list entry
	const queuePosition = await convex.query(api.waitingList.getQueuePosition, {
		eventId,
		userId,
	})

	if (!queuePosition || queuePosition.status !== "offered") {
		throw new Error("No valid ticket offer found")
	}

	const stripeConnectId = await convex.query(api.users.getUsersStripeConnectId, {
		userId: event.userId,
	})

	if (!stripeConnectId) {
		throw new Error("Stripe Connect ID not found for owner of the event!")
	}

	if (!queuePosition.offerExpiresAt) {
		throw new Error("Ticket offer has no expiration date")
	}

	const metadata: StripeCheckoutMetaData = {
		eventId,
		userId,
		waitingListId: queuePosition._id,
	}

	// Create Stripe Checkout Session
	const session = await stripe.checkout.sessions.create(
		{
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: "inr",
						product_data: {
							name: event.name,
							description: event.description,
						},
						unit_amount: Math.round(event.price * 100),
					},
					quantity: 1,
				},
			],
			payment_intent_data: {
				application_fee_amount: Math.round(event.price * 100 * 0.01), // 1% application fee
			},
			expires_at: Math.floor(Date.now() / 1000) + DURATIONS.TICKET_OFFER / 1000, // 30 minutes (stripe checkout minimum expiration time)
			mode: "payment",
			success_url: `${baseUrl}/tickets/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${baseUrl}/event/${eventId}`,
			metadata,
		},
		{
			stripeAccount: stripeConnectId,
		}
	)

	return { sessionId: session.id, sessionUrl: session.url }
}
