import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { MessageModel } from 'Model/Message';

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
		this.Folder
		this.FolderHash
		this.FolderInfo
		this.totalEmails
		this.unreadEmails
		this.UidNext
		this.ThreadUid
		this.NewMessages
		this.Offset
		this.Limit
		this.Search
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {MessageCollectionModel}
	 */
	static reviveFromJson(object, cached) {
		return super.reviveFromJson(object, message => {
			message = MessageModel.reviveFromJson(message);
			if (message) {
				message.deleted(false);
				cached ? MessageFlagsCache.initMessage(message) : MessageFlagsCache.store(message);
				return message;
			}
		});
	}
}
