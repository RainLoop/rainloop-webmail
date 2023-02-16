import { MessageSetAction } from 'Common/EnumsUser';
import { isArray } from 'Common/Utils';

let FOLDERS_CACHE = {},
	FOLDERS_NAME_CACHE = {},
	MESSAGE_FLAGS_CACHE = {},
	inboxFolderName = 'INBOX';

export const
	/**
	 * @returns {void}
	 */
	clearCache = () => {
		FOLDERS_CACHE = {};
		FOLDERS_NAME_CACHE = {};
		MESSAGE_FLAGS_CACHE = {};
	},

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @returns {string}
	 */
	getMessageKey = (folderFullName, uid) => folderFullName + '#' + uid,

	/**
	 * @returns {string}
	 */
	getFolderInboxName = () => inboxFolderName,

	/**
	 * @returns {string}
	 */
	setFolderInboxName = name => inboxFolderName = name,

	/**
	 * @param {string} fullNameHash
	 * @returns {string}
	 */
	getFolderFullName = fullNameHash => (fullNameHash && FOLDERS_NAME_CACHE[fullNameHash]) || '',

	/**
	 * @param {?FolderModel} folder
	 */
	setFolder = folder => {
		folder.etag = '';
		FOLDERS_CACHE[folder.fullName] = folder;
		FOLDERS_NAME_CACHE[folder.fullNameHash] = folder.fullName;
	},

	/**
	 * @param {string} folderFullName
	 * @param {string} folderETag
	 */
	setFolderETag = (folderFullName, folderETag) =>
		FOLDERS_CACHE[folderFullName] && (FOLDERS_CACHE[folderFullName].etag = folderETag),

	/**
	 * @param {string} folderFullName
	 * @returns {?FolderModel}
	 */
	getFolderFromCacheList = folderFullName =>
		FOLDERS_CACHE[folderFullName] || null,

	/**
	 * @param {string} folderFullName
	 */
	removeFolderFromCacheList = folderFullName => delete FOLDERS_CACHE[folderFullName];

export class MessageFlagsCache
{
	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @param {string} flag
	 * @returns {bool}
	 */
	static hasFlag(folderFullName, uid, flag) {
		return MESSAGE_FLAGS_CACHE[folderFullName]?.[uid]?.includes(flag);
	}

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @returns {?Array}
	 */
	static getFor(folderFullName, uid) {
		return MESSAGE_FLAGS_CACHE[folderFullName]?.[uid];
	}

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @param {Array} flagsCache
	 */
	static setFor(folderFullName, uid, flags) {
		if (isArray(flags)) {
			if (!MESSAGE_FLAGS_CACHE[folderFullName]) {
				MESSAGE_FLAGS_CACHE[folderFullName] = {};
			}
			MESSAGE_FLAGS_CACHE[folderFullName][uid] = flags;
		}
	}

	/**
	 * @param {string} folderFullName
	 */
	static clearFolder(folderFullName) {
		MESSAGE_FLAGS_CACHE[folderFullName] = {};
	}

	/**
	 * @param {(MessageModel|null)} message
	 */
	static initMessage(message) {
		if (message) {
			const uid = message.uid,
				flags = this.getFor(message.folder, uid),
				thread = message.threads();

			isArray(flags) && message.flags(flags);

			if (thread.length) {
				message.hasUnseenSubMessage(!!thread.find(iSubUid =>
					(uid !== iSubUid) && !this.hasFlag(message.folder, iSubUid, '\\seen')
				));
				message.hasFlaggedSubMessage(!!thread.find(iSubUid =>
					(uid !== iSubUid) && this.hasFlag(message.folder, iSubUid, '\\flagged')
				));
			}
		}
	}

	/**
	 * @param {(MessageModel|null)} message
	 */
	static store(message) {
		message && this.setFor(message.folder, message.uid, message.flags());
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @param {number} setAction
	 */
	static storeBySetAction(folder, uid, setAction) {
		let flags = this.getFor(folder, uid) || [];
		const
			unread = flags.includes('\\seen') ? 0 : 1,
			add = item => flags.includes(item) || flags.push(item),
			remove = item => flags = flags.filter(flag => flag != item);

		switch (setAction) {
			case MessageSetAction.SetSeen:
				add('\\seen');
				break;
			case MessageSetAction.UnsetSeen:
				remove('\\seen');
				break;
			case MessageSetAction.SetFlag:
				add('\\flagged');
				break;
			case MessageSetAction.UnsetFlag:
				remove('\\flagged');
				break;
			// no default
		}

		this.setFor(folder, uid, flags);

		return unread;
	}

}
