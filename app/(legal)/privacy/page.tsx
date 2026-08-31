import type { Metadata } from "next";

import LegalDocument from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
	title: "Privacy Policy | Bull Wise",
	description: "Privacy Policy for Bull Wise.",
};

const sections = [
	{
		title: "Information we collect",
		items: [
			"Account details such as your name, email address, verification state, and authentication identifiers.",
			"Investment preferences and onboarding answers you choose to provide.",
			"Product activity such as watchlists, alerts, saved preferences, and feature interactions.",
			"Session, device, and technical information needed to secure and operate the service.",
		],
	},
	{
		title: "How information is used",
		items: [
			"Create, verify, authenticate, and protect your account.",
			"Provide and personalize product features, market information, and notifications.",
			"Diagnose problems, prevent abuse, and improve reliability and usability.",
			"Meet legal obligations and enforce product terms.",
		],
	},
	{
		title: "Service providers",
		paragraphs: [
			"Bull Wise relies on providers for services such as Google authentication, database hosting, email delivery, market data, background jobs, hosting, and AI-assisted features. Information is shared with them only as needed to provide those functions and remains subject to their applicable privacy and security terms.",
		],
	},
	{
		title: "Cookies and sessions",
		paragraphs: [
			"The service uses cookies or similar storage that is necessary to maintain secure sessions, remember relevant settings, and protect sign-in flows. Blocking required storage may prevent account features from working.",
		],
	},
	{
		title: "Retention",
		paragraphs: [
			"Information is retained while your account is active and as reasonably necessary to provide the service, maintain security, resolve disputes, and meet legal obligations. Retention periods may differ by data type and operational need.",
		],
	},
	{
		title: "Your choices",
		paragraphs: [
			"Bull Wise, the service operator, is the data controller responsible for personal information processed through the service. For privacy questions or requests, contact bullwise.business@gmail.com.",
			"You can update supported profile and preference data from your account settings. Depending on where you live, you may also have rights to request access, correction, deletion, or restriction of certain personal information, subject to applicable exceptions. To submit one of these requests outside your account settings, email bullwise.business@gmail.com with the subject “Privacy Rights Request,” state which right you want to exercise, and include the email address associated with your account. Bull Wise may ask for additional information to verify your identity before acting on the request.",
		],
	},
	{
		title: "Security and privacy changes",
		paragraphs: [
			"Reasonable technical and organizational safeguards are used to protect information, but no online system can guarantee absolute security. This notice may be updated as Bull Wise evolves; material changes will be communicated through an appropriate product or account notice.",
		],
	},
];

export default function PrivacyPage() {
	return (
		<LegalDocument
			title="Privacy Policy"
			description="This notice describes the information Bull Wise processes, why it is needed, and the choices available to account holders."
			sections={sections}
		/>
	);
}
