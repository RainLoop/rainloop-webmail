
const
	// RFC2045
	QPDecodeIn = /=([0-9A-F]{2})/g,
	QPDecodeOut = (...args) => String.fromCharCode(parseInt(args[1], 16));

export function ParseMime(text)
{
	class MimePart
	{
		header(name) {
			return this.headers && this.headers[name];
		}

		headerValue(name) {
			return (this.header(name) || {value:null}).value;
		}

		get raw() {
			return text.slice(this.start, this.end);
		}

		get bodyRaw() {
			return text.slice(this.body_start, this.body_end);
		}

		get body() {
			let body = this.bodyRaw,
				encoding = this.headerValue('content-transfer-encoding');
			if ('quoted-printable' == encoding) {
				body = body.replace(/=\r?\n/g, '').replace(QPDecodeIn, QPDecodeOut);
			} else if ('base64' == encoding) {
				body = atob(body.replace(/\r?\n/g, ''));
			}
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
			if (this.parts) {
				this.parts.forEach(part => part.forEach(fn));
			}
		}

		getByContentType(type) {
			if (type == this.headerValue('content-type')) {
				return this;
			}
			if (this.parts) {
				let i = 0, p = this.parts, part;
				for (i; i < p.length; ++i) {
					if ((part = p[i].getByContentType(type))) {
						return part;
					}
				}
			}
		}
	}

	const ParsePart = (mimePart, start_pos = 0, id = '') =>
	{
		let part = new MimePart;
		if (id) {
			part.id = id;
			part.start = start_pos;
			part.end = start_pos + mimePart.length;
		}

		// get headers
		let head = mimePart.match(/^[\s\S]+?\r?\n\r?\n/);
		if (head) {
			head = head[0];
			let headers = {};
			head.replace(/\r?\n\s+/g, ' ').split(/\r?\n/).forEach(header => {
				let match = header.match(/^([^:]+):\s*([^;]+)/),
					params = {};
				[...header.matchAll(/;\s*([^;=]+)=\s*"?([^;"]+)"?/g)].forEach(param =>
					params[param[1].trim().toLowerCase()] = param[2].trim()
				);
				headers[match[1].trim().toLowerCase()] = {
					value: match[2].trim(),
					params: params
				};
			});
			part.headers = headers;

			// get body
			part.body_start = start_pos + head.length;
			part.body_end = start_pos + mimePart.length;

			let boundary = headers['content-type'].params.boundary;
			if (boundary) {
				part.boundary = boundary;
				part.parts = [];
				let regex = new RegExp('(?:^|\r?\n)--' + boundary + '(?:--)?(?:\r?\n|$)', 'g'),
					body = mimePart.slice(head.length),
					bodies = body.split(regex),
					pos = part.body_start;
				[...body.matchAll(regex)].forEach(([boundary], index) => {
					if (!index) {
						part.body_text = bodies[0];
					}
					pos += bodies[index].length;
					pos += boundary.length;
					part.parts.push(ParsePart(bodies[1+index], pos, ((id ? id + '.' : '') + (1+index))));
					if ('--' == boundary.trim().slice(-2)) {
						// end
					}
				});
			}
		}

		return part;
	};

	return ParsePart(text);
}
