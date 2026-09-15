"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { readNotification } from "@/lib/actions/inbox.actions";
import type { NotificationDto } from "@/types/notifications";
import { announceNotificationChange } from "./NotificationList";
export default function NotificationDetail({
	item,
}: {
	item: NotificationDto;
}) {
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const [pending, startTransition] = useTransition();
	useEffect(() => {
		if (item.readAt) return;
		startTransition(async () => {
			try {
				const result = await readNotification(item.id);
				if (!result.success) setError(result.error);
				else {
					setError(null);
					announceNotificationChange({ item: result.item });
				}
			} catch {
				setError("Unable to mark this notification as read.");
			}
		});
	}, [item.id, item.readAt, attempt]);
	return (
		<article className="space-y-5">
			<Button variant="ghost" asChild>
				<Link href="/notifications">Back to notifications</Link>
			</Button>
			{error && (
				<div role="alert" className="text-red-300">
					{error}{" "}
					<Button
						variant="outline"
						disabled={pending}
						onClick={() => setAttempt((n) => n + 1)}
					>
						Retry
					</Button>
				</div>
			)}
			<h1 className="text-2xl font-semibold text-gray-100">{item.title}</h1>
			<time dateTime={item.createdAt} className="text-sm text-gray-400">
				{new Date(item.createdAt).toLocaleString("en-US", { timeZone: "UTC" })}{" "}
				UTC
			</time>
			<Separator className="bg-gray-800" />
			{item.body && (
				<p className="whitespace-pre-wrap break-words text-gray-300">
					{item.body}
				</p>
			)}
			<ul className="space-y-4">
				{item.articles.map((article) => (
					<li key={article.url}>
						<a
							href={article.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-yellow-500 underline-offset-4 hover:underline"
						>
							{article.headline}
							<span className="sr-only"> (opens in a new tab)</span>
						</a>
						<p className="text-sm text-gray-400">{article.source}</p>
					</li>
				))}
			</ul>
			{item.destination && (
				<Button asChild>
					<Link href={item.destination}>View details</Link>
				</Button>
			)}
		</article>
	);
}
