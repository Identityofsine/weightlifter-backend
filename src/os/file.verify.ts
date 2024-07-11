export function isPNG(b64: string) {
	return b64.startsWith('data:image/png;base64,');
}

export function isJPG(b64: string) {
	return b64.startsWith('data:image/jpeg;base64,');
}

export function isJPEG(b64: string) {
	return b64.startsWith('data:image/jpeg;base64,');
}
