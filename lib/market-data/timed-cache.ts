export class TimedCache<T> {
	private readonly entries = new Map<
		string,
		{ expiresAt: number; value: Promise<T> }
	>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries = 500,
	) {}

	getOrCreate(key: string, load: () => Promise<T>) {
		const now = Date.now();
		const existing = this.entries.get(key);
		if (existing && existing.expiresAt > now) return existing.value;
		if (existing) this.entries.delete(key);

		const value = load().catch((error) => {
			this.entries.delete(key);
			throw error;
		});
		this.entries.set(key, { expiresAt: now + this.ttlMs, value });

		while (this.entries.size > this.maxEntries) {
			const oldestKey = this.entries.keys().next().value;
			if (oldestKey === undefined) break;
			this.entries.delete(oldestKey);
		}

		return value;
	}
}
