"use client";

import { CountrySelectField } from "@/components/forms/CountrySelectField";
import MultiSelectField from "@/components/forms/MultiSelectField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/actions/onboarding.actions";
import {
	INVESTMENT_EXPERIENCE_OPTIONS,
	INVESTMENT_GOALS,
	PREFERRED_INDUSTRIES,
	PREFERRED_MARKETS,
	RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";
import { MAX_ONBOARDING_SELECTIONS } from "@/lib/onboarding/service";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

function SettingsRow({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-5 border-b border-gray-600 py-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-10">
			<div>
				<h3 className="font-semibold text-white">{title}</h3>
				<p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
			</div>
			<div>{children}</div>
		</div>
	);
}

export default function PreferencesForm({
	initialValues,
}: {
	initialValues: OnboardingFormData;
}) {
	const router = useRouter();
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty, isSubmitting },
	} = useForm<OnboardingFormData>({
		defaultValues: initialValues,
		mode: "onBlur",
	});

	const savePreferences = async (data: OnboardingFormData) => {
		const result = await completeOnboarding(data);

		if (!result.success) {
			toast.error("Unable to save your preferences", {
				description: result.error,
			});
			return;
		}

		reset(data);
		toast.success("Your preferences have been saved");
		router.refresh();
	};

	return (
		<form onSubmit={(event) => event.preventDefault()}>
			<div className="border-b border-gray-600 py-7">
				<h2 className="text-xl font-bold text-white">Investment preferences</h2>
				<p className="mt-1 text-sm leading-6 text-gray-500">
					Choose how Bull Wise personalizes market news and insights.
				</p>
			</div>

			<SettingsRow
				title="Country"
				description="Used to prioritize relevant markets, currencies, and news."
			>
				<CountrySelectField<OnboardingFormData>
					name="country"
					label="Your country"
					control={control}
					error={errors.country}
					required
				/>
			</SettingsRow>

			<SettingsRow
				title="Experience"
				description="Helps us adjust the depth and terminology of your insights."
			>
				<SelectField
					name="investmentExperience"
					label="Investment experience"
					placeholder="Select your experience"
					options={INVESTMENT_EXPERIENCE_OPTIONS}
					control={control}
					error={errors.investmentExperience}
					required
				/>
			</SettingsRow>

			<SettingsRow
				title="Strategy"
				description="Set your primary investment goal and comfort with risk."
			>
				<div className="grid gap-5 sm:grid-cols-2">
					<SelectField
						name="investmentGoals"
						label="Investment goal"
						placeholder="Select your goal"
						options={INVESTMENT_GOALS}
						control={control}
						error={errors.investmentGoals}
						required
					/>
					<SelectField
						name="riskTolerance"
						label="Risk tolerance"
						placeholder="Select your risk level"
						options={RISK_TOLERANCE_OPTIONS}
						control={control}
						error={errors.riskTolerance}
						required
					/>
				</div>
			</SettingsRow>

			<SettingsRow
				title="Preferred markets"
				description="Select the markets you want to see most often."
			>
				<MultiSelectField<OnboardingFormData>
					name="preferredMarkets"
					label="Markets"
					description={`Choose up to ${MAX_ONBOARDING_SELECTIONS} markets.`}
					options={PREFERRED_MARKETS}
					control={control}
					error={errors.preferredMarkets}
					maxSelections={MAX_ONBOARDING_SELECTIONS}
				/>
			</SettingsRow>

			<SettingsRow
				title="Preferred industries"
				description="Choose the industries most relevant to your portfolio."
			>
				<MultiSelectField<OnboardingFormData>
					name="preferredIndustries"
					label="Industries"
					description={`Choose up to ${MAX_ONBOARDING_SELECTIONS} industries.`}
					options={PREFERRED_INDUSTRIES}
					control={control}
					error={errors.preferredIndustries}
					maxSelections={MAX_ONBOARDING_SELECTIONS}
				/>
			</SettingsRow>

			<div className="flex justify-end pt-6">
				<Button
					type="button"
					disabled={!isDirty || isSubmitting}
					aria-busy={isSubmitting}
					onClick={() => void handleSubmit(savePreferences)()}
					className="yellow-btn min-w-40 px-6"
				>
					{isSubmitting ? "Saving..." : "Save preferences"}
				</Button>
			</div>
		</form>
	);
}
