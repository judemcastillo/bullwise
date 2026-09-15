"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { updateInAppNewsPreference } from "@/lib/actions/inbox.actions";
import {
	MARKET_NEWS_CATEGORIES,
	type MarketNewsCategory,
} from "@/lib/email/communication-policy";
import type { InAppNewsPreference } from "@/types/notifications";
const labels: Record<MarketNewsCategory, string> = {
	general_market: "General market news",
	watchlist_news: "Watchlist news",
	earnings: "Earnings",
	economic_news: "Economic news",
};
export default function InAppNotificationsForm({
	initialPreference,
}: {
	initialPreference: InAppNewsPreference;
}) {
	const [preference, setPreference] = useState(initialPreference);
	const [pending, startTransition] = useTransition();
	const [message, setMessage] = useState<{
		error: boolean;
		text: string;
	} | null>(null);
	return (
		<section className="mb-8 space-y-5 rounded-xl border border-gray-800 p-5">
			<div>
				<h2 className="text-xl font-semibold text-gray-100">
					In-app notifications
				</h2>
				<p className="mt-1 text-sm text-gray-400">
					Price alerts and announcements appear in your inbox. Choose how often
					market news appears here, independently of email.
				</p>
			</div>
			<form
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					setMessage(null);
					startTransition(async () => {
						try {
							const result = await updateInAppNewsPreference(preference);
							setMessage(
								result.success
									? { error: false, text: "In-app preferences saved." }
									: { error: true, text: result.error },
							);
						} catch {
							setMessage({
								error: true,
								text: "Unable to save preferences. Please try again.",
							});
						}
					});
				}}
			>
				<div className="space-y-2">
					<Label htmlFor="in-app-frequency">Market-news frequency</Label>
					<Select
						value={preference.frequency}
						disabled={pending}
						onValueChange={(frequency) =>
							setPreference((p) => ({
								...p,
								frequency: frequency as InAppNewsPreference["frequency"],
							}))
						}
					>
						<SelectTrigger id="in-app-frequency" className="w-full sm:w-64">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="off">Off</SelectItem>
							<SelectItem value="daily">Daily digest</SelectItem>
							<SelectItem value="weekly">Weekly digest</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<fieldset
					disabled={pending || preference.frequency === "off"}
					className="space-y-3"
				>
					<legend className="mb-3 text-sm font-medium">News categories</legend>
					{MARKET_NEWS_CATEGORIES.map((category) => (
						<div
							key={category}
							className="flex max-w-sm items-center justify-between gap-4"
						>
							<Label htmlFor={`in-app-${category}`}>{labels[category]}</Label>
							<Switch
								id={`in-app-${category}`}
								disabled={pending || preference.frequency === "off"}
								checked={preference.categories.includes(category)}
								onCheckedChange={(checked) =>
									setPreference((p) => ({
										...p,
										categories: checked
											? [...p.categories, category]
											: p.categories.filter((c) => c !== category),
									}))
								}
							/>
						</div>
					))}
				</fieldset>
				{message && (
					<p
						role={message.error ? "alert" : "status"}
						className={
							message.error ? "text-sm text-red-300" : "text-sm text-green-400"
						}
					>
						{message.text}
					</p>
				)}
				<Button type="submit" disabled={pending}>
					{pending ? "Saving…" : "Save in-app preferences"}
				</Button>
			</form>
		</section>
	);
}
