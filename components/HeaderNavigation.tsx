"use client";

import { useState } from "react";
import NavItems from "./NavItems";
import SearchCommand from "./SearchCommand";
import UserDropdown from "./UserDropdown";
import NotificationBell from "./notifications/NotificationBell";

export default function HeaderNavigation({ user }: { user: User }) {
	const [searchOpen, setSearchOpen] = useState(false);
	const openSearch = () => setSearchOpen(true);

	return (
		<>
			<nav className="hidden sm:block">
				<NavItems onOpenSearch={openSearch} />
			</nav>
			<div className="flex shrink-0 items-center gap-3">
				<NotificationBell />
				<UserDropdown user={user} onOpenSearch={openSearch} />
			</div>
			<SearchCommand open={searchOpen} setOpen={setSearchOpen} />
		</>
	);
}
