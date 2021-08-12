import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { MessageModel } from 'Model/Message';

import {
	MessageFlagsCache,
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
			message = MessageModel.reviveFromJson(message);
			if (message) {
				if (hasNewMessageAndRemoveFromCache(message.folder, message.uid) && 5 >= newCount) {
					++newCount;
				}

				message.deleted(false);

				cached ? MessageFlagsCache.initMessage(message) : MessageFlagsCache.store(message);
				return message;
			}
		});
	}
}
