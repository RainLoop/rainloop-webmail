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
		return super.reviveFromJson(items, attachment => AttachmentModel.reviveFromJson(attachment));
/*
		const attachments = super.reviveFromJson(items, attachment => AttachmentModel.reviveFromJson(attachment));
		if (attachments) {
			attachments.InlineCount = attachments.reduce((accumulator, a) => accumulator + (a.isInline ? 1 : 0), 0);
		}
		return attachments;
*/
	}

	/**
	 * @param {string} cId
	 * @returns {*}
	 */
	findByCid(cId) {
		cId = cId.replace(/^<+|>+$/g, '');
		return this.find(item => cId === item.contentId());
	}
}
