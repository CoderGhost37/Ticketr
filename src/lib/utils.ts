import { type ClassValue, clsx } from "clsx"
import { useQuery } from "convex/react"
import { twMerge } from "tailwind-merge"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function useStorageUrl(storageId: Id<"_storage"> | undefined) {
	return useQuery(api.storage.getUrl, storageId ? { storageId } : "skip")
}
