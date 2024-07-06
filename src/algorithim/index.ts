export function randomizeString(length: number = 6): string {
	//This function generates a random string of a given length
	return Math.random().toString(36).substring(2, 2 + length);
}

export function randomizeNumber(length: number = 16): number {
	//This function generates a random number of a given length
	return Math.floor(Math.random() * (10 ** length));
}

export function formatToMySQLTime(date: Date) {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

export function formatToMySQLDateTime(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function mysqlDatetimeToDate(datetimeString: string): Date | null {
	// Check if the input is in MySQL datetime format ('YYYY-MM-DD HH:MM:SS')
	const mysqlDatetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

	// Check if the input is in ISO 8601 datetime format ('YYYY-MM-DDTHH:MM:SS.fffZ')
	const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

	let dateObject: Date | null = null;

	if (mysqlDatetimeRegex.test(datetimeString)) {
		// MySQL datetime format ('YYYY-MM-DD HH:MM:SS')
		const parts = datetimeString.split(' ');
		const datePart = parts[0];
		const timePart = parts[1];

		const dateParts = datePart.split('-');
		const year = parseInt(dateParts[0], 10);
		const month = parseInt(dateParts[1], 10) - 1; // Months are 0-indexed in JavaScript
		const day = parseInt(dateParts[2], 10);

		const timeParts = timePart.split(':');
		const hours = parseInt(timeParts[0], 10);
		const minutes = parseInt(timeParts[1], 10);
		const seconds = parseInt(timeParts[2], 10);

		dateObject = new Date(year, month, day, hours, minutes, seconds);
	} else if (isoDatetimeRegex.test(datetimeString)) {
		// ISO 8601 datetime format ('YYYY-MM-DDTHH:MM:SS.fffZ')
		dateObject = new Date(datetimeString);
	} else {
	}

	return dateObject;
}
