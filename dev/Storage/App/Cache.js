/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function CacheAppStorage()
	{
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
		this.oNewMessage = {};
		this.oRequestedMessage = {};

		this.bCapaGravatar = Settings.capa(Enums.Capa.Gravatar);
	}

	/**
	 * @type {boolean}
	 */
	CacheAppStorage.prototype.bCapaGravatar = false;

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oFoldersCache = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oFoldersNamesCache = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oFolderHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oFolderUidNextCache = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oMessageListHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oMessageFlagsCache = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oBodies = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oNewMessage = {};

	/**
	 * @type {Object}
	 */
	CacheAppStorage.prototype.oRequestedMessage = {};

	CacheAppStorage.prototype.clear = function ()
	{
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
		this.oBodies = {};
	};


	/**
	 * @param {string} sEmail
	 * @param {Function} fCallback
	 * @return {string}
	 */
	CacheAppStorage.prototype.getUserPic = function (sEmail, fCallback)
	{
		sEmail = Utils.trim(sEmail);
		fCallback(this.bCapaGravatar && '' !== sEmail ? Links.avatarLink(sEmail) : '', sEmail);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 * @return {string}
	 */
	CacheAppStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
	{
		return sFolderFullNameRaw + '#' + sUid;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 */
	CacheAppStorage.prototype.addRequestedMessage = function (sFolder, sUid)
	{
		this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @return {boolean}
	 */
	CacheAppStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
	{
		return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheAppStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheAppStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
	{
		if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
		{
			this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
			return true;
		}

		return false;
	};

	CacheAppStorage.prototype.clearNewMessageCache = function ()
	{
		this.oNewMessage = {};
	};

	/**
	 * @type {string}
	 */
	CacheAppStorage.prototype.sInboxFolderName = '';

	/**
	 * @return {string}
	 */
	CacheAppStorage.prototype.getFolderInboxName = function ()
	{
		return '' === this.sInboxFolderName ? 'INBOX' : this.sInboxFolderName;
	};

	/**
	 * @param {string} sFolderHash
	 * @return {string}
	 */
	CacheAppStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
	{
		return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
	};

	/**
	 * @param {string} sFolderHash
	 * @param {string} sFolderFullNameRaw
	 */
	CacheAppStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
	{
		this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
		if ('INBOX' === sFolderFullNameRaw || '' === this.sInboxFolderName)
		{
			this.sInboxFolderName = sFolderFullNameRaw;
		}
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheAppStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sFolderHash
	 */
	CacheAppStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
	{
		this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheAppStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUidNext
	 */
	CacheAppStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
	{
		this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {?FolderModel}
	 */
	CacheAppStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {?FolderModel} oFolder
	 */
	CacheAppStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
	{
		this.oFoldersCache[sFolderFullNameRaw] = oFolder;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 */
	CacheAppStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
	{
		this.setFolderToCacheList(sFolderFullNameRaw, null);
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @return {?Array}
	 */
	CacheAppStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
	{
		return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
			this.oMessageFlagsCache[sFolderFullName][sUid] : null;
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @param {Array} aFlagsCache
	 */
	CacheAppStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
	{
		if (!this.oMessageFlagsCache[sFolderFullName])
		{
			this.oMessageFlagsCache[sFolderFullName] = {};
		}

		this.oMessageFlagsCache[sFolderFullName][sUid] = aFlagsCache;
	};

	/**
	 * @param {string} sFolderFullName
	 */
	CacheAppStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
	{
		this.oMessageFlagsCache[sFolderFullName] = {};
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	CacheAppStorage.prototype.initMessageFlagsFromCache = function (oMessage)
	{
		if (oMessage)
		{
			var
				self = this,
				aFlags = this.getMessageFlagsFromCache(oMessage.folderFullNameRaw, oMessage.uid),
				mUnseenSubUid = null,
				mFlaggedSubUid = null
			;

			if (aFlags && 0 < aFlags.length)
			{
				oMessage.unseen(!!aFlags[0]);
				oMessage.flagged(!!aFlags[1]);
				oMessage.answered(!!aFlags[2]);
				oMessage.forwarded(!!aFlags[3]);
				oMessage.isReadReceipt(!!aFlags[4]);
			}

			if (0 < oMessage.threads().length)
			{
				mUnseenSubUid = _.find(oMessage.threads(), function (iSubUid) {
					var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
					return aFlags && 0 < aFlags.length && !!aFlags[0];
				});

				mFlaggedSubUid = _.find(oMessage.threads(), function (iSubUid) {
					var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
					return aFlags && 0 < aFlags.length && !!aFlags[1];
				});

				oMessage.hasUnseenSubMessage(mUnseenSubUid && 0 < Utils.pInt(mUnseenSubUid));
				oMessage.hasFlaggedSubMessage(mFlaggedSubUid && 0 < Utils.pInt(mFlaggedSubUid));
			}
		}
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	CacheAppStorage.prototype.storeMessageFlagsToCache = function (oMessage)
	{
		if (oMessage)
		{
			this.setMessageFlagsToCache(
				oMessage.folderFullNameRaw,
				oMessage.uid,
				[oMessage.unseen(), oMessage.flagged(), oMessage.answered(), oMessage.forwarded(), oMessage.isReadReceipt()]
			);
		}
	};
	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @param {Array} aFlags
	 */
	CacheAppStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
	{
		if (Utils.isArray(aFlags) && 0 < aFlags.length)
		{
			this.setMessageFlagsToCache(sFolder, sUid, aFlags);
		}
	};

	module.exports = new CacheAppStorage();

}());