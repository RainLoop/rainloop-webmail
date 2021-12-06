import { MessageSetAction } from 'Common/EnumsUser';
import { isArray, pInt } from 'Common/Utils';

let FOLDERS_CACHE = {},
	FOLDERS_NAME_CACHE = {},
	FOLDERS_HASH_CACHE = {},
	FOLDERS_UID_NEXT_CACHE = {},
	MESSAGE_FLAGS_CACHE = {},
	NEW_MESSAGE_CACHE = {},
	REQUESTED_MESSAGE_CACHE = {},
	inboxFolderName = 'INBOX';

export const
	/**
	 * @returns {void}
	 */
	clearCache = () => {
		FOLDERS_CACHE = {};
		FOLDERS_NAME_CACHE = {};
		FOLDERS_HASH_CACHE = {};
		FOLDERS_UID_NEXT_CACHE = {};
		MESSAGE_FLAGS_CACHE = {};
		NEW_MESSAGE_CACHE = {};
		REQUESTED_MESSAGE_CACHE = {};
	},

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @returns {string}
	 */
	getMessageKey = (folderFullName, uid) => `${folderFullName}#${uid}`,

	/**
	 * @param {string} folder
	 * @param {string} uid
	 */
	addRequestedMessage = (folder, uid) => REQUESTED_MESSAGE_CACHE[getMessageKey(folder, uid)] = true,

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @returns {boolean}
	 */
	hasRequestedMessage = (folder, uid) => true === REQUESTED_MESSAGE_CACHE[getMessageKey(folder, uid)],

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 */
	addNewMessageCache = (folderFullName, uid) => NEW_MESSAGE_CACHE[getMessageKey(folderFullName, uid)] = true,

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 */
	hasNewMessageAndRemoveFromCache = (folderFullName, uid) => {
		if (NEW_MESSAGE_CACHE[getMessageKey(folderFullName, uid)]) {
			NEW_MESSAGE_CACHE[getMessageKey(folderFullName, uid)] = null;
			return true;
		}
		return false;
	},

	/**
	 * @returns {void}
	 */
	clearNewMessageCache = () => NEW_MESSAGE_CACHE = {},

	/**
	 * @returns {string}
	 */
	getFolderInboxName = () => inboxFolderName,

	/**
	 * @returns {string}
	 */
	setFolderInboxName = name => inboxFolderName = name,

	/**
	 * @param {string} folderHash
	 * @returns {string}
	 */
	getFolderFullName = folderHash =>
		folderHash && FOLDERS_NAME_CACHE[folderHash] ? FOLDERS_NAME_CACHE[folderHash] : '',

	/**
	 * @param {string} folderHash
	 * @param {string} folderFullName
	 * @param {?FolderModel} folder
	 */
	setFolder = (folderHash, folderFullName, folder) => {
		FOLDERS_CACHE[folderFullName] = folder;
		FOLDERS_NAME_CACHE[folderHash] = folderFullName;
	},

	/**
	 * @param {string} folderFullName
	 * @returns {string}
	 */
	getFolderHash = folderFullName =>
		folderFullName && FOLDERS_HASH_CACHE[folderFullName] ? FOLDERS_HASH_CACHE[folderFullName] : '',

	/**
	 * @param {string} folderFullName
	 * @param {string} folderHash
	 */
	setFolderHash = (folderFullName, folderHash) =>
		folderFullName && (FOLDERS_HASH_CACHE[folderFullName] = folderHash),

	/**
	 * @param {string} folderFullName
	 * @returns {string}
	 */
	getFolderUidNext = folderFullName =>
		folderFullName && FOLDERS_UID_NEXT_CACHE[folderFullName]
			? FOLDERS_UID_NEXT_CACHE[folderFullName]
			: '',

	/**
	 * @param {string} folderFullName
	 * @param {string} uidNext
	 */
	setFolderUidNext = (folderFullName, uidNext) =>
		FOLDERS_UID_NEXT_CACHE[folderFullName] = uidNext,

	/**
	 * @param {string} folderFullName
	 * @returns {?FolderModel}
	 */
	getFolderFromCacheList = folderFullName =>
		folderFullName && FOLDERS_CACHE[folderFullName] ? FOLDERS_CACHE[folderFullName] : null,

	/**
	 * @param {string} folderFullName
	 */
	removeFolderFromCacheList = folderFullName => delete FOLDERS_CACHE[folderFullName];

export class MessageFlagsCache
{
	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @returns {?Array}
	 */
	static getFor(folderFullName, uid) {
		return MESSAGE_FLAGS_CACHE[folderFullName] && MESSAGE_FLAGS_CACHE[folderFullName][uid]
			? MESSAGE_FLAGS_CACHE[folderFullName][uid]
			: null;
	}

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @param {Array} flagsCache
	 */
	static setFor(folderFullName, uid, flagsCache) {
		if (!MESSAGE_FLAGS_CACHE[folderFullName]) {
			MESSAGE_FLAGS_CACHE[folderFullName] = {};
		}
		MESSAGE_FLAGS_CACHE[folderFullName][uid] = flagsCache;
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
				flags = this.getFor(message.folder, uid);

			if (isArray(flags)) {
				message.flags(flags);
			}

			if (message.threads.length) {
				const unseenSubUid = message.threads.find(sSubUid => {
					if (uid !== sSubUid) {
						const subFlags = this.getFor(message.folder, sSubUid);
						return subFlags && subFlags.length && !!subFlags[0];
					}
					return false;
				});

				const flaggedSubUid = message.threads.find(sSubUid => {
					if (uid !== sSubUid) {
						const subFlags = this.getFor(message.folder, sSubUid);
						return subFlags && subFlags.length && !!subFlags[1];
					}
					return false;
				});

				message.hasUnseenSubMessage(unseenSubUid && 0 < pInt(unseenSubUid));
				message.hasFlaggedSubMessage(flaggedSubUid && 0 < pInt(flaggedSubUid));
			}
		}
	}

	/**
	 * @param {(MessageModel|null)} message
	 */
	static store(message) {
		if (message) {
			this.setFor(message.folder, message.uid, message.flags());
		}
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @param {Array} flags
	 */
	static storeByFolderAndUid(folder, uid, flags) {
		if (isArray(flags)) {
			this.setFor(folder, uid, flags);
		}
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @param {number} setAction
	 */
	static storeBySetAction(folder, uid, setAction) {
		let unread = 0;
		const flags = this.getFor(folder, uid),
			remove = item => {
				const index = flags.indexOf(item);
				if (index > -1) {
					flags.splice(index, 1);
				}
			};

		if (isArray(flags)) {
			unread = flags.includes('\\seen') ? 0 : 1;

			switch (setAction) {
				case MessageSetAction.SetSeen:
					flags.push('\\seen');
					break;
				case MessageSetAction.UnsetSeen:
					remove('\\seen');
					break;
				case MessageSetAction.SetFlag:
					flags.push('\\flagged');
					break;
				case MessageSetAction.UnsetFlag:
					remove('\\flagged');
					break;
				// no default
			}

			this.setFor(folder, uid, flags.unique());
		}

		return unread;
	}

}
