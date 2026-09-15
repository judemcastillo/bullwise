"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Megaphone, Newspaper, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
	readAllNotifications,
	readNotification,
} from "@/lib/actions/inbox.actions";
import type { NotificationDto, NotificationPage } from "@/types/notifications";
import { cn } from "@/lib/utils";

export const NOTIFICATIONS_CHANGED = "bullwise:notifications-changed";
type NotificationChange = { item?: NotificationDto; cutoff?: string };
export function announceNotificationChange(change: NotificationChange) {
	window.dispatchEvent(
		new CustomEvent(NOTIFICATIONS_CHANGED, { detail: change }),
	);
}
export function NotificationList({
	compact = false,
	onNavigate,
}: {
	compact?: boolean;
	onNavigate?: () => void;
}) {
	const [items, setItems] = useState<NotificationDto[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retryCursor, setRetryCursor] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();
	const request = useRef(0);
	const controller = useRef<AbortController | null>(null);
	const router = useRouter();
	const load = useCallback(async (after: string | null = null) => {
		const sequence = ++request.current;
		controller.current?.abort();
		controller.current = new AbortController();
		setLoading(true);
		setError(null);
		setRetryCursor(after);
		try {
			const response = await fetch(
				`/api/notifications${after ? `?cursor=${encodeURIComponent(after)}` : ""}`,
				{ cache: "no-store", signal: controller.current.signal },
			);
			if (!response.ok)
				throw new Error("Unable to load notifications. Please try again.");
			const page: NotificationPage = await response.json();
			if (sequence !== request.current) return;
			setItems((previous) =>
				after
					? [
							...previous,
							...page.items.filter(
								(item) => !previous.some((p) => p.id === item.id),
							),
						]
					: page.items,
			);
			setCursor(page.nextCursor);
		} catch (e) {
			if (
				sequence === request.current &&
				!(e instanceof Error && e.name === "AbortError")
			)
				setError("Unable to load notifications. Please try again.");
		} finally {
			if (sequence === request.current) setLoading(false);
		}
	}, []);
	useEffect(() => {
		const timer = window.setTimeout(() => {
			void load();
		}, 0);
		const activeController = controller;
		const activeRequest = request;
		return () => {
			window.clearTimeout(timer);
			++activeRequest.current;
			activeController.current?.abort();
		};
	}, [load]);
	useEffect(() => {
		const update = (event: Event) => {
			const change = (event as CustomEvent<NotificationChange>).detail;
			if (!change) return;
			setItems((previous) =>
				previous.map((item) => {
					if (change.item?.id === item.id) return change.item;
					if (change.cutoff && !item.readAt && item.createdAt <= change.cutoff)
						return { ...item, readAt: change.cutoff };
					return item;
				}),
			);
		};
		window.addEventListener(NOTIFICATIONS_CHANGED, update);
		return () => window.removeEventListener(NOTIFICATIONS_CHANGED, update);
	}, []);
	const openItem = (item: NotificationDto) =>
		startTransition(async () => {
			setError(null);
			try {
				const result = await readNotification(item.id);
				if (!result.success) {
					setError(result.error);
					return;
				}
				setItems((previous) =>
					previous.map((p) => (p.id === item.id ? result.item : p)),
				);
				announceNotificationChange({ item: result.item });
				onNavigate?.();
				router.push(
					item.type === "price_alert" && item.destination
						? item.destination
						: `/notifications/${item.id}`,
				);
			} catch {
				setError(
					"Unable to mark this notification as read. Select it to retry.",
				);
			}
		});
	const markAll = () =>
		startTransition(async () => {
			setError(null);
			try {
				const result = await readAllNotifications();
				if (!result.success) {
					setError(result.error);
					return;
				}
				setItems((previous) =>
					previous.map((item) =>
						!item.readAt && item.createdAt <= result.cutoff
							? { ...item, readAt: result.cutoff }
							: item,
					),
				);
				announceNotificationChange({ cutoff: result.cutoff });
			} catch {
				setError("Unable to mark notifications as read. Please try again.");
			}
		});
	return (
		<div aria-busy={loading || pending}>
			<div className="flex items-center justify-between gap-2 px-3 py-2">
				<h2 className="font-semibold text-gray-100">
					{compact ? "Notifications" : "Your inbox"}
				</h2>
				<Button
					variant="ghost"
					size="sm"
					disabled={pending || loading}
					onClick={markAll}
				>
					Mark all as read
				</Button>
			</div>
			<Separator className="bg-gray-800" />
			{error && (
				<div role="alert" className="space-y-2 p-3 text-sm text-red-300">
					<p>{error}</p>
					<Button
						variant="outline"
						size="sm"
						disabled={loading || pending}
						onClick={() => void load(retryCursor)}
					>
						Reload notifications
					</Button>
				</div>
			)}
			{loading && items.length === 0 ? (
				<div role="status" className="space-y-3 p-3">
					<span className="sr-only">Loading notifications</span>
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-16 w-full bg-gray-800" />
					))}
				</div>
			) : null}
			{!loading && !error && items.length === 0 && (
				<div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-gray-400">
					<Bell className="size-6" aria-hidden="true" />
					<p className="font-medium text-gray-200">You’re all caught up</p>
					<p className="text-sm">
						Price alerts, news, and announcements will appear here.
					</p>
				</div>
			)}
			<ul aria-label="Notifications">
				{items.map((item) => {
					const Icon =
						item.type === "price_alert"
							? TrendingUp
							: item.type === "market_news"
								? Newspaper
								: Megaphone;
					return (
						<li
							key={item.id}
							className="border-b border-gray-800 last:border-0"
						>
							<Button
								variant="ghost"
								disabled={pending || loading}
								onClick={() => openItem(item)}
								className={cn(
									"h-auto w-full items-start justify-start gap-3 rounded-none px-3 py-4 text-left whitespace-normal hover:bg-gray-800",
									!item.readAt && "bg-yellow-500/5",
								)}
							>
								<Icon
									className="mt-1 size-4 shrink-0 text-yellow-500"
									aria-hidden="true"
								/>
								<span className="min-w-0 flex-1">
									<span
										className={cn(
											"block break-words text-sm",
											!item.readAt
												? "font-semibold text-gray-100"
												: "font-normal text-gray-400",
										)}
									>
										{item.title}
									</span>
									<time
										dateTime={item.createdAt}
										className="mt-1 block text-xs font-normal text-gray-500"
									>
										{new Date(item.createdAt).toLocaleString(undefined, {
											dateStyle: "medium",
											timeStyle: "short",
										})}
									</time>
								</span>
								{!item.readAt && (
									<span className="mt-1.5 size-2 shrink-0 rounded-full bg-yellow-500">
										<span className="sr-only">Unread</span>
									</span>
								)}
							</Button>
						</li>
					);
				})}
			</ul>
			{!compact && cursor && (
				<div className="p-3 text-center">
					<Button
						variant="outline"
						disabled={loading || pending}
						onClick={() => void load(cursor)}
					>
						{loading ? "Loading…" : "Load more"}
					</Button>
				</div>
			)}
		</div>
	);
}
