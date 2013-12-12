/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractAjaxRemoteStorage
 */
function WebMailAjaxRemoteStorage()
{
	AbstractAjaxRemoteStorage.call(this);
	
	this.oRequests = {};
}

_.extend(WebMailAjaxRemoteStorage.prototype, AbstractAjaxRemoteStorage.prototype);

/**
 * @param {?Function} fCallback
 * @param {boolean=} bUseCache = true
 */
WebMailAjaxRemoteStorage.prototype.folders = function (fCallback, bUseCache)
{
	var sFoldersHash = RL.data().lastFoldersHash;

	bUseCache = Utils.isUnd(bUseCache) ? false : !!bUseCache;
	if (bUseCache && '' !== sFoldersHash)
	{
		this.defaultRequest(fCallback, 'Folders', {}, null, 'Folders/' + RL.data().projectHash() + '-' + sFoldersHash, ['Folders']);
	}
	else
	{
		this.defaultRequest(fCallback, 'Folders', {}, null, '', ['Folders']);
	}
};

/**
 * @param {?Function} fCallback
 * @param {string} sEmail
 * @param {string} sLogin
 * @param {string} sPassword
 * @param {boolean} bSignMe
 * @param {string=} sLanguage
 */
WebMailAjaxRemoteStorage.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage)
{
	this.defaultRequest(fCallback, 'Login', {
		'Email': sEmail,
		'Login': sLogin,
		'Password': sPassword,
		'Language': sLanguage || '',
		'SignMe': bSignMe ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sEmail
 * @param {string} sLogin
 * @param {string} sPassword
 */
WebMailAjaxRemoteStorage.prototype.accountAdd = function (fCallback, sEmail, sLogin, sPassword)
{
	this.defaultRequest(fCallback, 'AccountAdd', {
		'Email': sEmail,
		'Login': sLogin,
		'Password': sPassword
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sEmailToDelete
 */
WebMailAjaxRemoteStorage.prototype.accountDelete = function (fCallback, sEmailToDelete)
{
	this.defaultRequest(fCallback, 'AccountDelete', {
		'EmailToDelete': sEmailToDelete
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sId
 * @param {string} sEmail
 * @param {string} sName
 * @param {string} sReplyTo
 * @param {string} sBcc
 */
WebMailAjaxRemoteStorage.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc)
{
	this.defaultRequest(fCallback, 'IdentityUpdate', {
		'Id': sId,
		'Email': sEmail,
		'Name': sName,
		'ReplyTo': sReplyTo,
		'Bcc': sBcc
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sIdToDelete
 */
WebMailAjaxRemoteStorage.prototype.identityDelete = function (fCallback, sIdToDelete)
{
	this.defaultRequest(fCallback, 'IdentityDelete', {
		'IdToDelete': sIdToDelete
	});
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.accountsAndIdentities = function (fCallback)
{
	this.defaultRequest(fCallback, 'AccountsAndIdentities');
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {number=} iOffset = 0
 * @param {number=} iLimit = 20
 * @param {string=} sSearch = ''
 * @param {boolean=} bSilent = false
 */
WebMailAjaxRemoteStorage.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, bSilent)
{
	sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

	var
		oData = RL.data(),
		sFolderHash = RL.cache().getFolderHash(sFolderFullNameRaw)
	;

	bSilent = Utils.isUnd(bSilent) ? false : !!bSilent;
	iOffset = Utils.isUnd(iOffset) ? 0 : Utils.pInt(iOffset);
	iLimit = Utils.isUnd(iOffset) ? 20 : Utils.pInt(iLimit);
	sSearch = Utils.pString(sSearch);

	if ('' !== sFolderHash)
	{
		this.defaultRequest(fCallback, 'MessageList', {},
			'' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
			'MessageList/' + Base64.urlsafe_encode([
				sFolderFullNameRaw,
				iOffset,
				iLimit,
				sSearch,
				oData.projectHash(),
				sFolderHash,
				'INBOX' === sFolderFullNameRaw ? RL.cache().getFolderUidNext(sFolderFullNameRaw) : '',
				oData.threading() && oData.useThreads() ? '1' : '0',
				oData.threading() && sFolderFullNameRaw === oData.messageListThreadFolder() ? oData.messageListThreadUids().join(',') : ''
			].join(String.fromCharCode(0))), bSilent ? [] : ['MessageList']);
	}
	else
	{
		this.defaultRequest(fCallback, 'MessageList', {
			'Folder': sFolderFullNameRaw,
			'Offset': iOffset,
			'Limit': iLimit,
			'Search': sSearch,
			'UidNext': 'INBOX' === sFolderFullNameRaw ? RL.cache().getFolderUidNext(sFolderFullNameRaw) : '',
			'UseThreads': RL.data().threading() && RL.data().useThreads() ? '1' : '0',
			'ExpandedThreadUid': oData.threading() && sFolderFullNameRaw === oData.messageListThreadFolder() ? oData.messageListThreadUids().join(',') : ''
		}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout, '', bSilent ? [] : ['MessageList']);
	}
};

/**
 * @param {?Function} fCallback
 * @param {Array} aDownloads
 */
WebMailAjaxRemoteStorage.prototype.messageUploadAttachments = function (fCallback, aDownloads)
{
	this.defaultRequest(fCallback, 'MessageUploadAttachments', {
		'Attachments': aDownloads
	}, 999000);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {number} iUid
 * @return {boolean}
 */
WebMailAjaxRemoteStorage.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
{
	sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
	iUid = Utils.pInt(iUid);

	if (RL.cache().getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
	{
		this.defaultRequest(fCallback, 'Message', {}, null,
			'Message/' + Base64.urlsafe_encode([
				sFolderFullNameRaw,
				iUid,
				RL.data().projectHash(),
				RL.data().threading() && RL.data().useThreads() ? '1' : '0'
			].join(String.fromCharCode(0))), ['Message']);

		return true;
	}

	return false;
};

/**
 * @param {?Function} fCallback
 * @param {Array} aExternals
 */
WebMailAjaxRemoteStorage.prototype.composeUploadExternals = function (fCallback, aExternals)
{
	this.defaultRequest(fCallback, 'ComposeUploadExternals', {
		'Externals': aExternals
	}, 999000);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {Array=} aList = []
 */
WebMailAjaxRemoteStorage.prototype.folderInformation = function (fCallback, sFolder, aList)
{
	var
		bRequest = true,
		oCache = RL.cache(),
		aUids = []
	;

	if (Utils.isArray(aList) && 0 < aList.length)
	{
		bRequest = false;
		_.each(aList, function (oMessageListItem) {
			if (!oCache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, oMessageListItem.uid))
			{
				aUids.push(oMessageListItem.uid);
			}

			if (0 < oMessageListItem.threads().length)
			{
				_.each(oMessageListItem.threads(), function (sUid) {
					if (!oCache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, sUid))
					{
						aUids.push(sUid);
					}
				});
			}
		});

		if (0 < aUids.length)
		{
			bRequest = true;
		}
	}

	if (bRequest)
	{
		this.defaultRequest(fCallback, 'FolderInformation', {
			'Folder': sFolder,
			'FlagsUids': Utils.isArray(aUids) ? aUids.join(',') : '',
			'UidNext': 'INBOX' === sFolder ? RL.cache().getFolderUidNext(sFolder) : ''
		});
	}
	else if (RL.data().useThreads())
	{
		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.logout = function (fCallback)
{
	this.defaultRequest(fCallback, 'Logout');
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {Array} aUids
 * @param {boolean} bSetFlagged
 */
WebMailAjaxRemoteStorage.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
{
	this.defaultRequest(fCallback, 'MessageSetFlagged', {
		'Folder': sFolderFullNameRaw,
		'Uids': aUids.join(','),
		'SetAction': bSetFlagged ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {Array} aUids
 * @param {boolean} bSetSeen
 */
WebMailAjaxRemoteStorage.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
{
	this.defaultRequest(fCallback, 'MessageSetSeen', {
		'Folder': sFolderFullNameRaw,
		'Uids': aUids.join(','),
		'SetAction': bSetSeen ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {boolean} bSetSeen
 */
WebMailAjaxRemoteStorage.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
{
	this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
		'Folder': sFolderFullNameRaw,
		'SetAction': bSetSeen ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sMessageFolder
 * @param {string} sMessageUid
 * @param {string} sDraftFolder
 * @param {string} sFrom
 * @param {string} sTo
 * @param {string} sCc
 * @param {string} sBcc
 * @param {string} sSubject
 * @param {boolean} bTextIsHtml
 * @param {string} sText
 * @param {Array} aAttachments
 * @param {(Array|null)} aDraftInfo
 * @param {string} sInReplyTo
 * @param {string} sReferences
 */
WebMailAjaxRemoteStorage.prototype.saveMessage = function (fCallback, sMessageFolder, sMessageUid, sDraftFolder,
	sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences)
{
	this.defaultRequest(fCallback, 'SaveMessage', {
		'MessageFolder': sMessageFolder,
		'MessageUid': sMessageUid,
		'DraftFolder': sDraftFolder,
		'From': sFrom,
		'To': sTo,
		'Cc': sCc,
		'Bcc': sBcc,
		'Subject': sSubject,
		'TextIsHtml': bTextIsHtml ? '1' : '0',
		'Text': sText,
		'DraftInfo': aDraftInfo,
		'InReplyTo': sInReplyTo,
		'References': sReferences,
		'Attachments': aAttachments
	}, Consts.Defaults.SaveMessageAjaxTimeout);
};

/**
 * @param {?Function} fCallback
 * @param {string} sMessageFolder
 * @param {string} sMessageUid
 * @param {string} sSentFolder
 * @param {string} sFrom
 * @param {string} sTo
 * @param {string} sCc
 * @param {string} sBcc
 * @param {string} sSubject
 * @param {boolean} bTextIsHtml
 * @param {string} sText
 * @param {Array} aAttachments
 * @param {(Array|null)} aDraftInfo
 * @param {string} sInReplyTo
 * @param {string} sReferences
 */
WebMailAjaxRemoteStorage.prototype.sendMessage = function (fCallback, sMessageFolder, sMessageUid, sSentFolder,
	sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences)
{
	this.defaultRequest(fCallback, 'SendMessage', {
		'MessageFolder': sMessageFolder,
		'MessageUid': sMessageUid,
		'SentFolder': sSentFolder,
		'From': sFrom,
		'To': sTo,
		'Cc': sCc,
		'Bcc': sBcc,
		'Subject': sSubject,
		'TextIsHtml': bTextIsHtml ? '1' : '0',
		'Text': sText,
		'DraftInfo': aDraftInfo,
		'InReplyTo': sInReplyTo,
		'References': sReferences,
		'Attachments': aAttachments
	}, Consts.Defaults.SendMessageAjaxTimeout);
};

/**
 * @param {?Function} fCallback
 * @param {Object} oData
 */
WebMailAjaxRemoteStorage.prototype.saveSystemFolders = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
};

/**
 * @param {?Function} fCallback
 * @param {Object} oData
 */
WebMailAjaxRemoteStorage.prototype.saveSettings = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'SettingsUpdate', oData);
};

/**
 * @param {?Function} fCallback
 * @param {string} sPrevPassword
 * @param {string} sNewPassword
 */
WebMailAjaxRemoteStorage.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
{
	this.defaultRequest(fCallback, 'ChangePassword', {
		'PrevPassword': sPrevPassword,
		'NewPassword': sNewPassword
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sNewFolderName
 * @param {string} sParentName
 */
WebMailAjaxRemoteStorage.prototype.folderCreate = function (fCallback, sNewFolderName, sParentName)
{
	this.defaultRequest(fCallback, 'FolderCreate', {
		'Folder': sNewFolderName,
		'Parent': sParentName
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 */
WebMailAjaxRemoteStorage.prototype.folderDelete = function (fCallback, sFolderFullNameRaw)
{
	this.defaultRequest(fCallback, 'FolderDelete', {
		'Folder': sFolderFullNameRaw
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sPrevFolderFullNameRaw
 * @param {string} sNewFolderName
 */
WebMailAjaxRemoteStorage.prototype.folderRename = function (fCallback, sPrevFolderFullNameRaw, sNewFolderName)
{
	this.defaultRequest(fCallback, 'FolderRename', {
		'Folder': sPrevFolderFullNameRaw,
		'NewFolderName': sNewFolderName
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 */
WebMailAjaxRemoteStorage.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
{
	this.defaultRequest(fCallback, 'FolderClear', {
		'Folder': sFolderFullNameRaw
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {boolean} bSubscribe
 */
WebMailAjaxRemoteStorage.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
{
	this.defaultRequest(fCallback, 'FolderSubscribe', {
		'Folder': sFolderFullNameRaw,
		'Subscribe': bSubscribe ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {string} sToFolder
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids)
{
	this.defaultRequest(fCallback, 'MessageMove', {
		'FromFolder': sFolder,
		'ToFolder': sToFolder,
		'Uids': aUids.join(',')
	}, null, '', ['MessageList', 'Message']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {string} sToFolder
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
{
	this.defaultRequest(fCallback, 'MessageCopy', {
		'FromFolder': sFolder,
		'ToFolder': sToFolder,
		'Uids': aUids.join(',')
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.messagesDelete = function (fCallback, sFolder, aUids)
{
	this.defaultRequest(fCallback, 'MessageDelete', {
		'Folder': sFolder,
		'Uids': aUids.join(',')
	}, null, '', ['MessageList', 'Message']);
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.appDelayStart = function (fCallback)
{
	this.defaultRequest(fCallback, 'AppDelayStart');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.quota = function (fCallback)
{
	this.defaultRequest(fCallback, 'Quota');
};

/**
 * @param {?Function} fCallback
 * @param {number} iOffset
 * @param {number} iLimit
 * @param {string} sSearch
 */
WebMailAjaxRemoteStorage.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
{
	this.defaultRequest(fCallback, 'Contacts', {
		'Offset': iOffset,
		'Limit': iLimit,
		'Search': sSearch
	}, null, '', ['Contacts']);
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.contactSave = function (fCallback, sRequestUid, sUid, aProperties)
{
	this.defaultRequest(fCallback, 'ContactSave', {
		'RequestUid': sRequestUid,
		'Uid': Utils.trim(sUid),
		'Properties': aProperties
	});
};

/**
 * @param {?Function} fCallback
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.contactsDelete = function (fCallback, aUids)
{
	this.defaultRequest(fCallback, 'ContactsDelete', {
		'Uids': aUids.join(',')
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sQuery
 * @param {number} iPage
 */
WebMailAjaxRemoteStorage.prototype.suggestions = function (fCallback, sQuery, iPage)
{
	this.defaultRequest(fCallback, 'Suggestions', {
		'Query': sQuery,
		'Page': iPage
	}, null, '', ['Suggestions']);
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.servicesPics = function (fCallback)
{
	this.defaultRequest(fCallback, 'ServicesPics');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.emailsPicsHashes = function (fCallback)
{
	this.defaultRequest(fCallback, 'EmailsPicsHashes');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.facebookUser = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.facebookDisconnect = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.twitterUser = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.twitterDisconnect = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.googleUser = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.googleDisconnect = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.socialUsers = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialUsers');
};

