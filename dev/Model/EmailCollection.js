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
		return super.reviveFromJson(items, email => EmailModel.reviveFromJson(email));
	}

	/**
	 * @param {boolean=} friendlyView = false
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	toString(friendlyView, wrapWithLink) {
		return this.map(email => email.toLine(friendlyView, wrapWithLink)).join(', ');
	}
}
