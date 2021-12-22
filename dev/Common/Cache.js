import { MessageSetAction } from 'Common/EnumsUser';
import { isArray } from 'Common/Utils';

let FOLDERS_CACHE = {},
	FOLDERS_NAME_CACHE = {},
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
	setFolder = folder => {
		folder.hash = '';
		FOLDERS_CACHE[folder.fullName] = folder;
		FOLDERS_NAME_CACHE[folder.fullNameHash] = folder.fullName;
	},

	/**
	 * @param {string} folderFullName
	 * @returns {string}
	 */
	getFolderHash = folderFullName =>
		FOLDERS_CACHE[folderFullName] ? FOLDERS_CACHE[folderFullName].hash : '',

	/**
	 * @param {string} folderFullName
	 * @param {string} folderHash
	 */
	setFolderHash = (folderFullName, folderHash) =>
		FOLDERS_CACHE[folderFullName] && (FOLDERS_CACHE[folderFullName].hash = folderHash),

	/**
	 * @param {string} folderFullName
	 * @returns {string}
	 */
	getFolderUidNext = folderFullName =>
		FOLDERS_CACHE[folderFullName] ? FOLDERS_CACHE[folderFullName].uidNext : 0,

	/**
	 * @param {string} folderFullName
	 * @param {string} uidNext
	 */
	setFolderUidNext = (folderFullName, uidNext) =>
		FOLDERS_CACHE[folderFullName] && (FOLDERS_CACHE[folderFullName].uidNext = uidNext),

	/**
	 * @param {string} folderFullName
	 * @returns {?FolderModel}
	 */
	getFolderFromCacheList = folderFullName =>
		FOLDERS_CACHE[folderFullName] ? FOLDERS_CACHE[folderFullName] : null,

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
		return MESSAGE_FLAGS_CACHE[folderFullName]
			&& MESSAGE_FLAGS_CACHE[folderFullName][uid]
			&& MESSAGE_FLAGS_CACHE[folderFullName][uid].includes(flag);
	}

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @returns {?Array}
	 */
	static getFor(folderFullName, uid) {
		return MESSAGE_FLAGS_CACHE[folderFullName] && MESSAGE_FLAGS_CACHE[folderFullName][uid];
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
				thread = message.threads;

			if (isArray(flags)) {
				message.flags(flags);
			}

			if (thread.length) {
				const unseenSubUid = thread.find(iSubUid =>
					(uid !== iSubUid) && !this.hasFlag(message.folder, iSubUid, '\\seen')
				);

				const flaggedSubUid = thread.find(iSubUid =>
					(uid !== iSubUid) && this.hasFlag(message.folder, iSubUid, '\\flagged')
				);

				message.hasUnseenSubMessage(!!unseenSubUid);
				message.hasFlaggedSubMessage(!!flaggedSubUid);
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
