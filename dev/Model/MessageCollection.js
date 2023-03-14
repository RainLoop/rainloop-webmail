import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { MessageModel } from 'Model/Message';
import { MessageUserStore } from 'Stores/User/Message';

import {
	MessageFlagsCache
} from 'Common/Cache';

'use strict';

export class MessageCollectionModel extends AbstractCollectionModel
{
/*
	constructor() {
		super();
		this.Filtered
		this.folder
		this.folderHash
		this.folderInfo
		this.totalEmails
		this.unreadEmails
		this.threadUid
		this.newMessages
		this.offset
		this.limit
		this.search
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {MessageCollectionModel}
	 */
	static reviveFromJson(object, cached) {
		let msg = MessageUserStore.message();
		return super.reviveFromJson(object, message => {
			// If message is currently viewed, use that.
			// Maybe then use msg.revivePropertiesFromJson(message) ?
			message = (msg && msg.hash === message.hash) ? msg : MessageModel.reviveFromJson(message);
			if (message) {
				message.deleted(false);
				cached ? MessageFlagsCache.initMessage(message) : MessageFlagsCache.store(message);
				return message;
			}
		});
	}
}
