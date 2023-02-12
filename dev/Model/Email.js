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
function addressparser(str) {
	var tokenizer = new Tokenizer(str);
	var tokens = tokenizer.tokenize();
	var addresses = [];
	var address = [];
	var parsedAddresses = [];

	tokens.forEach(token => {
		if (token.type === 'operator' && (token.value === ',' || token.value === ';')) {
			address.length && addresses.push(address);
			address = [];
		} else {
			address.push(token);
		}
	});

	address.length && addresses.push(address);

	addresses.forEach(address => {
		address = _handleAddress(address);
		if (address.length) {
			parsedAddresses = parsedAddresses.concat(address);
		}
	});

	return parsedAddresses;
}

/**
 * Converts tokens for a single address into an address object
 *
 * @param {Array} tokens Tokens object
 * @return {Object} Address object
 */
function _handleAddress(tokens) {
	var isGroup = false;
	var state = 'text';
	var address = void 0;
	var addresses = [];
	var data = {
		address: [],
		comment: [],
		group: [],
		text: []
	};

	// Filter out <addresses>, (comments) and regular text
	tokens.forEach(token => {
		if (token.type === 'operator') {
			switch (token.value) {
				case '<':
					state = 'address';
					break;
				case '(':
					state = 'comment';
					break;
				case ':':
					state = 'group';
					isGroup = true;
					break;
				default:
					state = 'text';
			}
		} else if (token.value) {
			data[state].push(token.value);
		}
	});

	// If there is no text but a comment, replace the two
	if (!data.text.length && data.comment.length) {
		data.text = data.comment;
		data.comment = [];
	}

	if (isGroup) {
		// http://tools.ietf.org/html/rfc2822#appendix-A.1.3
		data.text = data.text.join(' ');
		addresses.push({
			name: data.text || address && address.name,
			group: data.group.length ? addressparser(data.group.join(',')) : []
		});
	} else {
		// If no address was found, try to detect one from regular text
		if (!data.address.length && data.text.length) {
			var i = data.text.length;
			while (i--) {
				if (data.text[i].match(/^[^@\s]+@[^@\s]+$/)) {
					data.address = data.text.splice(i, 1);
					break;
				}
			}

			// still no address
			if (!data.address.length) {
				i = data.text.length;
				while (i--) {
					data.text[i] = data.text[i].replace(/\s*\b[^@\s]+@[^@\s]+\b\s*/, address => {
						if (!data.address.length) {
							data.address = [address.trim()];
							return '';
						}
						return address.trim();
					});
					if (data.address.length) {
						break;
					}
				}
			}
		}

		// If there's still is no text but a comment exixts, replace the two
		if (!data.text.length && data.comment.length) {
			data.text = data.comment;
			data.comment = [];
		}

		// Keep only the first address occurence, push others to regular text
		if (data.address.length > 1) {
			data.text = data.text.concat(data.address.splice(1));
		}

		// Join values with spaces
		data.text = data.text.join(' ');
		data.address = data.address.join(' ');

		if (!data.address && isGroup) {
			return [];
		}
		address = {
			address: data.address || data.text || '',
			name: data.text || data.address || ''
		};

		if (address.address === address.name) {
			if ((address.address || '').match(/@/)) {
				address.name = '';
			} else {
				address.address = '';
			}
		}

		addresses.push(address);
	}

	return addresses;
}

/*
 * Operator tokens and which tokens are expected to end the sequence
 */
var OPERATORS = {
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
};

class Tokenizer
{
	constructor(str) {
		this.str = (str || '').toString();
		this.operatorCurrent = '';
		this.operatorExpecting = '';
		this.node = null;
		this.escaped = false;
		this.list = [];
	}

	tokenize() {
		var list = [];
		[...this.str].forEach(c => this.checkChar(c));

		this.list.forEach(node => {
			node.value = (node.value || '').toString().trim();
			node.value && list.push(node);
		});

		return list;
	}

	checkChar(chr) {
		if ((chr in OPERATORS || chr === '\\') && this.escaped) {
			this.escaped = false;
		} else if (this.operatorExpecting && chr === this.operatorExpecting) {
			this.node = {
				type: 'operator',
				value: chr
			};
			this.list.push(this.node);
			this.node = null;
			this.operatorExpecting = '';
			this.escaped = false;
			return;
		} else if (!this.operatorExpecting && chr in OPERATORS) {
			this.node = {
				type: 'operator',
				value: chr
			};
			this.list.push(this.node);
			this.node = null;
			this.operatorExpecting = OPERATORS[chr];
			this.escaped = false;
			return;
		}

		if (!this.escaped && chr === '\\') {
			this.escaped = true;
			return;
		}

		if (!this.node) {
			this.node = {
				type: 'text',
				value: ''
			};
			this.list.push(this.node);
		}

		if (this.escaped && chr !== '\\') {
			this.node.value += '\\';
		}

		this.node.value += chr;
		this.escaped = false;
	}
}

export class EmailModel extends AbstractModel {
	/**
	 * @param {string=} email = ''
	 * @param {string=} name = ''
	 * @param {string=} dkimStatus = 'none'
	 */
	constructor(email = '', name = '', dkimStatus = 'none') {
		super();
		this.email = email;
		this.name = name;
		this.dkimStatus = dkimStatus;

		this.clearDuplicateName();
	}

	/**
	 * @static
	 * @param {FetchJsonEmail} json
	 * @returns {?EmailModel}
	 */
	static reviveFromJson(json) {
		const email = super.reviveFromJson(json);
		email?.clearDuplicateName();
		return email;
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.email = '';
		this.name = '';

		this.dkimStatus = 'none';
	}

	/**
	 * @returns {boolean}
	 */
	validate() {
		return this.name || this.email;
	}

	/**
	 * @param {boolean} withoutName = false
	 * @returns {string}
	 */
	hash(withoutName = false) {
		return '#' + (withoutName ? '' : this.name) + '#' + (this.email || this.name) + '#';
	}

	/**
	 * @returns {void}
	 */
	clearDuplicateName() {
		if (this.name === this.email) {
			this.name = '';
		}
	}

	/**
	 * @param {string} query
	 * @returns {boolean}
	 */
	search(query) {
		return (this.name + ' ' + this.email).toLowerCase().includes(query.toLowerCase());
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

	static splitEmailLine(line) {
		const result = [];
		let exists = false;
		addressparser(line).forEach(item => {
			const address = item.address
				? new EmailModel(item.address.replace(/^[<]+(.*)[>]+$/g, '$1'), item.name || '')
				: null;

			if (address?.email) {
				exists = true;
			}

			result.push(address ? address.toLine() : item.name);
		});
		return exists ? result : null;
	}

	static parseEmailLine(line) {
		return addressparser(line).map(item =>
			item.address ? new EmailModel(item.address.replace(/^[<]+(.*)[>]+$/g, '$1'), item.name || '') : null
		).filter(v => v);
	}

	/**
	 * @param {string} emailAddress
	 * @returns {boolean}
	 */
	parse(emailAddress) {
		emailAddress = emailAddress.trim();
		if (emailAddress) {
			const result = addressparser(emailAddress);
			if (result.length) {
				this.name = result[0].name || '';
				this.email = result[0].address || '';
				this.clearDuplicateName();
				return true;
			}
		}
		return false;
	}
}
