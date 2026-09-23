const toUtcMidnight = (date: Date) =>
	new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);

export const monthKey = (date: Date) =>
	`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export interface IMonthPeriod {
	periodStart: Date;
	periodEnd: Date;
}

export const monthPeriodsBetween = (
	startDate: Date,
	endDate: Date,
): IMonthPeriod[] => {
	let cursor = new Date(
		Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
	);
	const upper = toUtcMidnight(endDate);

	const periods: IMonthPeriod[] = [];
	while (cursor <= upper) {
		const year = cursor.getUTCFullYear();
		const month = cursor.getUTCMonth();
		periods.push({
			periodStart: new Date(Date.UTC(year, month, 1)),
			periodEnd: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
		});
		cursor = new Date(Date.UTC(year, month + 1, 1));
	}
	return periods;
};

export const normalizeToFirstOfMonth = (date: Date) =>
	new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
