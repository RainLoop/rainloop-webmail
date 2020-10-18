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
		let cb = attachment => AttachmentModel.reviveFromJson(attachment),
			result = super.reviveFromJson(items, cb);
		if (!result) {
			result = new AttachmentCollectionModel;
			Array.isArray(items) && items.forEach(attachment => {
				attachment = cb(attachment);
				attachment && result.push(attachment);
			});
		}
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
