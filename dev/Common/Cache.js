import _ from '_';
import { Capa, MessageSetAction } from 'Common/Enums';
import { trim, pInt, isArray } from 'Common/Utils';
import * as Links from 'Common/Links';
import * as Settings from 'Storage/Settings';

let FOLDERS_CACHE = {},
	FOLDERS_NAME_CACHE = {},
	FOLDERS_HASH_CACHE = {},
	FOLDERS_UID_NEXT_CACHE = {},
	MESSAGE_FLAGS_CACHE = {},
	NEW_MESSAGE_CACHE = {},
	inboxFolderName = '';

const REQUESTED_MESSAGE_CACHE = {},
	capaGravatar = Settings.capa(Capa.Gravatar);

/**
 * @returns {void}
 */
export function clear() {
	FOLDERS_CACHE = {};
	FOLDERS_NAME_CACHE = {};
	FOLDERS_HASH_CACHE = {};
	FOLDERS_UID_NEXT_CACHE = {};
	MESSAGE_FLAGS_CACHE = {};
}

/**
 * @param {string} email
 * @param {Function} callback
 * @returns {string}
 */
export function getUserPic(email, callback) {
	email = trim(email);
	callback(capaGravatar && '' !== email ? Links.avatarLink(email) : '', email);
}

/**
 * @param {string} folderFullNameRaw
 * @param {string} uid
 * @returns {string}
 */
export function getMessageKey(folderFullNameRaw, uid) {
	return `${folderFullNameRaw}#${uid}`;
}

/**
 * @param {string} folder
 * @param {string} uid
 */
export function addRequestedMessage(folder, uid) {
	REQUESTED_MESSAGE_CACHE[getMessageKey(folder, uid)] = true;
}

/**
 * @param {string} folder
 * @param {string} uid
 * @returns {boolean}
 */
export function hasRequestedMessage(folder, uid) {
	return true === REQUESTED_MESSAGE_CACHE[getMessageKey(folder, uid)];
}

/**
 * @param {string} folderFullNameRaw
 * @param {string} uid
 */
export function addNewMessageCache(folderFullNameRaw, uid) {
	NEW_MESSAGE_CACHE[getMessageKey(folderFullNameRaw, uid)] = true;
}

/**
 * @param {string} folderFullNameRaw
 * @param {string} uid
 */
export function hasNewMessageAndRemoveFromCache(folderFullNameRaw, uid) {
	if (NEW_MESSAGE_CACHE[getMessageKey(folderFullNameRaw, uid)]) {
		NEW_MESSAGE_CACHE[getMessageKey(folderFullNameRaw, uid)] = null;
		return true;
	}
	return false;
}

/**
 * @returns {void}
 */
export function clearNewMessageCache() {
	NEW_MESSAGE_CACHE = {};
}

/**
 * @returns {string}
 */
export function getFolderInboxName() {
	return '' === inboxFolderName ? 'INBOX' : inboxFolderName;
}

/**
 * @param {string} folderHash
 * @returns {string}
 */
export function getFolderFullNameRaw(folderHash) {
	return '' !== folderHash && FOLDERS_NAME_CACHE[folderHash] ? FOLDERS_NAME_CACHE[folderHash] : '';
}

/**
 * @param {string} folderHash
 * @param {string} folderFullNameRaw
 */
export function setFolderFullNameRaw(folderHash, folderFullNameRaw) {
	FOLDERS_NAME_CACHE[folderHash] = folderFullNameRaw;
	if ('INBOX' === folderFullNameRaw || '' === inboxFolderName) {
		inboxFolderName = folderFullNameRaw;
	}
}

/**
 * @param {string} folderFullNameRaw
 * @returns {string}
 */
export function getFolderHash(folderFullNameRaw) {
	return '' !== folderFullNameRaw && FOLDERS_HASH_CACHE[folderFullNameRaw] ? FOLDERS_HASH_CACHE[folderFullNameRaw] : '';
}

/**
 * @param {string} folderFullNameRaw
 * @param {string} folderHash
 */
export function setFolderHash(folderFullNameRaw, folderHash) {
	if ('' !== folderFullNameRaw) {
		FOLDERS_HASH_CACHE[folderFullNameRaw] = folderHash;
	}
}

/**
 * @param {string} folderFullNameRaw
 * @returns {string}
 */
export function getFolderUidNext(folderFullNameRaw) {
	return '' !== folderFullNameRaw && FOLDERS_UID_NEXT_CACHE[folderFullNameRaw]
		? FOLDERS_UID_NEXT_CACHE[folderFullNameRaw]
		: '';
}

