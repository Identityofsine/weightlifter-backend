export default function nfc_hash() {
	return "".concat(Math.random().toString(36).substr(2, 9)).concat(Math.random().toString(36).substr(2, 9));
}
