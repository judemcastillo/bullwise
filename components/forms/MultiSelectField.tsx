"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
	type Control,
	Controller,
	type FieldPathByValue,
	type FieldValues,
} from "react-hook-form";

export default function MultiSelectField<TFieldValues extends FieldValues>({
	name,
	label,
	description,
	options,
	control,
	error,
	maxSelections,
}: {
	name: FieldPathByValue<TFieldValues, string[]>;
	label: string;
	description: string;
	options: readonly Option[];
	control: Control<TFieldValues>;
	error?: { message?: string };
	maxSelections: number;
}) {
	return (
		<div className="space-y-3">
			<div className="flex items-end justify-between gap-4">
				<div>
					<Label className="form-label">{label}</Label>
					<p className="mt-1 text-xs text-gray-500">{description}</p>
				</div>
			</div>

			<Controller
				name={name}
				control={control}
				rules={{
					validate: (value: string[]) =>
						(value.length >= 1 && value.length <= maxSelections) ||
						`Select between 1 and ${maxSelections} options`,
				}}
				render={({ field }) => (
					<div className="grid gap-3 sm:grid-cols-2">
						{options.map((option) => {
							const selected = field.value.includes(option.value);
							const atLimit =
								!selected && field.value.length >= maxSelections;

							return (
								<Button
									key={option.value}
									type="button"
									variant="outline"
									role="checkbox"
									aria-checked={selected}
									disabled={atLimit}
									onClick={() => {
										field.onChange(
											selected
												? field.value.filter(
														(value: string) => value !== option.value,
													)
												: [...field.value, option.value],
										);
									}}
									className={cn(
										"h-12 justify-start border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white",
										selected &&
											"border-yellow-500 bg-yellow-400/10 text-white hover:bg-yellow-400/15",
									)}
								>
									<span
										className={cn(
											"mr-2 flex size-5 items-center justify-center rounded border border-gray-500",
											selected && "border-yellow-500 bg-yellow-500 text-gray-950",
										)}
									>
										{selected ? <Check className="size-3.5" /> : null}
									</span>
									{option.label}
								</Button>
							);
						})}
					</div>
				)}
			/>
			{error ? <p className="text-sm text-red-500">{error.message}</p> : null}
		</div>
	);
}
