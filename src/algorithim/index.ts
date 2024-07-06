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

export function mysqlDatetimeToDate(mysqlDatetime: string): Date | null {
	// MySQL datetime format: 'YYYY-MM-DD HH:MM:SS' (e.g., '2024-07-05 15:30:00')

	// Check if the input is a valid datetime string
	const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
	if (!datetimeRegex.test(mysqlDatetime)) {
		console.error("Invalid MySQL datetime format");
		return null;
	}

	// Split datetime string into date and time parts
	const parts = mysqlDatetime.split(' ');
	const datePart = parts[0];
	const timePart = parts[1];

	// Split date part into year, month, and day
	const dateParts = datePart.split('-');
	const year = parseInt(dateParts[0], 10);
	const month = parseInt(dateParts[1], 10) - 1; // Months are 0-indexed in JavaScript
	const day = parseInt(dateParts[2], 10);

	// Split time part into hours, minutes, and seconds
	const timeParts = timePart.split(':');
	const hours = parseInt(timeParts[0], 10);
	const minutes = parseInt(timeParts[1], 10);
	const seconds = parseInt(timeParts[2], 10);

	// Create a new Date object
	const dateObject = new Date(year, month, day, hours, minutes, seconds);

	return dateObject;
}
