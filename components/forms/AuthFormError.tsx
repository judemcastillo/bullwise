import { CircleAlert } from "lucide-react";

export default function AuthFormError({ message }: { message: string | null }) {
	if (!message) return null;

	return (
		<div
			role="alert"
			aria-live="polite"
			className="flex gap-2.5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm leading-5 text-gray-300"
		>
			<CircleAlert
				className="mt-0.5 size-4 shrink-0 text-red-500"
				aria-hidden="true"
			/>
			<p>{message}</p>
		</div>
	);
}
