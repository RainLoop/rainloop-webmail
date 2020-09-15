import { AttachmentModel } from 'Model/Attachment';

'use strict';

class AttachmentCollectionModel extends Array
{
	constructor() {
		super();
	}

	/**
	 * @param {?Array} json
	 * @returns {AttachmentCollectionModel}
	 */
	static reviveFromJson(items, foundedCIDs) {
		let result = new AttachmentCollectionModel;
		if (items && 'Collection/AttachmentCollection' === items['@Object']) {
			items = items['@Collection'];
		}
		Array.isArray(items) && items.forEach(attachment => {
			attachment = AttachmentModel.newInstanceFromJson(attachment);
			if (attachment) {
				if (attachment.cidWithOutTags && foundedCIDs.includes(attachment.cidWithOutTags)) {
					attachment.isLinked = true;
				}
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
		return this.find(item => cid === item.cidWithOutTags);
	}
}

export { AttachmentCollectionModel, AttachmentCollectionModel as default };
