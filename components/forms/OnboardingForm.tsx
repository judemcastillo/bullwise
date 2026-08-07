"use client";

import { CountrySelectField } from "@/components/forms/CountrySelectField";
import MultiSelectField from "@/components/forms/MultiSelectField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import {
	completeOnboarding,
	saveOnboardingProgress,
} from "@/lib/actions/onboarding.actions";
import {
	INVESTMENT_EXPERIENCE_OPTIONS,
	INVESTMENT_GOALS,
	PREFERRED_INDUSTRIES,
	PREFERRED_MARKETS,
	RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";
import {
	MAX_ONBOARDING_SELECTIONS,
	ONBOARDING_TOTAL_STEPS,
} from "@/lib/onboarding/service";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import { toast } from "sonner";

const defaultValues: OnboardingFormData = {
	country: "US",
	investmentExperience: "Beginner",
	investmentGoals: "Growth",
	riskTolerance: "Medium",
	preferredMarkets: ["US Stocks"],
	preferredIndustries: ["Technology"],
};

const stepFields: Record<number, FieldPath<OnboardingFormData>[]> = {
	1: ["country", "investmentExperience"],
	2: ["investmentGoals", "riskTolerance"],
	3: ["preferredMarkets", "preferredIndustries"],
};

const stepLabels = ["Basics", "Strategy", "Interests"];

export default function OnboardingForm({
	initialValues = defaultValues,
	initialStep = 1,
}: {
	initialValues?: OnboardingFormData;
	initialStep?: number;
}) {
	const [step, setStep] = useState(
		Math.min(Math.max(initialStep, 1), ONBOARDING_TOTAL_STEPS),
	);
	const [isSavingStep, setIsSavingStep] = useState(false);
	const {
		control,
		getValues,
		handleSubmit,
		trigger,
		formState: { errors, isSubmitting },
	} = useForm<OnboardingFormData>({
		defaultValues: initialValues,
		mode: "onBlur",
	});

	const nextStep = async () => {
		const valid = await trigger(stepFields[step]);
		if (!valid) return;

		setIsSavingStep(true);
		try {
			const result = await saveOnboardingProgress({
				step,
				formData: getValues(),
			});

			if (!result.success) {
				toast.error("Unable to save your progress", {
					description: result.error,
				});
				return;
			}

			setStep((currentStep) =>
				Math.min(currentStep + 1, ONBOARDING_TOTAL_STEPS),
			);
		} finally {
			setIsSavingStep(false);
		}
	};

	const onSubmit = async (data: OnboardingFormData) => {
		const result = await completeOnboarding(data);

		if (!result.success) {
			toast.error("Unable to finish onboarding", {
				description: result.error,
			});
			return;
		}

		toast.success("Your preferences have been saved");
		window.location.replace("/");
	};

	return (
		<form
			onSubmit={(event) => event.preventDefault()}
			className="space-y-6"
		>
			<div>
				<div className="mb-3 flex items-center justify-between text-xs font-medium text-gray-500">
					<span>
						Step {step} of {ONBOARDING_TOTAL_STEPS}
					</span>
					<span>{stepLabels[step - 1]}</span>
				</div>
				<div className="grid grid-cols-3 gap-2" aria-label="Onboarding progress">
					{stepLabels.map((label, index) => (
						<div
							key={label}
							className={`h-1.5 rounded-full ${index < step ? "bg-yellow-500" : "bg-gray-600"}`}
						/>
					))}
				</div>
			</div>

			{step === 1 ? (
				<div className="space-y-5">
					<CountrySelectField<OnboardingFormData>
						name="country"
						label="Country"
						control={control}
						error={errors.country}
						required
					/>
					<SelectField
						name="investmentExperience"
						label="Investment Experience"
						placeholder="Select your experience"
						options={INVESTMENT_EXPERIENCE_OPTIONS}
						control={control}
						error={errors.investmentExperience}
						required
					/>
				</div>
			) : null}

			{step === 2 ? (
				<div className="grid gap-5 sm:grid-cols-2">
					<SelectField
						name="investmentGoals"
						label="Investment Goal"
						placeholder="Select your investment goal"
						options={INVESTMENT_GOALS}
						control={control}
						error={errors.investmentGoals}
						required
					/>
					<SelectField
						name="riskTolerance"
						label="Risk Tolerance"
						placeholder="Select your risk level"
						options={RISK_TOLERANCE_OPTIONS}
						control={control}
						error={errors.riskTolerance}
						required
					/>
				</div>
			) : null}

			{step === 3 ? (
				<div className="space-y-6">
					<MultiSelectField<OnboardingFormData>
						name="preferredMarkets"
						label="Preferred Markets"
						description={`Choose up to ${MAX_ONBOARDING_SELECTIONS} markets.`}
						options={PREFERRED_MARKETS}
						control={control}
						error={errors.preferredMarkets}
						maxSelections={MAX_ONBOARDING_SELECTIONS}
					/>
					<MultiSelectField<OnboardingFormData>
						name="preferredIndustries"
						label="Preferred Industries"
						description={`Choose up to ${MAX_ONBOARDING_SELECTIONS} industries.`}
						options={PREFERRED_INDUSTRIES}
						control={control}
						error={errors.preferredIndustries}
						maxSelections={MAX_ONBOARDING_SELECTIONS}
					/>
				</div>
			) : null}

			<div className="flex gap-3 pt-2">
				{step > 1 ? (
					<Button
						type="button"
						variant="outline"
						disabled={isSubmitting || isSavingStep}
						onClick={() => setStep((currentStep) => currentStep - 1)}
						className="h-12 flex-1 border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
					>
						Back
					</Button>
				) : null}

				{step < ONBOARDING_TOTAL_STEPS ? (
					<Button
						type="button"
						disabled={isSavingStep}
						onClick={nextStep}
						className="yellow-btn flex-1"
					>
						{isSavingStep ? "Saving..." : "Continue"}
					</Button>
				) : (
					<Button
						type="button"
						disabled={isSubmitting}
						aria-busy={isSubmitting}
						onClick={() => void handleSubmit(onSubmit)()}
						className="yellow-btn flex-1"
					>
						{isSubmitting ? "Saving preferences..." : "Finish setup"}
					</Button>
				)}
			</div>
		</form>
	);
}
