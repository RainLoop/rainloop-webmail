import { MessageSetAction } from 'Common/EnumsUser';
import { arrayLength, pInt } from 'Common/Utils';

let FOLDERS_CACHE = {},
	FOLDERS_NAME_CACHE = {},
	FOLDERS_HASH_CACHE = {},
	FOLDERS_UID_NEXT_CACHE = {},
	MESSAGE_FLAGS_CACHE = {},
	NEW_MESSAGE_CACHE = {},
	inboxFolderName = 'INBOX';

const REQUESTED_MESSAGE_CACHE = {};

export const
	/**
	 * @returns {void}
	 */
	clear = () => {
		FOLDERS_CACHE = {};
		FOLDERS_NAME_CACHE = {};
		FOLDERS_HASH_CACHE = {};
		FOLDERS_UID_NEXT_CACHE = {};
		MESSAGE_FLAGS_CACHE = {};
	},

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uid
	 * @returns {string}
	 */
	getMessageKey = (folderFullNameRaw, uid) => `${folderFullNameRaw}#${uid}`,

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
	 * @param {string} folderFullNameRaw
	 * @param {string} uid
	 */
	addNewMessageCache = (folderFullNameRaw, uid) => NEW_MESSAGE_CACHE[getMessageKey(folderFullNameRaw, uid)] = true,

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uid
	 */
	hasNewMessageAndRemoveFromCache = (folderFullNameRaw, uid) => {
		if (NEW_MESSAGE_CACHE[getMessageKey(folderFullNameRaw, uid)]) {
			NEW_MESSAGE_CACHE[getMessageKey(folderFullNameRaw, uid)] = null;
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
	getFolderFullNameRaw = folderHash =>
		folderHash && FOLDERS_NAME_CACHE[folderHash] ? FOLDERS_NAME_CACHE[folderHash] : '',

	/**
	 * @param {string} folderHash
	 * @param {string} folderFullNameRaw
	 * @param {?FolderModel} folder
	 */
	setFolder = (folderHash, folderFullNameRaw, folder) => {
		FOLDERS_CACHE[folderFullNameRaw] = folder;
		FOLDERS_NAME_CACHE[folderHash] = folderFullNameRaw;
	},

	/**
	 * @param {string} folderFullNameRaw
	 * @returns {string}
	 */
	getFolderHash = folderFullNameRaw =>
		folderFullNameRaw && FOLDERS_HASH_CACHE[folderFullNameRaw] ? FOLDERS_HASH_CACHE[folderFullNameRaw] : '',

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} folderHash
	 */
	setFolderHash = (folderFullNameRaw, folderHash) =>
		folderFullNameRaw && (FOLDERS_HASH_CACHE[folderFullNameRaw] = folderHash),

	/**
	 * @param {string} folderFullNameRaw
	 * @returns {string}
	 */
	getFolderUidNext = folderFullNameRaw =>
		folderFullNameRaw && FOLDERS_UID_NEXT_CACHE[folderFullNameRaw]
			? FOLDERS_UID_NEXT_CACHE[folderFullNameRaw]
			: '',

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uidNext
	 */
	setFolderUidNext = (folderFullNameRaw, uidNext) =>
		FOLDERS_UID_NEXT_CACHE[folderFullNameRaw] = uidNext,

	/**
	 * @param {string} folderFullNameRaw
	 * @returns {?FolderModel}
	 */
	getFolderFromCacheList = folderFullNameRaw =>
		folderFullNameRaw && FOLDERS_CACHE[folderFullNameRaw] ? FOLDERS_CACHE[folderFullNameRaw] : null,

	/**
	 * @param {string} folderFullNameRaw
	 */
	removeFolderFromCacheList = folderFullNameRaw => delete FOLDERS_CACHE[folderFullNameRaw];

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

			if (flags && flags.length) {
				message.isFlagged(!!flags[1]);

				if (!message.isSimpleMessage) {
					message.isUnseen(!!flags[0]);
					message.isAnswered(!!flags[2]);
					message.isForwarded(!!flags[3]);
					message.isReadReceipt(!!flags[4]);
					message.isDeleted(!!flags[5]);
				}
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
			this.setFor(message.folder, message.uid, [
				message.isUnseen(),
				message.isFlagged(),
				message.isAnswered(),
				message.isForwarded(),
				message.isReadReceipt(),
				message.isDeleted()
			]);
		}
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @param {Array} flags
	 */
	static storeByFolderAndUid(folder, uid, flags) {
		if (arrayLength(flags)) {
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
		const flags = this.getFor(folder, uid);

		if (arrayLength(flags)) {
			if (flags[0]) {
				unread = 1;
			}

			switch (setAction) {
				case MessageSetAction.SetSeen:
					flags[0] = false;
					break;
				case MessageSetAction.UnsetSeen:
					flags[0] = true;
					break;
				case MessageSetAction.SetFlag:
					flags[1] = true;
					break;
				case MessageSetAction.UnsetFlag:
					flags[1] = false;
					break;
				// no default
			}

			this.setFor(folder, uid, flags);
		}

		return unread;
	}

}
