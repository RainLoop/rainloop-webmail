/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractCacheStorage
 */
function WebMailCacheStorage()
{
	AbstractCacheStorage.call(this);

	this.oFoldersCache = {};
	this.oFoldersNamesCache = {};
	this.oFolderHashCache = {};
	this.oFolderUidNextCache = {};
	this.oMessageListHashCache = {};
	this.oMessageFlagsCache = {};
	this.oNewMessage = {};
	this.oRequestedMessage = {};
}

_.extend(WebMailCacheStorage.prototype, AbstractCacheStorage.prototype);

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFoldersCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFoldersNamesCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFolderHashCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFolderUidNextCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oMessageListHashCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oMessageFlagsCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oBodies = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oNewMessage = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oRequestedMessage = {};

WebMailCacheStorage.prototype.clear = function ()
{
	AbstractCacheStorage.prototype.clear.call(this);
	
	this.oFoldersCache = {};
	this.oFoldersNamesCache = {};
	this.oFolderHashCache = {};
	this.oFolderUidNextCache = {};
	this.oMessageListHashCache = {};
	this.oMessageFlagsCache = {};
	this.oBodies = {};
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUid
 * @return {string}
 */
WebMailCacheStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
{
	return sFolderFullNameRaw + '#' + sUid;
};

/**
 * @param {string} sFolder
 * @param {string} sUid
 */
WebMailCacheStorage.prototype.addRequestedMessage = function (sFolder, sUid)
{
	this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
};

/**
 * @param {string} sFolder
 * @param {string} sUid
 * @return {boolean}
 */
WebMailCacheStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
{
	return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUid
 */
WebMailCacheStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
{
	this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUid
 */
WebMailCacheStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
{
	if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
		return true;
	}

	return false;
};

WebMailCacheStorage.prototype.clearNewMessageCache = function ()
{
	this.oNewMessage = {};
};

/**
 * @param {string} sFolderHash
 * @return {string}
 */
WebMailCacheStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
{
	return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
};

/**
 * @param {string} sFolderHash
 * @param {string} sFolderFullNameRaw
 */
WebMailCacheStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
{
	this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
};

/**
 * @param {string} sFolderFullNameRaw
 * @return {string}
 */
WebMailCacheStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
{
	return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sFolderHash
 */
WebMailCacheStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
{
	this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
};

/**
 * @param {string} sFolderFullNameRaw
 * @return {string}
 */
WebMailCacheStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
{
	return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUidNext
 */
WebMailCacheStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
{
	this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
};

/**
 * @param {string} sFolderFullNameRaw
 * @return {?FolderModel}
 */
WebMailCacheStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
{
	return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {?FolderModel} oFolder
 */
WebMailCacheStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
{
	this.oFoldersCache[sFolderFullNameRaw] = oFolder;
};

/**
 * @param {string} sFolderFullNameRaw
 */
WebMailCacheStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
{
	this.setFolderToCacheList(sFolderFullNameRaw, null);
};

/**
 * @param {string} sFolderFullName
 * @param {string} sUid
 * @return {?Array}
 */
WebMailCacheStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
{
	return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
		this.oMessageFlagsCache[sFolderFullName][sUid] : null;
};

/**
 * @param {string} sFolderFullName
 * @param {string} sUid
 * @param {Array} aFlagsCache
 */
WebMailCacheStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
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
WebMailCacheStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
{
	this.oMessageFlagsCache[sFolderFullName] = {};
};

/**
 * @param {(MessageModel|null)} oMessage
 */
WebMailCacheStorage.prototype.initMessageFlagsFromCache = function (oMessage)
{
	if (oMessage)
	{
		var
			self = this,
			aFlags = this.getMessageFlagsFromCache(oMessage.folderFullNameRaw, oMessage.uid),
			mUnseenSubUid = null,
			mFlaggedSubUid = null
		;

		if (aFlags && 5 === aFlags.length)
		{
			oMessage.unseen(aFlags[0]);
			oMessage.flagged(aFlags[1]);
			oMessage.answered(aFlags[2]);
			oMessage.forwarded(aFlags[3]);
			oMessage.isReadReceipt(aFlags[4]);
		}

		if (0 < oMessage.threads().length)
		{
			mUnseenSubUid = _.find(oMessage.threads(), function (iSubUid) {
				var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
				return aFlags && 4 === aFlags.length && !!aFlags[0];
			});

			mFlaggedSubUid = _.find(oMessage.threads(), function (iSubUid) {
				var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
				return aFlags && 4 === aFlags.length && !!aFlags[1];
			});

			oMessage.hasUnseenSubMessage(mUnseenSubUid && 0 < Utils.pInt(mUnseenSubUid));
			oMessage.hasFlaggedSubMessage(mFlaggedSubUid && 0 < Utils.pInt(mFlaggedSubUid));
		}
	}
};

/**
 * @param {(MessageModel|null)} oMessage
 */
WebMailCacheStorage.prototype.storeMessageFlagsToCache = function (oMessage)
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
WebMailCacheStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
{
	if (Utils.isArray(aFlags) && 4 === aFlags.length)
	{
		this.setMessageFlagsToCache(sFolder, sUid, aFlags);
	}
};
