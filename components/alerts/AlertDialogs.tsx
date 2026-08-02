"use client";

import {
	createAlertAction,
	deleteAlertAction,
	setAlertStatusAction,
	sendTestAlertEmailAction,
	updateAlertAction,
} from "@/lib/actions/alert.actions";
import { formatCurrencyValue } from "@/lib/utils";
import type {
	AlertDto,
	AlertInstrumentOption,
	AlertOperator,
} from "@/types/alerts";
import {
	BellRing,
	Loader2,
	MailCheck,
	Pause,
	Play,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type CreateAlertDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	instruments: AlertInstrumentOption[];
	initialInstrument?: AlertInstrumentOption | null;
};

const controlClass =
	"h-10! w-full rounded-lg border border-gray-600 bg-gray-700 px-3 text-sm text-gray-100 outline-none focus:border-yellow-500";

const instrumentKey = (instrument: AlertInstrumentOption) =>
	`${instrument.provider}:${instrument.providerSymbol}`;

function suggestedThreshold(
	instrument?: AlertInstrumentOption,
	operator: AlertOperator = "crosses_above",
) {
	if (!instrument?.currentPrice || instrument.currentPrice <= 0) return "";
	const multiplier = operator === "crosses_above" ? 1.05 : 0.95;
	return (instrument.currentPrice * multiplier).toFixed(2);
}

export function CreateAlertDialog(props: CreateAlertDialogProps) {
	const resetKey = `${props.open}:${props.initialInstrument ? instrumentKey(props.initialInstrument) : props.instruments[0] ? instrumentKey(props.instruments[0]) : "empty"}`;
	return <CreateAlertDialogState key={resetKey} {...props} />;
}

