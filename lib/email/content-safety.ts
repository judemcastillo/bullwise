import sanitizeHtml from "sanitize-html";

const MAX_WELCOME_HTML_LENGTH = 12_000;
const MAX_MARKET_NEWS_HTML_LENGTH = 120_000;

const PARAGRAPH_ATTRIBUTES = {
	class: "mobile-text dark-text-secondary",
	style:
		"margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;",
};

const stripMarkdownFence = (value: string) =>
	value
		.trim()
		.replace(/^```(?:html)?\s*/i, "")
		.replace(/\s*```$/, "")
		.trim();

const controlledTag = (
	tagName: string,
	attribs: Record<string, string> = {},
) => ({ tagName, attribs });

const parseSafeHttpUrl = (value: string) => {
	if (/[\u0000-\u001f\u007f]/.test(value)) return null;

	try {
		const url = new URL(value);
		if (
			(url.protocol === "http:" || url.protocol === "https:") &&
			Boolean(url.hostname) &&
			!url.username &&
			!url.password
		) {
			return url;
		}

		return null;
	} catch {
		return null;
	}
};

export function requireSafeEmailUrl(value: string): string {
	const url = parseSafeHttpUrl(value);
	if (!url) {
		throw new Error("Email URLs must use an absolute HTTP or HTTPS URL");
	}

	return url.toString();
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function sanitizeEmailHeader(value: string): string {
	return value
		.replace(/[\u0000-\u001f\u007f]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

const sharedOptions: sanitizeHtml.IOptions = {
	allowedSchemes: ["http", "https"],
	allowedSchemesAppliedToAttributes: ["href"],
	allowProtocolRelative: false,
	disallowedTagsMode: "discard",
	enforceHtmlBoundary: false,
	nestingLimit: 20,
	nonTextTags: ["script", "style", "textarea", "option", "iframe", "object"],
};

const withParagraphFallback = (html: string, fallbackText: string) => {
	const normalized = html.trim();
	if (!normalized) {
		return `<p class="${PARAGRAPH_ATTRIBUTES.class}" style="${PARAGRAPH_ATTRIBUTES.style}">${escapeHtml(fallbackText)}</p>`;
	}
	if (!/<[a-z][^>]*>/i.test(normalized)) {
		return `<p class="${PARAGRAPH_ATTRIBUTES.class}" style="${PARAGRAPH_ATTRIBUTES.style}">${normalized}</p>`;
	}

	return normalized;
};

export function sanitizeGeneratedWelcomeHtml(value: string): string {
	const candidate = stripMarkdownFence(value).slice(0, MAX_WELCOME_HTML_LENGTH);
	const sanitized = sanitizeHtml(candidate, {
		...sharedOptions,
		allowedTags: ["p", "strong", "em", "br"],
		allowedAttributes: {
			p: ["class", "style"],
			strong: ["style"],
			em: ["style"],
		},
		transformTags: {
			p: () => controlledTag("p", PARAGRAPH_ATTRIBUTES),
			strong: () =>
				controlledTag("strong", {
					style: "color: #FDD458; font-weight: 700;",
				}),
			em: () => controlledTag("em"),
			br: () => controlledTag("br"),
		},
	});

	return withParagraphFallback(
		sanitized,
		"Thanks for joining Bull Wise. Your market toolkit is ready.",
	);
}

export function sanitizeGeneratedMarketNewsHtml(value: string): string {
	const candidate = stripMarkdownFence(value).slice(
		0,
		MAX_MARKET_NEWS_HTML_LENGTH,
	);
	const sanitized = sanitizeHtml(candidate, {
		...sharedOptions,
		allowedTags: [
			"p",
			"h3",
			"h4",
			"strong",
			"em",
			"ul",
			"li",
			"div",
			"span",
			"a",
			"br",
		],
		allowedAttributes: {
			p: ["class", "style"],
			h3: ["class", "style"],
			h4: ["class", "style"],
			strong: ["style"],
			em: ["style"],
			ul: ["style"],
			li: ["class", "style"],
			div: ["class", "style"],
			span: ["style"],
			a: ["href", "target", "rel", "style"],
		},
		transformTags: {
			p: () => controlledTag("p", PARAGRAPH_ATTRIBUTES),
			h3: () =>
				controlledTag("h3", {
					class: "mobile-news-title dark-text",
					style:
						"margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #F8F9FA; line-height: 1.3;",
				}),
			h4: () =>
				controlledTag("h4", {
					class: "dark-text",
					style:
						"margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #FFFFFF; line-height: 1.4;",
				}),
			strong: () =>
				controlledTag("strong", {
					style: "color: #FDD458; font-weight: 700;",
				}),
			em: () => controlledTag("em"),
			ul: () =>
				controlledTag("ul", {
					style:
						"margin: 16px 0 20px 0; padding-left: 20px; color: #CCDADC;",
				}),
			li: () =>
				controlledTag("li", {
					class: "dark-text-secondary",
					style:
						"margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;",
				}),
			div: (_tagName, attribs) =>
				attribs.class?.split(/\s+/).includes("dark-info-box")
					? controlledTag("div", {
							class: "dark-info-box",
							style:
								"background-color: #212328; padding: 24px; margin: 20px 0; border-radius: 8px;",
						})
					: controlledTag("div", {
							style: "margin: 16px 0;",
						}),
			span: () =>
				controlledTag("span", {
					style: "color: #FDD458; font-weight: 700;",
				}),
			a: (_tagName, attribs) => {
				const url = attribs.href ? parseSafeHttpUrl(attribs.href) : null;
				return url
					? controlledTag("a", {
							href: url.toString(),
							target: "_blank",
							rel: "noopener noreferrer",
							style:
								"color: #FDD458; text-decoration: underline; font-weight: 500;",
						})
					: controlledTag("span", {
							style: "color: #FDD458; font-weight: 500;",
						});
			},
			br: () => controlledTag("br"),
		},
	});

	return withParagraphFallback(
		sanitized,
		"No market news was available for this summary.",
	);
}
