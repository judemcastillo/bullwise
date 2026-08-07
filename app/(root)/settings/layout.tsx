import SettingsNavigation from "@/components/settings/SettingsNavigation";

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<section className="mx-auto w-full max-w-5xl">
			<h1 className="mb-5 text-3xl font-bold text-white">Settings</h1>
			<SettingsNavigation />
			{children}
		</section>
	);
}
