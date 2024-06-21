export function randomizeString(length: number = 6): string {
	//This function generates a random string of a given length
	return Math.random().toString(36).substring(2, 2 + length);
}

export function randomizeNumber(length: number = 16): number {
	//This function generates a random number of a given length
	return Math.floor(Math.random() * (10 ** length));
}
