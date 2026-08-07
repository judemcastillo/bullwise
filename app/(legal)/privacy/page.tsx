import { permanentRedirect } from "next/navigation";

export default function PrivacyPage() {
	permanentRedirect("/terms#privacy-policy");
}
