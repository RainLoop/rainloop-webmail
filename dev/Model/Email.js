import { encodeHtml } from 'Common/Html';

import { AbstractModel } from 'Knoin/AbstractModel';

'use strict';

/**
 * Parses structured e-mail addresses from an address field
 *
 * Example:
 *
 *    "Name <address@domain>"
 *
 * will be converted to
 *
 *     [{name: "Name", address: "address@domain"}]
 *
 * @param {String} str Address field
 * @return {Array} An array of address objects
 */
export function addressparser(str) {
	str = (str || '').toString();

	let
		endOperator = '',
		node = {
			type: 'text',
			value: ''
		},
		escaped = false,
		address = [],
		addresses = [];

	const
		/*
		 * Operator tokens and which tokens are expected to end the sequence
		 */
		OPERATORS = {
		  '"': '"',
		  '(': ')',
		  '<': '>',
		  ',': '',
		  // Groups are ended by semicolons
		  ':': ';',
		  // Semicolons are not a legal delimiter per the RFC2822 grammar other
		  // than for terminating a group, but they are also not valid for any
		  // other use in this context.  Given that some mail clients have
		  // historically allowed the semicolon as a delimiter equivalent to the
		  // comma in their UI, it makes sense to treat them the same as a comma
		  // when used outside of a group.
		  ';': ''
		},
		pushToken = token => {
			token.value = (token.value || '').toString().trim();
			token.value.length && address.push(token);
			node = {
				type: 'text',
				value: ''
			},
			escaped = false;
		},
		pushAddress = () => {
			if (address.length) {
				address = _handleAddress(address);
				if (address.length) {
					addresses = addresses.concat(address);
				}
			}
			address = [];
		};

	[...str].forEach(chr => {
		if (!escaped && (chr === endOperator || (!endOperator && chr in OPERATORS))) {
			pushToken(node);
			if (',' === chr || ';' === chr) {
				pushAddress();
			} else {
				endOperator = endOperator ? '' : OPERATORS[chr];
				if ('<' === chr) {
					node.type = 'email';
				} else if ('(' === chr) {
					node.type = 'comment';
				} else if (':' === chr) {
					node.type = 'group';
				}
			}
		} else {
			node.value += chr;
			escaped = !escaped && '\\' === chr;
		}
	});
	pushToken(node);

	pushAddress();

	return addresses;
//	return addresses.map(item => (item.name || item.email) ? new EmailModel(item.email, item.name) : null).filter(v => v);
}

/**
 * Converts tokens for a single address into an address object
 *
 * @param {Array} tokens Tokens object
 * @return {Object} Address object
 */
function _handleAddress(tokens) {
	let
		isGroup = false,
		address = {},
		addresses = [],
		data = {
			email: [],
			comment: [],
			group: [],
			text: []
		};

	tokens.forEach(token => {
		isGroup = isGroup || 'group' === token.type;
		data[token.type].push(token.value);
	});

	// If there is no text but a comment, replace the two
	if (!data.text.length && data.comment.length) {
		data.text = data.comment;
		data.comment = [];
	}

	if (isGroup) {
		// http://tools.ietf.org/html/rfc2822#appendix-A.1.3
/*
		addresses.push({
			email: '',
			name: data.text.join(' ').trim(),
			group: addressparser(data.group.join(','))
//			,comment: data.comment.join(' ').trim()
		});
*/
		addresses = addresses.concat(addressparser(data.group.join(',')));
	} else {
		// If no address was found, try to detect one from regular text
		if (!data.email.length && data.text.length) {
			var i = data.text.length;
			while (i--) {
				if (data.text[i].match(/^[^@\s]+@[^@\s]+$/)) {
					data.email = data.text.splice(i, 1);
					break;
				}
			}

			// still no address
			if (!data.email.length) {
				i = data.text.length;
				while (i--) {
					data.text[i] = data.text[i].replace(/\s*\b[^@\s]+@[^@\s]+\b\s*/, address => {
						if (!data.email.length) {
							data.email = [address.trim()];
							return '';
						}
						return address.trim();
					});
					if (data.email.length) {
						break;
					}
				}
			}
		}

		// If there's still no text but a comment exists, replace the two
		if (!data.text.length && data.comment.length) {
			data.text = data.comment;
			data.comment = [];
		}

		// Keep only the first address occurence, push others to regular text
		if (data.email.length > 1) {
			data.text = data.text.concat(data.email.splice(1));
		}

		address = {
			// Join values with spaces
			email: data.email.join(' ').trim(),
			name: data.text.join(' ').trim()
//			,comment: data.comment.join(' ').trim()
		};

		if (address.email === address.name) {
			if (address.email.includes('@')) {
				address.name = '';
			} else {
				address.email = '';
			}
		}

//		address.email = address.email.replace(/^[<]+(.*)[>]+$/g, '$1');

		addresses.push(address);
	}

	return addresses;
}

export class EmailModel extends AbstractModel {
	/**
	 * @param {string=} email = ''
	 * @param {string=} name = ''
	 * @param {string=} dkimStatus = 'none'
	 */
	constructor(email, name, dkimStatus = 'none') {
		super();
		this.email = email || '';
		this.name = name || '';
		this.dkimStatus = dkimStatus;
		this.cleanup();
	}

	/**
	 * @static
	 * @param {FetchJsonEmail} json
	 * @returns {?EmailModel}
	 */
	static reviveFromJson(json) {
		const email = super.reviveFromJson(json);
		email?.cleanup();
		return email?.valid() ? email : null;
	}

	/**
	 * @returns {boolean}
	 */
	valid() {
		return this.name || this.email;
	}

	/**
	 * @returns {void}
	 */
	cleanup() {
		if (this.name === this.email) {
			this.name = '';
		}
	}

	/**
	 * @param {boolean} friendlyView = false
	 * @param {boolean} wrapWithLink = false
	 * @returns {string}
	 */
	toLine(friendlyView, wrapWithLink) {
		let name = this.name,
			result = this.email,
			toLink = text =>
				'<a href="mailto:'
				+ encodeHtml(result) + (name ? '?to=' + encodeURIComponent('"' + name + '" <' + result + '>') : '')
				+ '" target="_blank" tabindex="-1">'
				+ encodeHtml(text || result)
				+ '</a>';
		if (result) {
			if (name) {
				result = friendlyView
					? (wrapWithLink ? toLink(name) : name)
					: (wrapWithLink
						? encodeHtml('"' + name + '" <') + toLink() + encodeHtml('>')
						: '"' + name + '" <' + result + '>'
					);
			} else if (wrapWithLink) {
				result = toLink();
			}
		}
		return result || name;
	}
}
