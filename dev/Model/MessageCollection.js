import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { MessageModel } from 'Model/Message';
import { MessageUserStore } from 'Stores/User/Message';

'use strict';

export class MessageCollectionModel extends AbstractCollectionModel
{
/*
	constructor() {
		super();
		this.filtered
		this.folder
		this.totalEmails
		this.totalThreads
		this.threadUid
		this.newMessages
		this.offset
		this.limit
		this.search
		this.limited
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {MessageCollectionModel}
	 */
	static reviveFromJson(object/*, cached*/) {
		let msg = MessageUserStore.message();
		return super.reviveFromJson(object, message => {
			// If message is currently viewed, use that.
			// Maybe then use msg.revivePropertiesFromJson(message) ?
			message = (msg && msg.hash === message.hash) ? msg : MessageModel.reviveFromJson(message);
			if (message) {
				message.deleted(false);
				return message;
			}
		});
	}
}
