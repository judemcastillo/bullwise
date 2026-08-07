export default function AuthDivider({
	label = "or continue with email",
}: {
	label?: string;
}) {
	return (
		<div className="my-5 flex items-center gap-3" aria-hidden="true">
			<div className="h-px flex-1 bg-gray-600" />
			<span className="text-xs font-medium uppercase tracking-wider text-gray-500">
				{label}
			</span>
			<div className="h-px flex-1 bg-gray-600" />
		</div>
	);
}
