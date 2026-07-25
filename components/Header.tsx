import Image from "next/image";
import Link from "next/link";
import React from "react";
import NavItems from "./NavItems";
import UserDropdown from "./UserDropdown";
import { searchStocks } from "@/lib/actions/finnhub.actions";

export default async function Header({ user }: { user: User }) {
	const initialStocks = await searchStocks();
	return (
		<header className="sticky top-0 header backdrop-blur-sm shadow bg-slate-950/80">
			<div className="container header-wrapper">
				<Link href="/">
					<Image
						src="/assets/icons/logo.svg"
						alt="Bull Wise Logo"
						width={140}
						height={32}
						className="h-8 w-auto cursor-pointer"
					/>
				</Link>
				<nav className="hidden sm:block ">
					<NavItems initialStocks={initialStocks} />
				</nav>
				<UserDropdown user={user} initialStocks={initialStocks} />
			</div>
		</header>
	);
}
