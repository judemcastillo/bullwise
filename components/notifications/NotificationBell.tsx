"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationList, NOTIFICATIONS_CHANGED } from "./NotificationList";
export default function NotificationBell() {
	const [open, setOpen] = useState(false);
	const [count, setCount] = useState<number | null>(null);
	const [failed, setFailed] = useState(false);
	const sequence = useRef(0);
	const refresh = useCallback(async () => {
		if (document.visibilityState !== "visible") return;
		const current = ++sequence.current;
		try {
			const response = await fetch("/api/notifications/count", {
				cache: "no-store",
			});
			if (!response.ok) throw new Error("Unable to load unread count");
			const data: { count: number } = await response.json();
			if (current === sequence.current) {
				setCount(data.count);
				setFailed(false);
			}
		} catch {
			if (current === sequence.current) setFailed(true);
		}
	}, []);
	useEffect(() => {
		const activeSequence = sequence;
		const update = () => {
			void refresh();
		};
		update();
		const interval = window.setInterval(update, 60_000);
		window.addEventListener("focus", update);
		document.addEventListener("visibilitychange", update);
		window.addEventListener(NOTIFICATIONS_CHANGED, update);
		return () => {
			++activeSequence.current;
			window.clearInterval(interval);
			window.removeEventListener("focus", update);
			document.removeEventListener("visibilitychange", update);
			window.removeEventListener(NOTIFICATIONS_CHANGED, update);
		};
	}, [refresh]);
	return (
		<Popover
			open={open}
			onOpenChange={(value) => {
				setOpen(value);
				if (value) void refresh();
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative size-10 rounded-full text-gray-400 hover:bg-gray-800 hover:text-yellow-500"
					aria-label={`Notifications${count !== null ? `, ${count} unread` : ""}${failed ? ", unread count unavailable" : ""}`}
				>
					<Bell className="size-5" aria-hidden="true" />
					{count !== null && count > 0 && (
						<Badge
							aria-hidden="true"
							className="absolute -top-1 -right-1 min-w-4 border-0 bg-yellow-500 px-1 py-0 text-[10px] text-gray-950"
						>
							{count > 99 ? "99+" : count}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={10}
				aria-label="Notifications"
				className="w-[min(24rem,calc(100vw-1rem))] gap-0 overflow-hidden border border-gray-800 bg-gray-950 p-0 text-gray-200 shadow-xl"
			>
				{failed && (
					<div role="status" className="px-3 pt-3 text-xs text-gray-400">
						Unread count unavailable.{" "}
						<Button variant="link" size="sm" onClick={() => void refresh()}>
							Retry
						</Button>
					</div>
				)}
				<ScrollArea className="max-h-[min(28rem,65dvh)] [&_[data-slot=scroll-area-viewport]]:max-h-[min(28rem,65dvh)]">
					<NotificationList compact onNavigate={() => setOpen(false)} />
				</ScrollArea>
				<Separator className="bg-gray-800" />
				<div className="flex items-center justify-between p-2">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/notifications" onClick={() => setOpen(false)}>
							View all notifications
						</Link>
					</Button>
					<Button variant="ghost" size="sm" asChild>
						<Link href="/settings/notifications" onClick={() => setOpen(false)}>
							Settings
						</Link>
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