/**
 * @param {string} folderFullNameRaw
 * @param {string} uidNext
 */
export function setFolderUidNext(folderFullNameRaw, uidNext) {
	FOLDERS_UID_NEXT_CACHE[folderFullNameRaw] = uidNext;
}

/**
 * @param {string} folderFullNameRaw
 * @returns {?FolderModel}
 */
export function getFolderFromCacheList(folderFullNameRaw) {
	return '' !== folderFullNameRaw && FOLDERS_CACHE[folderFullNameRaw] ? FOLDERS_CACHE[folderFullNameRaw] : null;
}

/**
 * @param {string} folderFullNameRaw
 * @param {?FolderModel} folder
 */
export function setFolderToCacheList(folderFullNameRaw, folder) {
	FOLDERS_CACHE[folderFullNameRaw] = folder;
}

/**
 * @param {string} folderFullNameRaw
 */
export function removeFolderFromCacheList(folderFullNameRaw) {
	setFolderToCacheList(folderFullNameRaw, null);
}

/**
 * @param {string} folderFullName
 * @param {string} uid
 * @returns {?Array}
 */
export function getMessageFlagsFromCache(folderFullName, uid) {
	return MESSAGE_FLAGS_CACHE[folderFullName] && MESSAGE_FLAGS_CACHE[folderFullName][uid]
		? MESSAGE_FLAGS_CACHE[folderFullName][uid]
		: null;
}

/**
 * @param {string} folderFullName
 * @param {string} uid
 * @param {Array} flagsCache
 */
export function setMessageFlagsToCache(folderFullName, uid, flagsCache) {
	if (!MESSAGE_FLAGS_CACHE[folderFullName]) {
		MESSAGE_FLAGS_CACHE[folderFullName] = {};
	}

	MESSAGE_FLAGS_CACHE[folderFullName][uid] = flagsCache;
}

/**
 * @param {string} folderFullName
 */
export function clearMessageFlagsFromCacheByFolder(folderFullName) {
	MESSAGE_FLAGS_CACHE[folderFullName] = {};
}

/**
 * @param {(MessageModel|null)} message
 */
export function initMessageFlagsFromCache(message) {
	if (message) {
		const uid = message.uid,
			flags = getMessageFlagsFromCache(message.folderFullNameRaw, uid);

		if (flags && 0 < flags.length) {
			message.flagged(!!flags[1]);

			if (!message.isSimpleMessage) {
				message.unseen(!!flags[0]);
				message.answered(!!flags[2]);
				message.forwarded(!!flags[3]);
				message.isReadReceipt(!!flags[4]);
				message.deletedMark(!!flags[5]);
			}
		}

		if (0 < message.threads().length) {
			const unseenSubUid = _.find(message.threads(), (sSubUid) => {
				if (uid !== sSubUid) {
					const subFlags = getMessageFlagsFromCache(message.folderFullNameRaw, sSubUid);
					return subFlags && 0 < subFlags.length && !!subFlags[0];
				}
				return false;
			});

			const flaggedSubUid = _.find(message.threads(), (sSubUid) => {
				if (uid !== sSubUid) {
					const subFlags = getMessageFlagsFromCache(message.folderFullNameRaw, sSubUid);
					return subFlags && 0 < subFlags.length && !!subFlags[1];
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
export function storeMessageFlagsToCache(message) {
	if (message) {
		setMessageFlagsToCache(message.folderFullNameRaw, message.uid, [
			message.unseen(),
			message.flagged(),
			message.answered(),
			message.forwarded(),
			message.isReadReceipt(),
			message.deletedMark()
		]);
	}
}

/**
 * @param {string} folder
 * @param {string} uid
 * @param {Array} flags
 */
export function storeMessageFlagsToCacheByFolderAndUid(folder, uid, flags) {
	if (isArray(flags) && 0 < flags.length) {
		setMessageFlagsToCache(folder, uid, flags);
	}
}

/**
 * @param {string} folder
 * @param {string} uid
 * @param {number} setAction
 */
export function storeMessageFlagsToCacheBySetAction(folder, uid, setAction) {
	let unread = 0;
	const flags = getMessageFlagsFromCache(folder, uid);

	if (isArray(flags) && 0 < flags.length) {
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

		setMessageFlagsToCache(folder, uid, flags);
	}

	return unread;
}
