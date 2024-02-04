import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { EmailModel } from 'Model/Email';
import { forEachObjectValue } from 'Common/Utils';
import { addressparser } from 'Mime/Address';

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
	 * @param {string} text
	 * @returns {EmailCollectionModel}
	 */
	static fromString(str) {
		let list = new this();
		list.fromString(str);
		return list;
	}

	/**
	 * @param {boolean=} friendlyView = false
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	toString(friendlyView, wrapWithLink) {
		return this.map(email => email.toLine(friendlyView, wrapWithLink)).join(', ');
	}

	/**
	 * @param {string} text
	 */
	fromString(str) {
		if (str) {
			let items = {}, key;
			addressparser(str).forEach(item => {
				item = new EmailModel(item.email, item.name);
				// Make them unique
				key = item.email || item.name;
				if (key && (item.name || !items[key])) {
					items[key] = item;
				}
			});
			forEachObjectValue(items, item => this.push(item));
		}
	}

	/**
	 * @param {array} [{name: "Name", email: "address@domain"}]
	 */
/*
	static fromArray(addresses) {
		let list = new this();
		list.fromArray(addresses);
		return list;
	}
	fromArray(addresses) {
		addresses.forEach(item => {
			item = new EmailModel(item.email, item.name);
			// Make them unique
			if (item.email && item.name || !this.find(address => address.email == item.email)) {
				this.push(item);
			}
		});
	}
*/

}
