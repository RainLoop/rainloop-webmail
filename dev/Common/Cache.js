
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
	function CacheUserStorage()
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
	CacheUserStorage.prototype.bCapaGravatar = false;

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oFoldersCache = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oFoldersNamesCache = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oFolderHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oFolderUidNextCache = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oMessageListHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oMessageFlagsCache = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oNewMessage = {};

	/**
	 * @type {Object}
	 */
	CacheUserStorage.prototype.oRequestedMessage = {};

	CacheUserStorage.prototype.clear = function ()
	{
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
	};

	/**
	 * @param {string} sEmail
	 * @param {Function} fCallback
	 * @return {string}
	 */
	CacheUserStorage.prototype.getUserPic = function (sEmail, fCallback)
	{
		sEmail = Utils.trim(sEmail);
		fCallback(this.bCapaGravatar && '' !== sEmail ? Links.avatarLink(sEmail) : '', sEmail);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 * @return {string}
	 */
	CacheUserStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
	{
		return sFolderFullNameRaw + '#' + sUid;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 */
	CacheUserStorage.prototype.addRequestedMessage = function (sFolder, sUid)
	{
		this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @return {boolean}
	 */
	CacheUserStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
	{
		return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheUserStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheUserStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
	{
		if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
		{
			this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
			return true;
		}

		return false;
	};

	CacheUserStorage.prototype.clearNewMessageCache = function ()
	{
		this.oNewMessage = {};
	};

	/**
	 * @type {string}
	 */
	CacheUserStorage.prototype.sInboxFolderName = '';

	/**
	 * @return {string}
	 */
	CacheUserStorage.prototype.getFolderInboxName = function ()
	{
		return '' === this.sInboxFolderName ? 'INBOX' : this.sInboxFolderName;
	};

	/**
	 * @param {string} sFolderHash
	 * @return {string}
	 */
	CacheUserStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
	{
		return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
	};

	/**
	 * @param {string} sFolderHash
	 * @param {string} sFolderFullNameRaw
	 */
	CacheUserStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
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
	CacheUserStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sFolderHash
	 */
	CacheUserStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
	{
		if ('' !== sFolderFullNameRaw)
		{
			this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
		}
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheUserStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUidNext
	 */
	CacheUserStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
	{
		this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {?FolderModel}
	 */
	CacheUserStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {?FolderModel} oFolder
	 */
	CacheUserStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
	{
		this.oFoldersCache[sFolderFullNameRaw] = oFolder;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 */
	CacheUserStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
	{
		this.setFolderToCacheList(sFolderFullNameRaw, null);
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @return {?Array}
	 */
	CacheUserStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
	{
		return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
			this.oMessageFlagsCache[sFolderFullName][sUid] : null;
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @param {Array} aFlagsCache
	 */
	CacheUserStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
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
	CacheUserStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
	{
		this.oMessageFlagsCache[sFolderFullName] = {};
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	CacheUserStorage.prototype.initMessageFlagsFromCache = function (oMessage)
	{
		if (oMessage)
		{
			var
				self = this,
				sUid = oMessage.uid,
				aFlags = this.getMessageFlagsFromCache(oMessage.folderFullNameRaw, sUid),
				mUnseenSubUid = null,
				mFlaggedSubUid = null
			;

			if (aFlags && 0 < aFlags.length)
			{
				oMessage.flagged(!!aFlags[1]);

				if (!oMessage.__simple_message__)
				{
					oMessage.unseen(!!aFlags[0]);
					oMessage.answered(!!aFlags[2]);
					oMessage.forwarded(!!aFlags[3]);
					oMessage.isReadReceipt(!!aFlags[4]);
					oMessage.deletedMark(!!aFlags[5]);
				}
			}

			if (0 < oMessage.threads().length)
			{
				mUnseenSubUid = _.find(oMessage.threads(), function (sSubUid) {
					if (sUid === sSubUid){
						return false;
					}
					var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, sSubUid);
					return aFlags && 0 < aFlags.length && !!aFlags[0];
				});

				mFlaggedSubUid = _.find(oMessage.threads(), function (sSubUid) {
					if (sUid === sSubUid){
						return false;
					}
					var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, sSubUid);
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
	CacheUserStorage.prototype.storeMessageFlagsToCache = function (oMessage)
	{
		if (oMessage)
		{
			this.setMessageFlagsToCache(
				oMessage.folderFullNameRaw,
				oMessage.uid,
				[oMessage.unseen(), oMessage.flagged(), oMessage.answered(), oMessage.forwarded(),
					oMessage.isReadReceipt(),  oMessage.deletedMark()]
			);
		}
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @param {Array} aFlags
	 */
	CacheUserStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
	{
		if (Utils.isArray(aFlags) && 0 < aFlags.length)
		{
			this.setMessageFlagsToCache(sFolder, sUid, aFlags);
		}
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @param {number} iSetAction
	 */
	CacheUserStorage.prototype.storeMessageFlagsToCacheBySetAction = function (sFolder, sUid, iSetAction)
	{
		var iUnread = 0, aFlags = this.getMessageFlagsFromCache(sFolder, sUid);
		if (Utils.isArray(aFlags) && 0 < aFlags.length)
		{
			if (aFlags[0])
			{
				iUnread = 1;
			}

			switch (iSetAction)
			{
				case Enums.MessageSetAction.SetSeen:
					aFlags[0] = false;
					break;
				case Enums.MessageSetAction.UnsetSeen:
					aFlags[0] = true;
					break;
				case Enums.MessageSetAction.SetFlag:
					aFlags[1] = true;
					break;
				case Enums.MessageSetAction.UnsetFlag:
					aFlags[1] = false;
					break;
			}

			this.setMessageFlagsToCache(sFolder, sUid, aFlags);
		}

		return iUnread;
	};

	module.exports = new CacheUserStorage();

}());