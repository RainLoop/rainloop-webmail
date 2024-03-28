import { decodeEncodedWords, BDecode, BEncode, QPDecode, decodeText } from 'Mime/Encoding';
import { addressparser } from 'Mime/Address';

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
			// https://datatracker.ietf.org/doc/html/rfc2822#section-3.6
			// https://datatracker.ietf.org/doc/html/rfc4021
			this.headers = {
				// Required
				date = null,
				from = [], // mailbox-list
				// Optional
				sender          = [], // mailbox MUST occur with multi-address
				'reply-to'      = [], // address-list
				to              = [], // address-list
				cc              = [], // address-list
				bcc             = [], // address-list
				'message-id'    = '', // msg-id SHOULD be present
				'in-reply-to'   = '', // 1*msg-id SHOULD occur in some replies
				references      = '', // 1*msg-id SHOULD occur in some replies
				subject         = '', // unstructured
				// Optional unlimited
				comments        = [], // unstructured
				keywords        = [], // phrase *("," phrase)
				// https://datatracker.ietf.org/doc/html/rfc2822#section-3.6.6
				'resent-date'   = [],
				'resent-from'   = [],
				'resent-sender' = [],
				'resent-to'     = [],
				'resent-cc'     = [],
				'resent-bcc'    = [],
				'resent-msg-id' = [],
				// https://datatracker.ietf.org/doc/html/rfc2822#section-3.6.7
				trace           = [],
				'return-path'   = '', // angle-addr
				received        = [],
				// optional others outside RFC2822
				'mime-version'              = '', // RFC2045
				'content-transfer-encoding' = '',
				'content-type'              = '',
				'delivered-to'              = [], // RFC9228 addr-spec
				'authentication-results'    = '', // dkim, spf, dmarc
				'dkim-signature'            = '',
				'x-rspamd-queue-id'         = '',
				'x-rspamd-action'           = '',
				'x-spamd-bar'               = '',
				'x-rspamd-server'           = '',
				'x-spamd-result'            = '',
				'x-remote-address'          = '',
				// etc.
			};
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
				charset = this.header('content-type')?.params.charset,
				encoding = this.headerValue('content-transfer-encoding');
			if ('quoted-printable' == encoding) {
				body = QPDecode(body);
			} else if ('base64' == encoding) {
				body = BDecode(body.replace(/\r?\n/g, ''));
			}
			return decodeText(charset, body);
		}

		get dataUrl() {
			let body = this.bodyRaw,
				encoding = this.headerValue('content-transfer-encoding');
			if ('base64' == encoding) {
				body = body.replace(/\r?\n/g, '');
			} else {
				if ('quoted-printable' == encoding) {
					body = QPDecode(body);
				}
				body = BEncode(body);
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

	// mailbox-list or address-list
	const lists = ['from','reply-to','to','cc','bcc'];

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
					let field = match[1].trim().toLowerCase();
					if (lists.includes(field)) {
						match[2] = addressparser(match[2]);
					} else if ('keywords' === field) {
						match[2] = match[2].split(',').forEach(entry => decodeEncodedWords(entry.trim()));
						match[2] = (headers[field]?.value || []).concat(match[2]);
					} else {
						match[2] = decodeEncodedWords(match[2].trim());
						if ('comments' === field) {
							match[2] = (headers[field]?.value || []).push(match[2]);
						}
					}
					headers[field] = {
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
				let regex = new RegExp('(?:^|\r?\n)--' + RegExp.escape(boundary) + '(?:--)?(?:\r?\n|$)', 'g'),
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
