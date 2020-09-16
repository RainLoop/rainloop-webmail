import { MessageModel } from 'Model/Message';

import {
	initMessageFlagsFromCache,
	storeMessageFlagsToCache,
	hasNewMessageAndRemoveFromCache
} from 'Common/Cache';

'use strict';

class MessageCollectionModel extends Array
{
	constructor() {
		super();
/*
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
*/
	}

	/**
	 * @param {?Object} json
	 * @returns {MessageCollectionModel}
	 */
	static reviveFromJson(collection, cached) {
		if (collection
		 && 'Collection/MessageCollection' === collection['@Object']
		 && Array.isArray(collection['@Collection'])) {
			const result = new MessageCollectionModel;

			Object.entries(collection).forEach(([key, value]) => '@' !== key[0] && (result[key] = value));

			let newCount = 0;
			collection['@Collection'].forEach(message => {
				if (message && 'Object/Message' === message['@Object']) {
					message = MessageModel.newInstanceFromJson(message);
					if (message) {
						if (hasNewMessageAndRemoveFromCache(message.folderFullNameRaw, message.uid) && 5 >= newCount) {
							++newCount;
							message.newForAnimation(true);
						}

						message.deleted(false);

						cached ? initMessageFlagsFromCache(message) : storeMessageFlagsToCache(message);

						result.push(message);
					}
				}
			});

//			collection[@Count] == result.length

			return result;
		}
	}
}

export { MessageCollectionModel, MessageCollectionModel as default };
