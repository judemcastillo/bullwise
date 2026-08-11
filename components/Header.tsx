import Image from "next/image";
import Link from "next/link";
import HeaderNavigation from "./HeaderNavigation";

export default function Header({ user }: { user: User }) {
	return (
		<header className="sticky top-0 header backdrop-blur-sm shadow-lg bg-slate-950/80 shadow-gray-800">
			<div className="container header-wrapper">
				<Link href="/">
					<Image
						src="/assets/icons/logo.svg"
						alt="Bull Wise Logo"
						width={260}
						height={60}
						loading="eager"
						className="h-8 w-auto cursor-pointer"
					/>
				</Link>
				<HeaderNavigation user={user} />
			</div>
		</header>
	);
}
