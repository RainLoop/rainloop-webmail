

import {_} from 'common';
import {Capa, MessageSetAction} from 'Common/Enums';
import Utils from 'Common/Utils';
import Links from 'Common/Links';
import Settings from 'Storage/Settings';

class CacheUserStorage
{
	oFoldersCache = {};
	oFoldersNamesCache = {};
	oFolderHashCache = {};
	oFolderUidNextCache = {};
	oMessageListHashCache = {};
	oMessageFlagsCache = {};
	oNewMessage = {};
	oRequestedMessage = {};
	bCapaGravatar = false;
	inboxFolderName = '';

	constructor()
	{
		this.bCapaGravatar = Settings.capa(Capa.Gravatar);
	}

	clear() {
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
	}

	/**
	 * @param {string} email
	 * @param {Function} callback
	 * @return {string}
	 */
	getUserPic(email, callback) {
		email = Utils.trim(email);
		callback(this.bCapaGravatar && '' !== email ? Links.avatarLink(email) : '', email);
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uid
	 * @return {string}
	 */
	getMessageKey(folderFullNameRaw, uid) {
		return `${folderFullNameRaw}#${uid}`;
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 */
	addRequestedMessage(folder, uid) {
		this.oRequestedMessage[this.getMessageKey(folder, uid)] = true;
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @return {boolean}
	 */
	hasRequestedMessage(folder, uid) {
		return true === this.oRequestedMessage[this.getMessageKey(folder, uid)];
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uid
	 */
	addNewMessageCache(folderFullNameRaw, uid) {
		this.oNewMessage[this.getMessageKey(folderFullNameRaw, uid)] = true;
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uid
	 */
	hasNewMessageAndRemoveFromCache(folderFullNameRaw, uid) {
		if (this.oNewMessage[this.getMessageKey(folderFullNameRaw, uid)])
		{
			this.oNewMessage[this.getMessageKey(folderFullNameRaw, uid)] = null;
			return true;
		}
		return false;
	}

	clearNewMessageCache() {
		this.oNewMessage = {};
	}

	/**
	 * @return {string}
	 */
	getFolderInboxName() {
		return '' === this.inboxFolderName ? 'INBOX' : this.inboxFolderName;
	}

	/**
	 * @param {string} folderHash
	 * @return {string}
	 */
	getFolderFullNameRaw(folderHash) {
		return '' !== folderHash && this.oFoldersNamesCache[folderHash] ? this.oFoldersNamesCache[folderHash] : '';
	}

	/**
	 * @param {string} folderHash
	 * @param {string} folderFullNameRaw
	 */
	setFolderFullNameRaw(folderHash, folderFullNameRaw) {
		this.oFoldersNamesCache[folderHash] = folderFullNameRaw;
		if ('INBOX' === folderFullNameRaw || '' === this.inboxFolderName)
		{
			this.inboxFolderName = folderFullNameRaw;
		}
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @return {string}
	 */
	getFolderHash(folderFullNameRaw) {
		return '' !== folderFullNameRaw && this.oFolderHashCache[folderFullNameRaw] ? this.oFolderHashCache[folderFullNameRaw] : '';
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} folderHash
	 */
	setFolderHash(folderFullNameRaw, folderHash) {
		if ('' !== folderFullNameRaw)
		{
			this.oFolderHashCache[folderFullNameRaw] = folderHash;
		}
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @return {string}
	 */
	getFolderUidNext(folderFullNameRaw) {
		return '' !== folderFullNameRaw && this.oFolderUidNextCache[folderFullNameRaw] ? this.oFolderUidNextCache[folderFullNameRaw] : '';
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @param {string} uidNext
	 */
	setFolderUidNext(folderFullNameRaw, uidNext) {
		this.oFolderUidNextCache[folderFullNameRaw] = uidNext;
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @return {?FolderModel}
	 */
	getFolderFromCacheList(folderFullNameRaw) {
		return '' !== folderFullNameRaw && this.oFoldersCache[folderFullNameRaw] ? this.oFoldersCache[folderFullNameRaw] : null;
	}

	/**
	 * @param {string} folderFullNameRaw
	 * @param {?FolderModel} folder
	 */
	setFolderToCacheList(folderFullNameRaw, folder) {
		this.oFoldersCache[folderFullNameRaw] = folder;
	}

	/**
	 * @param {string} folderFullNameRaw
	 */
	removeFolderFromCacheList(folderFullNameRaw) {
		this.setFolderToCacheList(folderFullNameRaw, null);
	}

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @return {?Array}
	 */
	getMessageFlagsFromCache(folderFullName, uid) {
		return this.oMessageFlagsCache[folderFullName] && this.oMessageFlagsCache[folderFullName][uid] ?
			this.oMessageFlagsCache[folderFullName][uid] : null;
	}

	/**
	 * @param {string} folderFullName
	 * @param {string} uid
	 * @param {Array} flagsCache
	 */
	setMessageFlagsToCache(folderFullName, uid, flagsCache) {
		if (!this.oMessageFlagsCache[folderFullName])
		{
			this.oMessageFlagsCache[folderFullName] = {};
		}

		this.oMessageFlagsCache[folderFullName][uid] = flagsCache;
	}

	/**
	 * @param {string} folderFullName
	 */
	clearMessageFlagsFromCacheByFolder(folderFullName) {
		this.oMessageFlagsCache[folderFullName] = {};
	}

	/**
	 * @param {(MessageModel|null)} message
	 */
	initMessageFlagsFromCache(message) {

		if (message)
		{
			const
				uid = message.uid,
				flags = this.getMessageFlagsFromCache(message.folderFullNameRaw, uid)
			;

			if (flags && 0 < flags.length)
			{
				message.flagged(!!flags[1]);

				if (!message.__simple_message__)
				{
					message.unseen(!!flags[0]);
					message.answered(!!flags[2]);
					message.forwarded(!!flags[3]);
					message.isReadReceipt(!!flags[4]);
					message.deletedMark(!!flags[5]);
				}
			}

			if (0 < message.threads().length)
			{
				const unseenSubUid = _.find(message.threads(), (sSubUid) => {
					if (uid !== sSubUid){
						const flags = this.getMessageFlagsFromCache(message.folderFullNameRaw, sSubUid);
						return flags && 0 < flags.length && !!flags[0];	
					}
					return false;
				});

				const flaggedSubUid = _.find(message.threads(), (sSubUid) => {
					if (uid !== sSubUid) {
						const flags = this.getMessageFlagsFromCache(message.folderFullNameRaw, sSubUid);
						return flags && 0 < flags.length && !!flags[1];	
					}
					return false;
				});

				message.hasUnseenSubMessage(unseenSubUid && 0 < Utils.pInt(unseenSubUid));
				message.hasFlaggedSubMessage(flaggedSubUid && 0 < Utils.pInt(flaggedSubUid));
			}
		}
	}

	/**
	 * @param {(MessageModel|null)} message
	 */
	storeMessageFlagsToCache(message) {
		if (message)
		{
			this.setMessageFlagsToCache(
				message.folderFullNameRaw, message.uid,
				[message.unseen(), message.flagged(), message.answered(), message.forwarded(),
					message.isReadReceipt(),  message.deletedMark()]
			);
		}
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @param {Array} flags
	 */
	storeMessageFlagsToCacheByFolderAndUid(folder, uid, flags) {
		if (Utils.isArray(flags) && 0 < flags.length)
		{
			this.setMessageFlagsToCache(folder, uid, flags);
		}
	}

	/**
	 * @param {string} folder
	 * @param {string} uid
	 * @param {number} setAction
	 */
	storeMessageFlagsToCacheBySetAction(folder, uid, setAction) {

		let unread = 0; 
		const flags = this.getMessageFlagsFromCache(folder, uid);

		if (Utils.isArray(flags) && 0 < flags.length)
		{
			if (flags[0])
			{
				unread = 1;
			}

			switch (setAction)
			{
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
			}

			this.setMessageFlagsToCache(folder, uid, flags);
		}

		return unread;
	}
}

module.exports = new CacheUserStorage();
