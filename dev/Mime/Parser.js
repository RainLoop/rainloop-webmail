
const
	// RFC2045
	QPDecodeIn = /=([0-9A-F]{2})/g,
	QPDecodeOut = (...args) => String.fromCharCode(parseInt(args[1], 16)),

	utf8To16 = data => new TextDecoder().decode(Uint8Array.from(data, c => c.charCodeAt(0)));

export function ParseMime(text)
{
	class MimePart
	{
/*
		constructor() {
			this.id = 0;
			this.start = 0;
			this.end = 0;
			this.parts = [];
			this.bodyStart = 0;
			this.bodyEnd = 0;
			this.boundary = '';
			this.bodyText = '';
			this.headers = {};
		}
*/

		header(name) {
			return this.headers?.[name];
		}

		headerValue(name) {
			return this.header(name)?.value;
		}

		get raw() {
			return text.slice(this.start, this.end);
		}

		get bodyRaw() {
			return text.slice(this.bodyStart, this.bodyEnd);
		}

		get body() {
			let body = this.bodyRaw,
//				charset = this.header('content-type')?.params.charset,
				encoding = this.headerValue('content-transfer-encoding');
			if ('quoted-printable' == encoding) {
				body = utf8To16(body.replace(/=\r?\n/g, '').replace(QPDecodeIn, QPDecodeOut));
			} else if ('base64' == encoding) {
				body = utf8To16(atob(body.replace(/\r?\n/g, '')));
			}
/*
			// TODO: convert charsets other then utf8
			try {
				// https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API/Encodings
				return new TextDecoder(charset).decode(Uint8Array.from(body, c => c.charCodeAt(0)));
//				return new TextDecoder(charset).decode(new TextEncoder().encode(body));
			} catch (e) {
			}
*/
			return body;
		}

		get dataUrl() {
			let body = this.bodyRaw,
				encoding = this.headerValue('content-transfer-encoding');
			if ('base64' == encoding) {
				body = body.replace(/\r?\n/g, '');
			} else {
				if ('quoted-printable' == encoding) {
					body = body.replace(/=\r?\n/g, '').replace(QPDecodeIn, QPDecodeOut);
				}
				body = btoa(body);
			}
			return 'data:' + this.headerValue('content-type') + ';base64,' + body;
		}

		forEach(fn) {
			fn(this);
			this.parts.forEach(part => part.forEach(fn));
		}

		getByContentType(type) {
			if (type == this.headerValue('content-type')) {
				return this;
			}
			let i = 0, p = this.parts, part;
			for (i; i < p.length; ++i) {
				if ((part = p[i].getByContentType(type))) {
					return part;
				}
			}
		}
	}

	const ParsePart = (mimePart, start_pos = 0, id = '') =>
	{
		let part = new MimePart,
			head = mimePart.match(/^[\s\S]+?\r?\n\r?\n/)?.[0],
			headers = {};
		if (id) {
			part.id = id;
			part.start = start_pos;
			part.end = start_pos + mimePart.length;
		}
		part.parts = [];

		// get headers
		if (head) {
			head.replace(/\r?\n\s+/g, ' ').split(/\r?\n/).forEach(header => {
				let match = header.match(/^([^:]+):\s*([^;]+)/),
					params = {};
				if (match) {
					[...header.matchAll(/;\s*([^;=]+)=\s*"?([^;"]+)"?/g)].forEach(param =>
						params[param[1].trim().toLowerCase()] = param[2].trim()
					);
//					encoded-word = "=?" charset "?" encoding "?" encoded-text "?="
					match[2] = match[2].trim().replace(/=\?([^?]+)\?(B|Q)\?(.+?)\?=/g, (m, charset, encoding, text) => {
						m = decodeURIComponent(
							'B' == encoding ? escape(atob(text))
							// else 'Q'
							: text.replace(/=([A-Z0-9]{2})/, '%$1')
						);
						// TODO: convert when charset != utf-8
						return m;
					});
					headers[match[1].trim().toLowerCase()] = {
						value: match[2],
						params: params
					};
				}
			});

			// get body
			part.bodyStart = start_pos + head.length;
			part.bodyEnd = start_pos + mimePart.length;

			// get child parts
			let boundary = headers['content-type']?.params.boundary;
			if (boundary) {
				part.boundary = boundary;
				let regex = new RegExp('(?:^|\r?\n)--' + boundary + '(?:--)?(?:\r?\n|$)', 'g'),
					body = mimePart.slice(head.length),
					bodies = body.split(regex),
					pos = part.bodyStart;
				[...body.matchAll(regex)].forEach(([boundary], index) => {
					if (!index) {
						// Mostly something like: "This is a multi-part message in MIME format."
						part.bodyText = bodies[0];
					}
					// Not the end?
					if ('--' != boundary.trim().slice(-2)) {
						pos += bodies[index].length + boundary.length;
						part.parts.push(ParsePart(bodies[1+index], pos, ((id ? id + '.' : '') + (1+index))));
					}
				});
			}

			part.headers = headers;
		}

		return part;
	};

	return ParsePart(text);
}
