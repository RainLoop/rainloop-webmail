
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils'),
		Consts = require('Common/Consts'),
		Base64 = require('Common/Base64'),

		Cache = require('Common/Cache'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings'),

		AppStore = require('Stores/User/App'),
		SettingsStore = require('Stores/User/Settings'),

		AbstractAjaxRemote = require('Remote/AbstractAjax')
	;

	/**
	 * @constructor
	 * @extends AbstractRemoteStorage
	 */
	function RemoteUserAjax()
	{
		AbstractAjaxRemote.call(this);

		this.oRequests = {};
	}

	_.extend(RemoteUserAjax.prototype, AbstractAjaxRemote.prototype);

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.folders = function (fCallback)
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
	RemoteUserAjax.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe)
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
	RemoteUserAjax.prototype.getTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'GetTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.createTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.clearTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.showTwoFactorSecret = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sCode
	 */
	RemoteUserAjax.prototype.testTwoFactor = function (fCallback, sCode)
	{
		this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
			'Code': sCode
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 */
	RemoteUserAjax.prototype.enableTwoFactor = function (fCallback, bEnable)
	{
		this.defaultRequest(fCallback, 'EnableTwoFactor', {
			'Enable': bEnable ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.clearTwoFactorInfo = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.contactsSync = function (fCallback)
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
	RemoteUserAjax.prototype.saveContactsSyncData = function (fCallback, bEnable, sUrl, sUser, sPassword)
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
	 * @param {string} sPassword
	 * @param {boolean=} bNew
	 */
	RemoteUserAjax.prototype.accountSetup = function (fCallback, sEmail, sPassword, bNew)
	{
		bNew = Utils.isUnd(bNew) ? true : !!bNew;

		this.defaultRequest(fCallback, 'AccountSetup', {
			'Email': sEmail,
			'Password': sPassword,
			'New': bNew ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmailToDelete
	 */
	RemoteUserAjax.prototype.accountDelete = function (fCallback, sEmailToDelete)
	{
		this.defaultRequest(fCallback, 'AccountDelete', {
			'EmailToDelete': sEmailToDelete
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aAccounts
	 * @param {Array} aIdentities
	 */
	RemoteUserAjax.prototype.accountsAndIdentitiesSortOrder = function (fCallback, aAccounts, aIdentities)
	{
		this.defaultRequest(fCallback, 'AccountsAndIdentitiesSortOrder', {
			'Accounts': aAccounts,
			'Identities': aIdentities
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sId
	 * @param {string} sEmail
	 * @param {string} sName
	 * @param {string} sReplyTo
	 * @param {string} sBcc
	 * @param {string} sSignature
	 * @param {boolean} bSignatureInsertBefore
	 */
	RemoteUserAjax.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc,
		sSignature, bSignatureInsertBefore)
	{
		this.defaultRequest(fCallback, 'IdentityUpdate', {
			'Id': sId,
			'Email': sEmail,
			'Name': sName,
			'ReplyTo': sReplyTo,
			'Bcc': sBcc,
			'Signature': sSignature,
			'SignatureInsertBefore': bSignatureInsertBefore ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sIdToDelete
	 */
	RemoteUserAjax.prototype.identityDelete = function (fCallback, sIdToDelete)
	{
		this.defaultRequest(fCallback, 'IdentityDelete', {
			'IdToDelete': sIdToDelete
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.accountsAndIdentities = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AccountsAndIdentities');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.accountsCounts = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AccountsCounts');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.filtersSave = function (fCallback,
		aFilters, sRaw, bRawIsActive)
	{
		this.defaultRequest(fCallback, 'FiltersSave', {
			'Raw': sRaw,
			'RawIsActive': bRawIsActive ? '1' : '0',
			'Filters': _.map(aFilters, function (oItem) {
				return oItem.toJson();
			})
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.filtersGet = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Filters', {});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.templates = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Templates', {});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.templateGetById = function (fCallback, sID)
	{
		this.defaultRequest(fCallback, 'TemplateGetByID', {
			'ID': sID
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.templateDelete = function (fCallback, sID)
	{
		this.defaultRequest(fCallback, 'TemplateDelete', {
			'IdToDelete': sID
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.templateSetup = function (fCallback, sID, sName, sBody)
	{
		this.defaultRequest(fCallback, 'TemplateSetup', {
			'ID': sID,
			'Name': sName,
			'Body': sBody
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {number=} iOffset = 0
	 * @param {number=} iLimit = 20
	 * @param {string=} sSearch = ''
	 * @param {string=} sThreadUid = ''
	 * @param {boolean=} bSilent = false
	 */
	RemoteUserAjax.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, sThreadUid, bSilent)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

		var
			sFolderHash = Cache.getFolderHash(sFolderFullNameRaw),
			bUseThreads = AppStore.threadsAllowed() && SettingsStore.useThreads(),
			sInboxUidNext = Cache.getFolderInboxName() === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : ''
		;

		bSilent = Utils.isUnd(bSilent) ? false : !!bSilent;
		iOffset = Utils.isUnd(iOffset) ? 0 : Utils.pInt(iOffset);
		iLimit = Utils.isUnd(iOffset) ? 20 : Utils.pInt(iLimit);
		sSearch = Utils.pString(sSearch);
		sThreadUid = Utils.pString(sThreadUid);

		if ('' !== sFolderHash && ('' === sSearch || -1 === sSearch.indexOf('is:')))
		{
			return this.defaultRequest(fCallback, 'MessageList', {},
				'' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
				'MessageList/' + Links.subQueryPrefix() + '/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iOffset,
					iLimit,
					sSearch,
					AppStore.projectHash(),
					sFolderHash,
					sInboxUidNext,
					bUseThreads ? '1' : '0',
					bUseThreads ? sThreadUid : ''
				].join(String.fromCharCode(0))), bSilent ? [] : ['MessageList']);
		}
		else
		{
			return this.defaultRequest(fCallback, 'MessageList', {
				'Folder': sFolderFullNameRaw,
				'Offset': iOffset,
				'Limit': iLimit,
				'Search': sSearch,
				'UidNext': sInboxUidNext,
				'UseThreads': bUseThreads ? '1' : '0',
				'ThreadUid': bUseThreads ? sThreadUid : ''
			}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
				'', bSilent ? [] : ['MessageList']);
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aDownloads
	 */
	RemoteUserAjax.prototype.messageUploadAttachments = function (fCallback, aDownloads)
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
	RemoteUserAjax.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
		iUid = Utils.pInt(iUid);

		if (Cache.getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
		{
			this.defaultRequest(fCallback, 'Message', {}, null,
				'Message/' + Links.subQueryPrefix() + '/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iUid,
					AppStore.projectHash(),
					AppStore.threadsAllowed() && SettingsStore.useThreads() ? '1' : '0'
				].join(String.fromCharCode(0))), ['Message']);

			return true;
		}

		return false;
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aExternals
	 */
	RemoteUserAjax.prototype.composeUploadExternals = function (fCallback, aExternals)
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
	RemoteUserAjax.prototype.composeUploadDrive = function (fCallback, sUrl, sAccessToken)
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
	RemoteUserAjax.prototype.folderInformation = function (fCallback, sFolder, aList)
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
				'UidNext': Cache.getFolderInboxName() === sFolder ? Cache.getFolderUidNext(sFolder) : ''
			});
		}
		else if (SettingsStore.useThreads())
		{
			require('App/User').reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aFolders
	 */
	RemoteUserAjax.prototype.folderInformationMultiply = function (fCallback, aFolders)
	{
		this.defaultRequest(fCallback, 'FolderInformationMultiply', {
			'Folders': aFolders
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.logout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Logout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetFlagged
	 */
	RemoteUserAjax.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
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
	RemoteUserAjax.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
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
	RemoteUserAjax.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
	{
		this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
			'Folder': sFolderFullNameRaw,
			'SetAction': bSetSeen ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sIdentityID
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sDraftFolder
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
	 * @param {boolean} bMarkAsImportant
	 */
	RemoteUserAjax.prototype.saveMessage = function (fCallback, sIdentityID, sMessageFolder, sMessageUid, sDraftFolder,
		sTo, sCc, sBcc, sReplyTo, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences, bMarkAsImportant)
	{
		this.defaultRequest(fCallback, 'SaveMessage', {
			'IdentityID': sIdentityID,
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'DraftFolder': sDraftFolder,
			'To': sTo,
			'Cc': sCc,
			'Bcc': sBcc,
			'ReplyTo': sReplyTo,
			'Subject': sSubject,
			'TextIsHtml': bTextIsHtml ? '1' : '0',
			'Text': sText,
			'DraftInfo': aDraftInfo,
			'InReplyTo': sInReplyTo,
			'References': sReferences,
			'MarkAsImportant': bMarkAsImportant ? '1' : '0',
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
	RemoteUserAjax.prototype.sendReadReceiptMessage = function (fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText)
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
	 * @param {string} sIdentityID
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sSentFolder
	 * @param {string} sTo
	 * @param {string} sCc
	 * @param {string} sBcc
	 * @param {string} sReplyTo
	 * @param {string} sSubject
	 * @param {boolean} bTextIsHtml
	 * @param {string} sText
	 * @param {Array} aAttachments
	 * @param {(Array|null)} aDraftInfo
	 * @param {string} sInReplyTo
	 * @param {string} sReferences
	 * @param {boolean} bRequestDsn
	 * @param {boolean} bRequestReadReceipt
	 * @param {boolean} bMarkAsImportant
	 */
	RemoteUserAjax.prototype.sendMessage = function (fCallback, sIdentityID, sMessageFolder, sMessageUid, sSentFolder,
		sTo, sCc, sBcc, sReplyTo, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences,
		bRequestDsn, bRequestReadReceipt, bMarkAsImportant)
	{
		this.defaultRequest(fCallback, 'SendMessage', {
			'IdentityID': sIdentityID,
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'SentFolder': sSentFolder,
			'To': sTo,
			'Cc': sCc,
			'Bcc': sBcc,
			'ReplyTo': sReplyTo,
			'Subject': sSubject,
			'TextIsHtml': bTextIsHtml ? '1' : '0',
			'Text': sText,
			'DraftInfo': aDraftInfo,
			'InReplyTo': sInReplyTo,
			'References': sReferences,
			'Dsn': bRequestDsn ? '1' : '0',
			'ReadReceiptRequest': bRequestReadReceipt ? '1' : '0',
			'MarkAsImportant': bMarkAsImportant ? '1' : '0',
			'Attachments': aAttachments
		}, Consts.Defaults.SendMessageAjaxTimeout);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	RemoteUserAjax.prototype.saveSystemFolders = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	RemoteUserAjax.prototype.saveSettings = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sPrevPassword
	 * @param {string} sNewPassword
	 */
	RemoteUserAjax.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
	{
		this.defaultRequest(fCallback, 'ChangePassword', {
			'PrevPassword': sPrevPassword,
			'NewPassword': sNewPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 */
	RemoteUserAjax.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
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
	RemoteUserAjax.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
	{
		this.defaultRequest(fCallback, 'FolderSubscribe', {
			'Folder': sFolderFullNameRaw,
			'Subscribe': bSubscribe ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bCheckable
	 */
	RemoteUserAjax.prototype.folderSetCheckable = function (fCallback, sFolderFullNameRaw, bCheckable)
	{
		this.defaultRequest(fCallback, 'FolderCheckable', {
			'Folder': sFolderFullNameRaw,
			'Checkable': bCheckable ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 * @param {string=} sLearning
	 * @param {boolean=} bMarkAsRead
	 */
	RemoteUserAjax.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids, sLearning, bMarkAsRead)
	{
		this.defaultRequest(fCallback, 'MessageMove', {
			'FromFolder': sFolder,
			'ToFolder': sToFolder,
			'Uids': aUids.join(','),
			'MarkAsRead': bMarkAsRead ? '1' : '0',
			'Learning': sLearning || ''
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 */
	RemoteUserAjax.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
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
	RemoteUserAjax.prototype.messagesDelete = function (fCallback, sFolder, aUids)
	{
		this.defaultRequest(fCallback, 'MessageDelete', {
			'Folder': sFolder,
			'Uids': aUids.join(',')
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.appDelayStart = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AppDelayStart');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.quota = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Quota');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {number} iOffset
	 * @param {number} iLimit
	 * @param {string} sSearch
	 */
	RemoteUserAjax.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
	{
		this.defaultRequest(fCallback, 'Contacts', {
			'Offset': iOffset,
			'Limit': iLimit,
			'Search': sSearch
		}, null, '', ['Contacts']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sRequestUid
	 * @param {string} sUid
	 * @param {Array} aProperties
	 */
	RemoteUserAjax.prototype.contactSave = function (fCallback, sRequestUid, sUid, aProperties)
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
	RemoteUserAjax.prototype.contactsDelete = function (fCallback, aUids)
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
	RemoteUserAjax.prototype.suggestions = function (fCallback, sQuery, iPage)
	{
		this.defaultRequest(fCallback, 'Suggestions', {
			'Query': sQuery,
			'Page': iPage
		}, null, '', ['Suggestions']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.clearUserBackground = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearUserBackground');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.facebookUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.facebookDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.twitterUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.twitterDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.googleUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.googleDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteUserAjax.prototype.socialUsers = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialUsers');
	};

	module.exports = new RemoteUserAjax();

}());