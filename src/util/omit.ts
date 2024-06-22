export interface Omit<T = any> {
	omit(): Partial<T>;
}

export function omit<T extends Record<string, any>>(value: T, ...keys: Array<keyof T>): T {
	const obj_keys = Object.keys(value);
	let obj = { ...value };
	obj_keys.forEach((v: string) => {
		keys.forEach((key) => {
			if (key in obj)
				delete obj[key];
		});
	})
	return obj;
}
