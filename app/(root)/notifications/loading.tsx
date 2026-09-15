import { Skeleton } from "@/components/ui/skeleton";
export default function NotificationsLoading() {
	return (
		<div role="status" className="mx-auto max-w-3xl space-y-4 py-6">
			<span className="sr-only">Loading notifications</span>
			<Skeleton className="h-8 w-48" />
			<Skeleton className="h-40 w-full" />
		</div>
	);
}
