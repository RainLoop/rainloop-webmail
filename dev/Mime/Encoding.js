const
	QPDecodeParams = [/=([0-9A-F]{2})/g, (...args) => String.fromCharCode(parseInt(args[1], 16))];

export const
	// https://datatracker.ietf.org/doc/html/rfc2045#section-6.8
	BDecode = atob,

	// unescape(encodeURIComponent()) makes the UTF-16 DOMString to an UTF-8 string
	BEncode = data => btoa(unescape(encodeURIComponent(data))),
/* 	// Without deprecated 'unescape':
	BEncode = data => btoa(encodeURIComponent(data).replace(
		/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)
	)),
*/

	// https://datatracker.ietf.org/doc/html/rfc2045#section-6.7
	QPDecode = data => data.replace(/=\r?\n/g, '').replace(...QPDecodeParams),

	// https://datatracker.ietf.org/doc/html/rfc2047#section-4.1
	// https://datatracker.ietf.org/doc/html/rfc2047#section-4.2
	// encoded-word = "=?" charset "?" encoding "?" encoded-text "?="
	decodeEncodedWords = data =>
		data.replace(/=\?([^?]+)\?(B|Q)\?(.+?)\?=/g, (m, charset, encoding, text) =>
			decodeText(charset, 'B' == encoding ? BDecode(text) : QPDecode(text))
		)
	,

	decodeText = (charset, data) => {
		try {
			// https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings
			return new TextDecoder(charset).decode(Uint8Array.from(data, c => c.charCodeAt(0)));
		} catch (e) {
			console.error({charset:charset,error:e});
		}
	};
