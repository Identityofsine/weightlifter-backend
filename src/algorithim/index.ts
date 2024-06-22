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
