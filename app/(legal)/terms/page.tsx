import type { Metadata } from "next";

import LegalDocument from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
	title: "Terms of Use | Bull Wise",
	description: "Terms of Use for Bull Wise.",
};

const sections = [
	{
		title: "Using Bull Wise",
		paragraphs: [
			"You may use Bull Wise only in accordance with these terms and applicable law. You must provide accurate account information and be old enough to enter into this agreement where you live.",
		],
	},
	{
		title: "Your account",
		paragraphs: [
			"You are responsible for keeping your credentials secure and for activity performed through your account. Notify the service operator promptly if you believe your account has been compromised.",
		],
	},
	{
		title: "Market information is not financial advice",
		paragraphs: [
			"Bull Wise provides educational tools, market data, news, and automated insights. Nothing in the service is personalized investment, legal, tax, or accounting advice, and no result guarantees future performance. You remain responsible for your investment decisions and should consult a qualified professional when appropriate.",
		],
	},
	{
		title: "Acceptable use",
		items: [
			"Do not misuse, disrupt, probe, or attempt to bypass the service's security controls.",
			"Do not use the service to violate law, infringe another person's rights, or distribute harmful material.",
			"Do not scrape, resell, or redistribute data where doing so would violate provider terms or applicable law.",
		],
	},
	{
		title: "Third-party services and data",
		paragraphs: [
			"Some features depend on third-party identity, market-data, email, infrastructure, and AI providers. Their availability and accuracy are outside Bull Wise's direct control, and their own terms may also apply.",
		],
	},
	{
		title: "Availability and changes",
		paragraphs: [
			"The service may change, experience interruptions, or discontinue features. These terms may also be updated as the product and legal requirements evolve. Material changes will be communicated through an appropriate product or account notice.",
		],
	},
	{
		title: "Ending use",
		paragraphs: [
			"You may stop using Bull Wise at any time. Access may be limited or terminated when necessary to protect the service, comply with law, or respond to a material violation of these terms.",
		],
	},
];

export default function TermsPage() {
	return (
		<LegalDocument
			title="Terms of Use"
			description="These terms explain the basic rules that apply when you create an account or use Bull Wise."
			sections={sections}
		/>
	);
}
