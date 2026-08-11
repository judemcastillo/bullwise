import Image from "next/image";
import Link from "next/link";

type LegalSection = {
	id?: string;
	title: string;
	paragraphs?: string[];
	items?: string[];
};

type LegalDocumentProps = {
	title: string;
	description: string;
	sections: LegalSection[];
};

export default function LegalDocument({
	title,
	description,
	sections,
}: LegalDocumentProps) {
	return (
		<main className="min-h-screen bg-gray-950 px-5 py-10 text-gray-100 sm:px-8 sm:py-14">
			<div className="mx-auto max-w-3xl">
				<Link
					href="/sign-up"
					className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-400"
					aria-label="Return to sign up"
				>
					<Image
						src="/assets/icons/logo.svg"
						alt="Bull Wise"
						width={260}
						height={60}
						loading="eager"
						className="h-9 w-auto"
					/>
				</Link>

				<article className="mt-10 rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/20 sm:p-10">
					<p className="text-sm font-semibold uppercase tracking-[0.16em] text-yellow-400">
						Bull Wise
					</p>
					<h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
						{title}
					</h1>
					<p className="mt-3 text-sm text-gray-400">Last updated August 7, 2026</p>
					<p className="mt-6 leading-7 text-gray-300">{description}</p>

					<div className="mt-10 space-y-9">
						{sections.map((section) => (
							<section
								key={section.title}
								id={section.id}
								className="scroll-mt-8"
							>
								<h2 className="text-xl font-semibold text-white">
									{section.title}
								</h2>
								{section.paragraphs?.map((paragraph) => (
									<p
										key={paragraph}
										className="mt-3 leading-7 text-gray-300"
									>
										{paragraph}
									</p>
								))}
								{section.items && (
									<ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-gray-300 marker:text-yellow-400">
										{section.items.map((item) => (
											<li key={item}>{item}</li>
										))}
									</ul>
								)}
							</section>
						))}
					</div>
				</article>
			</div>
		</main>
	);
}
