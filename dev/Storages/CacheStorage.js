/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		LinkBuilder = require('Common/LinkBuilder'),

		Settings = require('Storage:Settings')
	;

	/**
	 * @constructor
	 */
	function CacheStorage()
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
	CacheStorage.prototype.bCapaGravatar = false;

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFoldersCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFoldersNamesCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFolderHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFolderUidNextCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oMessageListHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oMessageFlagsCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oBodies = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oNewMessage = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oRequestedMessage = {};

	CacheStorage.prototype.clear = function ()
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
	CacheStorage.prototype.getUserPic = function (sEmail, fCallback)
	{
		sEmail = Utils.trim(sEmail);
		fCallback(this.bCapaGravatar && '' !== sEmail ? LinkBuilder.avatarLink(sEmail) : '', sEmail);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 * @return {string}
	 */
	CacheStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
	{
		return sFolderFullNameRaw + '#' + sUid;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 */
	CacheStorage.prototype.addRequestedMessage = function (sFolder, sUid)
	{
		this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @return {boolean}
	 */
	CacheStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
	{
		return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
	{
		if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
		{
			this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
			return true;
		}

		return false;
	};

	CacheStorage.prototype.clearNewMessageCache = function ()
	{
		this.oNewMessage = {};
	};

	/**
	 * @param {string} sFolderHash
	 * @return {string}
	 */
	CacheStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
	{
		return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
	};

	/**
	 * @param {string} sFolderHash
	 * @param {string} sFolderFullNameRaw
	 */
	CacheStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
	{
		this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sFolderHash
	 */
	CacheStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
	{
		this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUidNext
	 */
	CacheStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
	{
		this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {?FolderModel}
	 */
	CacheStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {?FolderModel} oFolder
	 */
	CacheStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
	{
		this.oFoldersCache[sFolderFullNameRaw] = oFolder;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 */
	CacheStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
	{
		this.setFolderToCacheList(sFolderFullNameRaw, null);
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @return {?Array}
	 */
	CacheStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
	{
		return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
			this.oMessageFlagsCache[sFolderFullName][sUid] : null;
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @param {Array} aFlagsCache
	 */
	CacheStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
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
	CacheStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
	{
		this.oMessageFlagsCache[sFolderFullName] = {};
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	CacheStorage.prototype.initMessageFlagsFromCache = function (oMessage)
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
	CacheStorage.prototype.storeMessageFlagsToCache = function (oMessage)
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
	CacheStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
	{
		if (Utils.isArray(aFlags) && 0 < aFlags.length)
		{
			this.setMessageFlagsToCache(sFolder, sUid, aFlags);
		}
	};

	module.exports = new CacheStorage();

}());