function CreateAlertDialogState({
	open,
	onOpenChange,
	instruments,
	initialInstrument,
}: CreateAlertDialogProps) {
	const router = useRouter();
	const fallbackInstrument = initialInstrument ?? instruments[0];
	const [selectedKey, setSelectedKey] = useState(
		fallbackInstrument ? instrumentKey(fallbackInstrument) : "",
	);
	const [name, setName] = useState(
		fallbackInstrument ? `${fallbackInstrument.displaySymbol} price alert` : "",
	);
	const [operator, setOperator] = useState<AlertOperator>("crosses_above");
	const [threshold, setThreshold] = useState(
		suggestedThreshold(fallbackInstrument),
	);
	const [emailEnabled, setEmailEnabled] = useState(true);
	const [isPending, setIsPending] = useState(false);

	const selectedInstrument = useMemo(
		() =>
			instruments.find(
				(instrument) => instrumentKey(instrument) === selectedKey,
			),
		[instruments, selectedKey],
	);

	const handleInstrumentChange = (nextKey: string) => {
		const instrument = instruments.find(
			(candidate) => instrumentKey(candidate) === nextKey,
		);
		setSelectedKey(nextKey);

		if (instrument) {
			setName(`${instrument.displaySymbol} price alert`);
			setThreshold(suggestedThreshold(instrument));
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!selectedInstrument || isPending) return;

		setIsPending(true);
		try {
			const result = await createAlertAction({
				instrument: {
					assetClass: selectedInstrument.assetClass,
					provider: selectedInstrument.provider,
					providerSymbol: selectedInstrument.providerSymbol,
				},
				name,
				operator,
				threshold,
				emailEnabled,
			});

			if (!result.success) throw new Error(result.error);

			toast.success("Alert created", {
				description: `${selectedInstrument.displaySymbol} will be monitored when alert delivery is enabled.`,
			});
			onOpenChange(false);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to create alert",
			);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="alert-dialog max-w-lg! p-5">
				<DialogHeader>
					<DialogTitle className="alert-title flex items-center gap-2">
						<BellRing className="size-5 text-yellow-500" aria-hidden="true" />
						Create price alert
					</DialogTitle>
					<DialogDescription className="text-gray-400">
						Choose the target that Bull Wise should monitor for you.
					</DialogDescription>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="alert-instrument">Instrument</Label>
						<Select
							value={selectedKey}
							onValueChange={handleInstrumentChange}
							disabled={isPending || instruments.length === 0}
						>
							<SelectTrigger id="alert-instrument" className={controlClass}>
								<SelectValue placeholder="Choose an instrument" />
							</SelectTrigger>
							<SelectContent
								position="popper"
								className="border-gray-600 bg-gray-800 text-white"
							>
								{instruments.map((instrument) => (
									<SelectItem
										key={instrumentKey(instrument)}
										value={instrumentKey(instrument)}
										className="focus:bg-gray-600 focus:text-white"
									>
										{instrument.displaySymbol} — {instrument.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedInstrument ? (
						<div className="rounded-lg border border-gray-600 bg-gray-700/60 p-3">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="font-semibold text-gray-100">
										{selectedInstrument.name}
									</p>
									<p className="mt-1  text-xs uppercase text-gray-400">
										{selectedInstrument.assetClass} ·{" "}
										{selectedInstrument.displaySymbol}
									</p>
								</div>
								<p className="font-semibold text-gray-100">
									{formatCurrencyValue(
										selectedInstrument.currentPrice,
										selectedInstrument.currency,
									)}
								</p>
							</div>
						</div>
					) : null}

					<div className="space-y-2">
						<Label htmlFor="alert-name">Alert name</Label>
						<Input
							id="alert-name"
							className={controlClass}
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={80}
							required
							disabled={isPending}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="alert-condition">Condition</Label>
							<Select
								value={operator}
								onValueChange={(value) => {
									const nextOperator = value as AlertOperator;
									setOperator(nextOperator);
									setThreshold(
										suggestedThreshold(selectedInstrument, nextOperator),
									);
								}}
								disabled={isPending}
							>
								<SelectTrigger id="alert-condition" className={controlClass}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent
									position="popper"
									className="border-gray-600 bg-gray-800 text-white"
								>
									<SelectItem
										value="crosses_above"
										className="focus:bg-gray-600 focus:text-white"
									>
										Crosses above
									</SelectItem>
									<SelectItem
										value="crosses_below"
										className="focus:bg-gray-600 focus:text-white"
									>
										Crosses below
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="alert-threshold">
								Target price
								{selectedInstrument?.currency
									? ` (${selectedInstrument.currency})`
									: ""}
							</Label>
							<Input
								id="alert-threshold"
								className={controlClass}
								type="number"
								inputMode="decimal"
								min="0"
								step="any"
								value={threshold}
								onChange={(event) => setThreshold(event.target.value)}
								required
								disabled={isPending}
							/>
						</div>
					</div>

					<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-600 bg-gray-700/40 p-3">
						<input
							type="checkbox"
							checked={emailEnabled}
							onChange={(event) => setEmailEnabled(event.target.checked)}
							disabled={isPending}
							className="size-4 accent-yellow-500"
						/>
						<span>
							<span className="block text-sm font-medium text-gray-100">
								Email notification
							</span>
							<span className="block text-xs text-gray-400">
								Send an email when the configured price crossing occurs.
							</span>
						</span>
					</label>

					<DialogFooter className="mt-5">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className="bg-yellow-500 text-gray-900 hover:bg-yellow-400"
							disabled={isPending || !selectedInstrument}
						>
							{isPending ? (
								<Loader2 className="animate-spin" aria-hidden="true" />
							) : null}
							Create alert
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type AlertDetailsDialogProps = {
	alert: AlertDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function AlertDetailsDialog(props: AlertDetailsDialogProps) {
	const resetKey = `${props.open}:${props.alert?.id ?? "empty"}:${props.alert?.updatedAt ?? ""}`;
	return <AlertDetailsDialogState key={resetKey} {...props} />;
}

function AlertDetailsDialogState({
	alert,
	open,
	onOpenChange,
}: AlertDetailsDialogProps) {
	const router = useRouter();
	const [name, setName] = useState(alert?.name ?? "");
	const [operator, setOperator] = useState<AlertOperator>(
		alert?.operator ?? "crosses_above",
	);
	const [threshold, setThreshold] = useState(alert?.threshold ?? "");
	const [emailEnabled, setEmailEnabled] = useState(alert?.emailEnabled ?? true);
	const [isPending, setIsPending] = useState(false);

	if (!alert) return null;

	const handleSave = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isPending) return;

		setIsPending(true);
		try {
			const result = await updateAlertAction(alert.id, {
				name,
				operator,
				threshold,
				emailEnabled,
			});
			if (!result.success) throw new Error(result.error);

			toast.success("Alert updated");
			onOpenChange(false);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to update alert",
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleStatusChange = async () => {
		if (isPending || alert.status === "triggered") return;

		const nextStatus = alert.status === "active" ? "paused" : "active";
		setIsPending(true);
		try {
			const result = await setAlertStatusAction(alert.id, nextStatus);
			if (!result.success) throw new Error(result.error);

			toast.success(nextStatus === "active" ? "Alert resumed" : "Alert paused");
			onOpenChange(false);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to change alert status",
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleDelete = async () => {
		if (
			isPending ||
			!window.confirm(`Delete "${alert.name}"? This cannot be undone.`)
		) {
			return;
		}

		setIsPending(true);
		try {
			const result = await deleteAlertAction(alert.id);
			if (!result.success) throw new Error(result.error);

			toast.success("Alert deleted");
			onOpenChange(false);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to delete alert",
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleTestEmail = async () => {
		if (isPending) return;
		setIsPending(true);
		try {
			const result = await sendTestAlertEmailAction(alert.id);
			if (!result.success) throw new Error(result.error);

			toast.success("Test alert email sent", {
				description: "Check the inbox for your signed-in account.",
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to send test email",
			);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="alert-dialog max-w-lg! p-5">
				<DialogHeader>
					<DialogTitle className="alert-title">{alert.name}</DialogTitle>
					<DialogDescription className="text-gray-400">
						{alert.instrument.name} · {alert.instrument.displaySymbol}
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-600 bg-gray-700/60 p-3 text-sm">
					<div>
						<p className="text-xs uppercase tracking-wide text-gray-500">
							Status
						</p>
						<p className="mt-1 capitalize text-gray-100">
							{alert.status === "active" ? "Active" : alert.status}
						</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-gray-500">
							Asset
						</p>
						<p className="mt-1 capitalize text-gray-100">
							{alert.instrument.assetClass}
						</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-gray-500">
							Currency
						</p>
						<p className="mt-1 text-gray-100">
							{alert.instrument.quoteCurrency}
						</p>
					</div>
					<div>
						<p className="text-xs uppercase tracking-wide text-gray-500">
							Created
						</p>
						<p className="mt-1 text-gray-100">
							{new Intl.DateTimeFormat("en-US", {
								dateStyle: "medium",
								timeZone: "UTC",
							}).format(new Date(alert.createdAt))}
						</p>
					</div>
				</div>

				<form className="space-y-4" onSubmit={handleSave}>
					{process.env.NODE_ENV === "development" ? (
						<div className="rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5 p-3">
							<p className="text-sm font-medium text-yellow-400">
								Development email test
							</p>
							<p className="mt-1 text-xs leading-relaxed text-gray-400">
								Send a synthetic alert through the real outbox and Nodemailer
								pipeline. This will not trigger or modify the alert.
							</p>
							<Button
								type="button"
								variant="outline"
								className="mt-3"
								onClick={handleTestEmail}
								disabled={isPending}
							>
								{isPending ? (
									<Loader2 className="animate-spin" aria-hidden="true" />
								) : (
									<MailCheck aria-hidden="true" />
								)}
								Send test email
							</Button>
						</div>
					) : null}
					<div className="space-y-2">
						<Label htmlFor="edit-alert-name">Alert name</Label>
						<Input
							id="edit-alert-name"
							className={controlClass}
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={80}
							required
							disabled={isPending}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="edit-alert-condition">Condition</Label>
							<Select
								value={operator}
								onValueChange={(value) =>
									setOperator(value as AlertOperator)
								}
								disabled={isPending}
							>
								<SelectTrigger
									id="edit-alert-condition"
									className={controlClass}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent
									position="popper"
									className="border-gray-600 bg-gray-800 text-white"
								>
									<SelectItem
										value="crosses_above"
										className="focus:bg-gray-600 focus:text-white"
									>
										Crosses above
									</SelectItem>
									<SelectItem
										value="crosses_below"
										className="focus:bg-gray-600 focus:text-white"
									>
										Crosses below
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-alert-threshold">
								Target ({alert.instrument.quoteCurrency})
							</Label>
							<Input
								id="edit-alert-threshold"
								className={controlClass}
								type="number"
								inputMode="decimal"
								min="0"
								step="any"
								value={threshold}
								onChange={(event) => setThreshold(event.target.value)}
								required
								disabled={isPending}
							/>
						</div>
					</div>

					<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-600 bg-gray-700/40 p-3">
						<input
							type="checkbox"
							checked={emailEnabled}
							onChange={(event) => setEmailEnabled(event.target.checked)}
							disabled={isPending}
							className="size-4 accent-yellow-500"
						/>
						<span className="text-sm text-gray-100">Email notification</span>
					</label>

					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-600 pt-4">
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={handleStatusChange}
								disabled={isPending || alert.status === "triggered"}
							>
								{alert.status === "active" ? (
									<Pause aria-hidden="true" />
								) : (
									<Play aria-hidden="true" />
								)}
								{alert.status === "active" ? "Pause" : "Resume"}
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={handleDelete}
								disabled={isPending}
							>
								<Trash2 aria-hidden="true" />
								Delete
							</Button>
						</div>
						<Button
							type="submit"
							className="bg-yellow-500 text-gray-900 hover:bg-yellow-400"
							disabled={isPending}
						>
							{isPending ? (
								<Loader2 className="animate-spin" aria-hidden="true" />
							) : null}
							Save changes
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
