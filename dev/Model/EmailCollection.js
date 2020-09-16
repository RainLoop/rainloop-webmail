import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { EmailModel } from 'Model/Email';

'use strict';

export class EmailCollectionModel extends AbstractCollectionModel
{
	/**
	 * @param {?Array} json
	 * @returns {EmailCollectionModel}
	 */
	static reviveFromJson(items) {
		let result = new EmailCollectionModel;
		Array.isArray(items) && items.forEach(email => {
			email = EmailModel.newInstanceFromJson(email);
			email && result.push(email);
		});
		return result;
	}

	/**
	 * @param {boolean=} friendlyView = false
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	toString(friendlyView = false, wrapWithLink = false) {
		const result = [];
		this.forEach(email => result.push(email.toLine(friendlyView, wrapWithLink)));
		return result.join(', ');
	}

	/**
	 * @returns {string}
	 */
	toStringClear() {
		const result = [];
		this.forEach(email => {
			if (email && email.email && email.name) {
				result.push(email.email);
			}
		});
		return result.join(', ');
	}
}
