"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsTabs = [
	{ label: "Account", href: null },
	{ label: "Preferences", href: "/settings/preferences" },
	{ label: "Security", href: null },
	{ label: "Notifications", href: null },
] as const;

export default function SettingsNavigation() {
	const pathname = usePathname();

	return (
		<nav
			aria-label="Settings sections"
			className="overflow-x-auto border-b border-gray-600"
		>
			<ul className="flex min-w-max gap-1 pb-4 pt-4">
				{settingsTabs.map((tab) => {
					const active = tab.href ? pathname.startsWith(tab.href) : false;
					const classes = `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
						active
							? "bg-gray-700 text-yellow-400"
							: tab.href
								? "text-gray-400 hover:bg-gray-800 hover:text-white"
								: "cursor-not-allowed text-gray-500"
					}`;

					return (
						<li key={tab.label}>
							{tab.href ? (
								<Link href={tab.href} className={classes}>
									{tab.label}
								</Link>
							) : (
								<span
									className={classes}
									aria-disabled="true"
									title="Coming soon"
								>
									{tab.label}
								</span>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
