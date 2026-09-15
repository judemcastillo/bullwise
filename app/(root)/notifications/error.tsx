"use client";
import { Button } from "@/components/ui/button";
export default function NotificationsError({ reset }: { reset: () => void }) {
	return (
		<div role="alert" className="mx-auto max-w-3xl space-y-4 py-6">
			<h1 className="text-xl font-semibold text-gray-100">
				Unable to load notifications
			</h1>
			<p>Please try again.</p>
			<Button variant="outline" onClick={reset}>
				Retry
			</Button>
		</div>
	);
}
