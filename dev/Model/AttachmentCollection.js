import { baseCollator } from 'Common/Translator';
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
		const attachments = super.reviveFromJson(items, attachment => AttachmentModel.reviveFromJson(attachment));
		let collator = baseCollator(true);
		attachments.sort((a, b) => {
			if (a.isInline()) {
				if (!b.isInline()) {
					return 1;
				}
			} else if (!b.isInline()) {
				return -1;
			}
			return collator.compare(a.fileName, b.fileName);
		});
/*
		if (attachments) {
			attachments.InlineCount = attachments.reduce((accumulator, a) => accumulator + (a.isInline ? 1 : 0), 0);
		}
*/
		return attachments;
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
