import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { AttachmentModel } from 'Model/Attachment';

'use strict';

export class AttachmentCollectionModel extends AbstractCollectionModel
{
	/**
	 * @param {?Array} json
	 * @returns {AttachmentCollectionModel}
	 */
	static reviveFromJson(items) {
		let result = new AttachmentCollectionModel;
		items = this.getFromJSON(items, 'AttachmentCollection') || items;
		Array.isArray(items) && items.forEach(attachment => {
			attachment = AttachmentModel.newInstanceFromJson(attachment);
			if (attachment) {
				result.push(attachment);
			}
		});
		return result;
	}

	/**
	 * @returns {boolean}
	 */
	hasVisible() {
		return !!this.find(item => !item.isLinked);
	}

	/**
	 * @param {string} cid
	 * @returns {*}
	 */
	findByCid(cid) {
		cid = cid.replace(/^<+|>+$/, '');
		return this.find(item => cid === item.cidWithoutTags);
	}
}
