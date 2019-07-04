import _ from '_';
import addressparser from 'emailjs-addressparser';
import { trim, encodeHtml, isNonEmptyArray } from 'Common/Utils';

class EmailModel {
	email = '';
	name = '';
	dkimStatus = '';
	dkimValue = '';

	/**
	 * @param {string=} email = ''
	 * @param {string=} name = ''
	 * @param {string=} dkimStatus = 'none'
	 * @param {string=} dkimValue = ''
	 */
	constructor(email = '', name = '', dkimStatus = 'none', dkimValue = '') {
		this.email = email;
		this.name = name;
		this.dkimStatus = dkimStatus;
		this.dkimValue = dkimValue;

		this.clearDuplicateName();
	}

	/**
	 * @static
	 * @param {AjaxJsonEmail} json
	 * @returns {?EmailModel}
	 */
	static newInstanceFromJson(json) {
		const email = new EmailModel();
		return email.initByJson(json) ? email : null;
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.email = '';
		this.name = '';

		this.dkimStatus = 'none';
		this.dkimValue = '';
	}

	/**
	 * @returns {boolean}
	 */
	validate() {
		return '' !== this.name || '' !== this.email;
	}

	/**
	 * @param {boolean} withoutName = false
	 * @returns {string}
	 */
	hash(withoutName = false) {
		return '#' + (withoutName ? '' : this.name) + '#' + this.email + '#';
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
		return -1 < (this.name + ' ' + this.email).toLowerCase().indexOf(query.toLowerCase());
	}

	/**
	 * @param {AjaxJsonEmail} oJsonEmail
	 * @returns {boolean}
	 */
	initByJson(json) {
		let result = false;
		if (json && 'Object/Email' === json['@Object']) {
			this.name = trim(json.Name);
			this.email = trim(json.Email);
			this.dkimStatus = trim(json.DkimStatus || '');
			this.dkimValue = trim(json.DkimValue || '');

			result = '' !== this.email;
			this.clearDuplicateName();
		}

		return result;
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @param {boolean=} useEncodeHtml = false
	 * @returns {string}
	 */
	toLine(friendlyView, wrapWithLink = false, useEncodeHtml = false) {
		let result = '';
		if ('' !== this.email) {
			if (friendlyView && '' !== this.name) {
				result = wrapWithLink
					? '<a href="mailto:' +
					  encodeHtml(this.email) +
					  '?to=' +
					  encodeHtml('"' + this.name + '" <' + this.email + '>') +
					  '" target="_blank" tabindex="-1">' +
					  encodeHtml(this.name) +
					  '</a>'
					: useEncodeHtml
					? encodeHtml(this.name)
					: this.name;
				// result = wrapWithLink ? '<a href="mailto:' + encodeHtml('"' + this.name + '" <' + this.email + '>') +
				// 	'" target="_blank" tabindex="-1">' + encodeHtml(this.name) + '</a>' : (useEncodeHtml ? encodeHtml(this.name) : this.name);
			} else {
				result = this.email;
				if ('' !== this.name) {
					if (wrapWithLink) {
						result =
							encodeHtml('"' + this.name + '" <') +
							'<a href="mailto:' +
							encodeHtml(this.email) +
							'?to=' +
							encodeHtml('"' + this.name + '" <' + this.email + '>') +
							'" target="_blank" tabindex="-1">' +
							encodeHtml(result) +
							'</a>' +
							encodeHtml('>');
						// result = encodeHtml('"' + this.name + '" <') + '<a href="mailto:' +
						// 	encodeHtml('"' + this.name + '" <' + this.email + '>') +
						// 	'" target="_blank" tabindex="-1">' +
						// 	encodeHtml(result) +
						// 	'</a>' +
						// 	encodeHtml('>');
					} else {
						result = '"' + this.name + '" <' + result + '>';
						if (useEncodeHtml) {
							result = encodeHtml(result);
						}
					}
				} else if (wrapWithLink) {
					result =
						'<a href="mailto:' +
						encodeHtml(this.email) +
						'" target="_blank" tabindex="-1">' +
						encodeHtml(this.email) +
						'</a>';
				}
			}
		}

		return result;
	}

	static splitEmailLine(line) {
		const parsedResult = addressparser(line);
		if (isNonEmptyArray(parsedResult)) {
			const result = [];
			let exists = false;
			parsedResult.forEach((item) => {
				const address = item.address
					? new EmailModel(item.address.replace(/^[<]+(.*)[>]+$/g, '$1'), item.name || '')
					: null;

				if (address && address.email) {
					exists = true;
				}

				result.push(address ? address.toLine(false) : item.name);
			});

			return exists ? result : null;
		}

		return null;
	}

	static parseEmailLine(line) {
		const parsedResult = addressparser(line);
		if (isNonEmptyArray(parsedResult)) {
			return _.compact(
				_.map(parsedResult, (item) =>
					item.address ? new EmailModel(item.address.replace(/^[<]+(.*)[>]+$/g, '$1'), item.name || '') : null
				)
			);
		}

		return [];
	}

	/**
	 * @param {string} emailAddress
	 * @returns {boolean}
	 */
	parse(emailAddress) {
		emailAddress = trim(emailAddress);
		if ('' === emailAddress) {
			return false;
		}

		const result = addressparser(emailAddress);
		if (isNonEmptyArray(result) && result[0]) {
			this.name = result[0].name || '';
			this.email = result[0].address || '';
			this.clearDuplicateName();

			return true;
		}

		return false;
	}
}

export { EmailModel, EmailModel as default };
