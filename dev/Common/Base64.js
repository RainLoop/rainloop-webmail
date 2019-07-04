// Base64 encode / decode
// http://www.webtoolkit.info/

const BASE_64_CHR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/* eslint-disable  */
const Base64 = {
	// public method for urlsafe encoding
	urlsafe_encode: (input) =>
		Base64.encode(input)
			.replace(/[+]/g, '-')
			.replace(/[\/]/g, '_')
			.replace(/[=]/g, ''),

	// public method for encoding
	encode: (input) => {
		let output = '',
			chr1,
			chr2,
			chr3,
			enc1,
			enc2,
			enc3,
			enc4,
			i = 0;

		input = Base64._utf8_encode(input);

		while (i < input.length) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output =
				output +
				BASE_64_CHR.charAt(enc1) +
				BASE_64_CHR.charAt(enc2) +
				BASE_64_CHR.charAt(enc3) +
				BASE_64_CHR.charAt(enc4);
		}

		return output;
	},

	// public method for decoding
	decode: (input) => {
		let output = '',
			chr1,
			chr2,
			chr3,
			enc1,
			enc2,
			enc3,
			enc4,
			i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

		while (i < input.length) {
			enc1 = BASE_64_CHR.indexOf(input.charAt(i++));
			enc2 = BASE_64_CHR.indexOf(input.charAt(i++));
			enc3 = BASE_64_CHR.indexOf(input.charAt(i++));
			enc4 = BASE_64_CHR.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 !== 64) {
				output = output + String.fromCharCode(chr2);
			}

			if (enc4 !== 64) {
				output = output + String.fromCharCode(chr3);
			}
		}

		return Base64._utf8_decode(output);
	},

	// private method for UTF-8 encoding
	_utf8_encode: (string) => {
		string = string.replace(/\r\n/g, '\n');

		let utftext = '',
			n = 0,
			l = string.length,
			c = 0;

		for (; n < l; n++) {
			c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if (c > 127 && c < 2048) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}

		return utftext;
	},

	// private method for UTF-8 decoding
	_utf8_decode: (utftext) => {
		let string = '',
			i = 0,
			c = 0,
			c2 = 0,
			c3 = 0;

		while (i < utftext.length) {
			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			} else if (c > 191 && c < 224) {
				c2 = utftext.charCodeAt(i + 1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			} else {
				c2 = utftext.charCodeAt(i + 1);
				c3 = utftext.charCodeAt(i + 2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}

		return string;
	}
};

export const decode = Base64.decode;
export const encode = Base64.encode;
export const urlsafe_encode = Base64.urlsafe_encode;
/* eslint-enable */
