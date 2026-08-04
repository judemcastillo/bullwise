"use client";

import { useState } from "react";
import NavItems from "./NavItems";
import SearchCommand from "./SearchCommand";
import UserDropdown from "./UserDropdown";

export default function HeaderNavigation({
	user,
}: {
	user: User;
}) {
	const [searchOpen, setSearchOpen] = useState(false);
	const openSearch = () => setSearchOpen(true);

	return (
		<>
			<nav className="hidden sm:block">
				<NavItems onOpenSearch={openSearch} />
			</nav>
			<UserDropdown
				user={user}
				onOpenSearch={openSearch}
			/>
			<SearchCommand
				open={searchOpen}
				setOpen={setSearchOpen}
			/>
		</>
	);
}
