import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { MessageModel } from 'Model/Message';

import {
	initMessageFlagsFromCache,
	storeMessageFlagsToCache,
	hasNewMessageAndRemoveFromCache
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
		this.Limit
		this.MessageCount
		this.MessageUnseenCount
		this.MessageResultCount
		this.NewMessages
		this.Offset
		this.Search
		this.ThreadUid
		this.UidNext
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {MessageCollectionModel}
	 */
	static reviveFromJson(object, cached) {
		let newCount = 0;
		return super.reviveFromJson(object, message => {
			if (message && 'Object/Message' === message['@Object']) {
				message = MessageModel.newInstanceFromJson(message);
				if (message) {
					if (hasNewMessageAndRemoveFromCache(message.folderFullNameRaw, message.uid) && 5 >= newCount) {
						++newCount;
						message.newForAnimation(true);
					}

					message.deleted(false);

					cached ? initMessageFlagsFromCache(message) : storeMessageFlagsToCache(message);
					return message;
				}
			}
		});
	}
}
