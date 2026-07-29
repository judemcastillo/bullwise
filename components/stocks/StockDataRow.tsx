import { cn } from "@/lib/utils";

type StockDataRowProps = {
	label: string;
	value: string;
	tone?: "positive" | "negative";
};

export default function StockDataRow({
	label,
	value,
	tone,
}: StockDataRowProps) {
	return (
		<div className="flex items-center justify-between gap-4 text-sm">
			<span className="text-gray-500">{label}</span>
			<span
				className={cn(
					"font-medium text-gray-100",
					tone === "positive" && "text-teal-400",
					tone === "negative" && "text-red-500",
				)}
			>
				{value}
			</span>
		</div>
	);
}
