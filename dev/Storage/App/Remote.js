/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils'),
		Consts = require('Common/Consts'),
		Base64 = require('Common/Base64'),

		Settings = require('Storage/Settings'),
		Cache = require('Storage/App/Cache'),
		Data = require('Storage/App/Data'),

		AbstractRemoteStorage = require('Storage/AbstractRemote')
	;

	/**
	 * @constructor
	 * @extends AbstractRemoteStorage
	 */
	function RemoteAppStorage()
	{
		AbstractRemoteStorage.call(this);

		this.oRequests = {};
	}

	_.extend(RemoteAppStorage.prototype, AbstractRemoteStorage.prototype);

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.folders = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Folders', {
			'SentFolder': Settings.settingsGet('SentFolder'),
			'DraftFolder': Settings.settingsGet('DraftFolder'),
			'SpamFolder': Settings.settingsGet('SpamFolder'),
			'TrashFolder': Settings.settingsGet('TrashFolder'),
			'ArchiveFolder': Settings.settingsGet('ArchiveFolder')
		}, null, '', ['Folders']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmail
	 * @param {string} sLogin
	 * @param {string} sPassword
	 * @param {boolean} bSignMe
	 * @param {string=} sLanguage
	 * @param {string=} sAdditionalCode
	 * @param {boolean=} bAdditionalCodeSignMe
	 */
	RemoteAppStorage.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe)
	{
		this.defaultRequest(fCallback, 'Login', {
			'Email': sEmail,
			'Login': sLogin,
			'Password': sPassword,
			'Language': sLanguage || '',
			'AdditionalCode': sAdditionalCode || '',
			'AdditionalCodeSignMe': bAdditionalCodeSignMe ? '1' : '0',
			'SignMe': bSignMe ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.getTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'GetTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.createTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.clearTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.showTwoFactorSecret = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sCode
	 */
	RemoteAppStorage.prototype.testTwoFactor = function (fCallback, sCode)
	{
		this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
			'Code': sCode
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 */
	RemoteAppStorage.prototype.enableTwoFactor = function (fCallback, bEnable)
	{
		this.defaultRequest(fCallback, 'EnableTwoFactor', {
			'Enable': bEnable ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.clearTwoFactorInfo = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.contactsSync = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ContactsSync', null, Consts.Defaults.ContactsSyncAjaxTimeout);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 * @param {string} sUrl
	 * @param {string} sUser
	 * @param {string} sPassword
	 */
	RemoteAppStorage.prototype.saveContactsSyncData = function (fCallback, bEnable, sUrl, sUser, sPassword)
	{
		this.defaultRequest(fCallback, 'SaveContactsSyncData', {
			'Enable': bEnable ? '1' : '0',
			'Url': sUrl,
			'User': sUser,
			'Password': sPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmail
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	RemoteAppStorage.prototype.accountAdd = function (fCallback, sEmail, sLogin, sPassword)
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
	RemoteAppStorage.prototype.accountDelete = function (fCallback, sEmailToDelete)
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
	RemoteAppStorage.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc)
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
	RemoteAppStorage.prototype.identityDelete = function (fCallback, sIdToDelete)
	{
		this.defaultRequest(fCallback, 'IdentityDelete', {
			'IdToDelete': sIdToDelete
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.accountsAndIdentities = function (fCallback)
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
	RemoteAppStorage.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, bSilent)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

		var
			sFolderHash = Cache.getFolderHash(sFolderFullNameRaw)
		;

		bSilent = Utils.isUnd(bSilent) ? false : !!bSilent;
		iOffset = Utils.isUnd(iOffset) ? 0 : Utils.pInt(iOffset);
		iLimit = Utils.isUnd(iOffset) ? 20 : Utils.pInt(iLimit);
		sSearch = Utils.pString(sSearch);

		if ('' !== sFolderHash && ('' === sSearch || -1 === sSearch.indexOf('is:')))
		{
			this.defaultRequest(fCallback, 'MessageList', {},
				'' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
				'MessageList/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iOffset,
					iLimit,
					sSearch,
					Data.projectHash(),
					sFolderHash,
					'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
					Data.threading() && Data.useThreads() ? '1' : '0',
					Data.threading() && sFolderFullNameRaw === Data.messageListThreadFolder() ? Data.messageListThreadUids().join(',') : ''
				].join(String.fromCharCode(0))), bSilent ? [] : ['MessageList']);
		}
		else
		{
			this.defaultRequest(fCallback, 'MessageList', {
				'Folder': sFolderFullNameRaw,
				'Offset': iOffset,
				'Limit': iLimit,
				'Search': sSearch,
				'UidNext': 'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
				'UseThreads': Data.threading() && Data.useThreads() ? '1' : '0',
				'ExpandedThreadUid': Data.threading() && sFolderFullNameRaw === Data.messageListThreadFolder() ? Data.messageListThreadUids().join(',') : ''
			}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout, '', bSilent ? [] : ['MessageList']);
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aDownloads
	 */
	RemoteAppStorage.prototype.messageUploadAttachments = function (fCallback, aDownloads)
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
	RemoteAppStorage.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
		iUid = Utils.pInt(iUid);

		if (Cache.getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
		{
			this.defaultRequest(fCallback, 'Message', {}, null,
				'Message/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iUid,
					Data.projectHash(),
					Data.threading() && Data.useThreads() ? '1' : '0'
				].join(String.fromCharCode(0))), ['Message']);

			return true;
		}

		return false;
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aExternals
	 */
	RemoteAppStorage.prototype.composeUploadExternals = function (fCallback, aExternals)
	{
		this.defaultRequest(fCallback, 'ComposeUploadExternals', {
			'Externals': aExternals
		}, 999000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sUrl
	 * @param {string} sAccessToken
	 */
	RemoteAppStorage.prototype.composeUploadDrive = function (fCallback, sUrl, sAccessToken)
	{
		this.defaultRequest(fCallback, 'ComposeUploadDrive', {
			'AccessToken': sAccessToken,
			'Url': sUrl
		}, 999000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {Array=} aList = []
	 */
	RemoteAppStorage.prototype.folderInformation = function (fCallback, sFolder, aList)
	{
		var
			bRequest = true,
			aUids = []
		;

		if (Utils.isArray(aList) && 0 < aList.length)
		{
			bRequest = false;
			_.each(aList, function (oMessageListItem) {
				if (!Cache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, oMessageListItem.uid))
				{
					aUids.push(oMessageListItem.uid);
				}

				if (0 < oMessageListItem.threads().length)
				{
					_.each(oMessageListItem.threads(), function (sUid) {
						if (!Cache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, sUid))
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
				'UidNext': 'INBOX' === sFolder ? Cache.getFolderUidNext(sFolder) : ''
			});
		}
		else if (Data.useThreads())
		{
			require('App/App').reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aFolders
	 */
	RemoteAppStorage.prototype.folderInformationMultiply = function (fCallback, aFolders)
	{
		this.defaultRequest(fCallback, 'FolderInformationMultiply', {
			'Folders': aFolders
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.logout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Logout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetFlagged
	 */
	RemoteAppStorage.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
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
	RemoteAppStorage.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
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
	RemoteAppStorage.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
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
	RemoteAppStorage.prototype.saveMessage = function (fCallback, sMessageFolder, sMessageUid, sDraftFolder,
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
	 * @param {string} sReadReceipt
	 * @param {string} sSubject
	 * @param {string} sText
	 */
	RemoteAppStorage.prototype.sendReadReceiptMessage = function (fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText)
	{
		this.defaultRequest(fCallback, 'SendReadReceiptMessage', {
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'ReadReceipt': sReadReceipt,
			'Subject': sSubject,
			'Text': sText
		});
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
	 * @param {boolean} bRequestReadReceipt
	 */
	RemoteAppStorage.prototype.sendMessage = function (fCallback, sMessageFolder, sMessageUid, sSentFolder,
		sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences, bRequestReadReceipt)
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
			'ReadReceiptRequest': bRequestReadReceipt ? '1' : '0',
			'Attachments': aAttachments
		}, Consts.Defaults.SendMessageAjaxTimeout);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	RemoteAppStorage.prototype.saveSystemFolders = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	RemoteAppStorage.prototype.saveSettings = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sPrevPassword
	 * @param {string} sNewPassword
	 */
	RemoteAppStorage.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
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
	RemoteAppStorage.prototype.folderCreate = function (fCallback, sNewFolderName, sParentName)
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
	RemoteAppStorage.prototype.folderDelete = function (fCallback, sFolderFullNameRaw)
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
	RemoteAppStorage.prototype.folderRename = function (fCallback, sPrevFolderFullNameRaw, sNewFolderName)
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
	RemoteAppStorage.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
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
	RemoteAppStorage.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
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
	 * @param {string=} sLearning
	 */
	RemoteAppStorage.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids, sLearning)
	{
		this.defaultRequest(fCallback, 'MessageMove', {
			'FromFolder': sFolder,
			'ToFolder': sToFolder,
			'Uids': aUids.join(','),
			'Learning': sLearning || ''
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 */
	RemoteAppStorage.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
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
	RemoteAppStorage.prototype.messagesDelete = function (fCallback, sFolder, aUids)
	{
		this.defaultRequest(fCallback, 'MessageDelete', {
			'Folder': sFolder,
			'Uids': aUids.join(',')
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.appDelayStart = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AppDelayStart');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.quota = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Quota');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {number} iOffset
	 * @param {number} iLimit
	 * @param {string} sSearch
	 */
	RemoteAppStorage.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
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
	RemoteAppStorage.prototype.contactSave = function (fCallback, sRequestUid, sUid, aProperties)
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
	RemoteAppStorage.prototype.contactsDelete = function (fCallback, aUids)
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
	RemoteAppStorage.prototype.suggestions = function (fCallback, sQuery, iPage)
	{
		this.defaultRequest(fCallback, 'Suggestions', {
			'Query': sQuery,
			'Page': iPage
		}, null, '', ['Suggestions']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.facebookUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.facebookDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.twitterUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.twitterDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.googleUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.googleDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteAppStorage.prototype.socialUsers = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialUsers');
	};

	module.exports = new RemoteAppStorage();

}());