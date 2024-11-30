import type { Id } from "../../convex/_generated/dataModel"

export const PurchaseTicket = ({ eventId }: { eventId: Id<"events"> }) => {
	return <p>Purchase ticket for event {eventId}</p>
}
