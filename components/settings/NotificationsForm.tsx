"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { updateMarketNewsPreference } from "@/lib/actions/notification.actions";
import {
	MARKET_NEWS_CATEGORIES,
	type EmailFrequency,
	type MarketNewsCategory,
	type MarketNewsPreferenceView,
} from "@/lib/email/communication-policy";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const frequencyOptions: Array<{ value: EmailFrequency; label: string }> = [
	{ value: "off", label: "Off" },
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
];

const categoryLabels: Record<MarketNewsCategory, string> = {
	watchlist_news: "Watchlist news",
	general_market: "General market news",
	earnings: "Earnings",
	economic_news: "Economic news",
};

const preferenceKey = ({
	frequency,
	categories,
}: Pick<MarketNewsPreferenceView, "frequency" | "categories">) =>
	`${frequency}:${[...categories].sort().join(",")}`;

export default function NotificationsForm({
	initialPreference,
}: {
	initialPreference: MarketNewsPreferenceView;
}) {
	const [frequency, setFrequency] = useState(initialPreference.frequency);
	const [categories, setCategories] = useState<MarketNewsCategory[]>(
		initialPreference.categories,
	);
	const [savedStatus, setSavedStatus] = useState(initialPreference.status);
	const [savedKey, setSavedKey] = useState(preferenceKey(initialPreference));
	const [isPending, startTransition] = useTransition();
	const currentKey = preferenceKey({ frequency, categories });
	const missingSubscribedCategory =
		frequency !== "off" && categories.length === 0;

	const toggleCategory = (category: MarketNewsCategory) => {
		setCategories((current) =>
			current.includes(category)
				? current.filter((candidate) => candidate !== category)
				: MARKET_NEWS_CATEGORIES.filter(
						(candidate) => current.includes(candidate) || candidate === category,
					),
		);
	};

	const savePreference = () => {
		startTransition(async () => {
			const result = await updateMarketNewsPreference({
				frequency,
				categories,
			});
			if (!result.success) {
				toast.error("Unable to save your notification preference", {
					description: result.error,
				});
				return;
			}

			setSavedKey(currentKey);
			setSavedStatus(frequency === "off" ? "unsubscribed" : "subscribed");
			toast.success(
				frequency === "off"
					? "You have unsubscribed from market news emails"
					: `Market news emails are set to ${frequency}`,
			);
		});
	};

	return (
		<form onSubmit={(event) => event.preventDefault()}>
			<div className="border-b border-gray-600 py-7">
				<h2 className="text-xl font-bold text-white">Email notifications</h2>
				<p className="mt-1 text-sm leading-6 text-gray-500">
					Control which optional emails Bull Wise sends you. Transactional
					account and price-alert emails are managed separately.
				</p>
			</div>

			<div className="grid gap-5 border-b border-gray-600 py-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-10">
				<div>
					<h3 className="font-semibold text-white">Market news summary</h3>
					<p className="mt-1 text-sm leading-6 text-gray-500">
						Personalized news based on your watchlist and selected topics.
					</p>
				</div>

				<div className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="market-news-frequency" className="form-label">
							Frequency
						</Label>
						<Select
							value={frequency}
							disabled={isPending}
							onValueChange={(value) =>
								setFrequency(value as EmailFrequency)
							}
						>
							<SelectTrigger
								id="market-news-frequency"
								className="select-trigger"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="border-gray-600 bg-gray-800 text-white">
								{frequencyOptions.map((option) => (
									<SelectItem
										key={option.value}
										value={option.value}
										className="focus:bg-gray-600 focus:text-white"
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-3">
						<div>
							<Label className="form-label">News categories</Label>
							<p className="mt-1 text-xs text-gray-500">
								Choose the topics included in your market news summary.
							</p>
						</div>
						<div className="mt-3 grid gap-3 sm:grid-cols-2">
							{MARKET_NEWS_CATEGORIES.map((category) => {
								const selected = categories.includes(category);

								return (
									<Button
										key={category}
										type="button"
										variant="outline"
										role="checkbox"
										aria-checked={selected}
										disabled={isPending}
										onClick={() => toggleCategory(category)}
										className={cn(
											"h-12 justify-start border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white",
											selected &&
												"border-yellow-500 bg-yellow-400/10 text-white hover:bg-yellow-400/15",
										)}
									>
										<span
											className={cn(
												"mr-2 flex size-5 items-center justify-center rounded border border-gray-500",
												selected &&
													"border-yellow-500 bg-yellow-500 text-gray-950",
											)}
										>
											{selected ? <Check className="size-3.5" /> : null}
										</span>
										{categoryLabels[category]}
									</Button>
								);
							})}
						</div>
					</div>
					{missingSubscribedCategory ? (
						<p className="text-sm text-red-500">
							Select at least one news category before subscribing.
						</p>
					) : null}

					{savedStatus === "unknown" && frequency === "off" ? (
						<p className="text-sm leading-5 text-gray-500">
							You are not currently subscribed. Choose daily or weekly and save
							to provide consent for these optional emails.
						</p>
					) : null}
					{frequency !== "off" ? (
						<p className="text-xs leading-5 text-gray-500">
							By saving, you agree to receive the selected optional market-news
							emails. You can unsubscribe at any time.
						</p>
					) : null}
				</div>
			</div>

			<div className="flex justify-end pt-6">
				<Button
					type="button"
					disabled={
						currentKey === savedKey || isPending || missingSubscribedCategory
					}
					aria-busy={isPending}
					onClick={savePreference}
					className="yellow-btn min-w-40 px-6"
				>
					{isPending ? "Saving..." : "Save notifications"}
				</Button>
			</div>
		</form>
	);
}
