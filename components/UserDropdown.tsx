"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useRouter } from "next/navigation";
import NavItems from "./NavItems";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "@/lib/actions/auth.actions";

export default function UserDropdown({
	user,
	onOpenSearch,
}: {
	user: User;
	onOpenSearch: () => void;
}) {
	const router = useRouter();
	const avatarUrl = user.image?.trim();

	const handleSignOut: () => Promise<void> = async () => {
		await signOut();
		router.push("/sign-in");
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="flex items-center gap-3 text-gray-400 hover:text-yellow-500 h-auto px-0! rounded-full py-0! cursor-pointer border-2 hover:border-yellow-500 "
				>
					<Avatar className="h-8 w-8">
						{avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
						<AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
							{user.name[0]}
						</AvatarFallback>
					</Avatar>
					{/* <div className="hidden md:flex flex-col items-start">
						<span className="text-base font-medium text-gray-400">
							{user.name}
						</span>
					</div> */}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="text-gray-400 w-full">
				<DropdownMenuLabel>
					<div className="flex relative items-center gap-3 py-2">
						<Avatar className="h-10 w-10">
							{avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
							<AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
								{user.name[0]}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="text-base font-medium text-gray-400">
								{user.name}
							</span>
							<span className="text-sm text-gray-500">{user.email}</span>
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="bg-gray-600" />
				<DropdownMenuItem
					onClick={() => router.push("/settings/preferences")}
					className="cursor-pointer text-md font-medium text-gray-100 transition-colors focus:bg-transparent focus:text-yellow-500"
				>
					<Settings className="mr-2 hidden h-4 w-4 sm:block" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-gray-600" />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-gray-100 text-md font-medium focus:bg-transparent focus:text-yellow-500 transition-colors cursor-pointer"
				>
					<LogOut className="h-4 w-4 mr-2 hidden sm:block" />
					Logout
				</DropdownMenuItem>
				<DropdownMenuSeparator className="hidden sm:block bg-gray-600" />
				<nav className="sm:hidden">
					<NavItems onOpenSearch={onOpenSearch} />
				</nav>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
