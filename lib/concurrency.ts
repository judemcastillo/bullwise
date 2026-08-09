export async function mapWithConcurrency<T, Result>(
	items: readonly T[],
	maxConcurrency: number,
	mapper: (item: T, index: number) => Promise<Result>,
): Promise<Result[]> {
	if (items.length === 0) return [];

	const normalizedConcurrency = Number.isFinite(maxConcurrency)
		? Math.floor(maxConcurrency)
		: 1;
	const workerCount = Math.min(
		items.length,
		Math.max(1, normalizedConcurrency),
	);
	const results = new Array<Result>(items.length);
	let nextIndex = 0;

	const worker = async () => {
		while (nextIndex < items.length) {
			const currentIndex = nextIndex;
			nextIndex += 1;
			results[currentIndex] = await mapper(items[currentIndex], currentIndex);
		}
	};

	await Promise.all(Array.from({ length: workerCount }, () => worker()));
	return results;
}
