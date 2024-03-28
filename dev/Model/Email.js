import { encodeHtml } from 'Common/Html';

import { AbstractModel } from 'Knoin/AbstractModel';

'use strict';

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
