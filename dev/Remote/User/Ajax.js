import _ from '_';

import { pString, pInt, isArray, trim, boolToAjax } from 'Common/Utils';

import {
	CONTACTS_SYNC_AJAX_TIMEOUT,
	DEFAULT_AJAX_TIMEOUT,
	SEARCH_AJAX_TIMEOUT,
	SAVE_MESSAGE_AJAX_TIMEOUT,
	SEND_MESSAGE_AJAX_TIMEOUT
} from 'Common/Consts';

import {
	getFolderHash,
	getFolderInboxName,
	getFolderUidNext,
	getFolderFromCacheList,
	getMessageFlagsFromCache
} from 'Common/Cache';

import { subQueryPrefix } from 'Common/Links';
import * as Base64 from 'Common/Base64';
import * as Settings from 'Storage/Settings';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';

import { getApp } from 'Helper/Apps/User';

import { AbstractAjaxRemote } from 'Remote/AbstractAjax';

class RemoteUserAjax extends AbstractAjaxRemote {
	constructor() {
		super();
		this.oRequests = {};
	}

	/**
	 * @param {?Function} fCallback
	 */
	folders(fCallback) {
		this.defaultRequest(
			fCallback,
			'Folders',
			{
				'SentFolder': Settings.settingsGet('SentFolder'),
				'DraftFolder': Settings.settingsGet('DraftFolder'),
				'SpamFolder': Settings.settingsGet('SpamFolder'),
				'TrashFolder': Settings.settingsGet('TrashFolder'),
				'ArchiveFolder': Settings.settingsGet('ArchiveFolder')
			},
			null,
			'',
			['Folders']
		);
	}

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
	login(fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe) {
		this.defaultRequest(fCallback, 'Login', {
			'Email': sEmail,
			'Login': sLogin,
			'Password': sPassword,
			'Language': sLanguage || '',
			'AdditionalCode': sAdditionalCode || '',
			'AdditionalCodeSignMe': bAdditionalCodeSignMe ? '1' : '0',
			'SignMe': bSignMe ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	getTwoFactor(fCallback) {
		this.defaultRequest(fCallback, 'GetTwoFactorInfo');
	}

	/**
	 * @param {?Function} fCallback
	 */
	createTwoFactor(fCallback) {
		this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
	}

	/**
	 * @param {?Function} fCallback
	 */
	clearTwoFactor(fCallback) {
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	}

	/**
	 * @param {?Function} fCallback
	 */
	showTwoFactorSecret(fCallback) {
		this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sCode
	 */
	testTwoFactor(fCallback, sCode) {
		this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
			'Code': sCode
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 */
	enableTwoFactor(fCallback, bEnable) {
		this.defaultRequest(fCallback, 'EnableTwoFactor', {
			'Enable': bEnable ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	clearTwoFactorInfo(fCallback) {
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	}

	/**
	 * @param {?Function} fCallback
	 */
	contactsSync(fCallback) {
		this.defaultRequest(fCallback, 'ContactsSync', null, CONTACTS_SYNC_AJAX_TIMEOUT);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 * @param {string} sUrl
	 * @param {string} sUser
	 * @param {string} sPassword
	 */
	saveContactsSyncData(fCallback, bEnable, sUrl, sUser, sPassword) {
		this.defaultRequest(fCallback, 'SaveContactsSyncData', {
			'Enable': bEnable ? '1' : '0',
			'Url': sUrl,
			'User': sUser,
			'Password': sPassword
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmail
	 * @param {string} sPassword
	 * @param {boolean=} bNew
	 */
	accountSetup(fCallback, sEmail, sPassword, bNew = true) {
		this.defaultRequest(fCallback, 'AccountSetup', {
			'Email': sEmail,
			'Password': sPassword,
			'New': bNew ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmailToDelete
	 */
	accountDelete(fCallback, sEmailToDelete) {
		this.defaultRequest(fCallback, 'AccountDelete', {
			'EmailToDelete': sEmailToDelete
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aAccounts
	 * @param {Array} aIdentities
	 */
	accountsAndIdentitiesSortOrder(fCallback, aAccounts, aIdentities) {
		this.defaultRequest(fCallback, 'AccountsAndIdentitiesSortOrder', {
			'Accounts': aAccounts,
			'Identities': aIdentities
		});
	}

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
	identityUpdate(fCallback, sId, sEmail, sName, sReplyTo, sBcc, sSignature, bSignatureInsertBefore) {
		this.defaultRequest(fCallback, 'IdentityUpdate', {
			'Id': sId,
			'Email': sEmail,
			'Name': sName,
			'ReplyTo': sReplyTo,
			'Bcc': sBcc,
			'Signature': sSignature,
			'SignatureInsertBefore': bSignatureInsertBefore ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sIdToDelete
	 */
	identityDelete(fCallback, sIdToDelete) {
		this.defaultRequest(fCallback, 'IdentityDelete', {
			'IdToDelete': sIdToDelete
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	accountsAndIdentities(fCallback) {
		this.defaultRequest(fCallback, 'AccountsAndIdentities');
	}

	/**
	 * @param {?Function} fCallback
	 */
	accountsCounts(fCallback) {
		this.defaultRequest(fCallback, 'AccountsCounts');
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} filters
	 * @param {string} raw
	 * @param {boolean} isRawIsActive
	 */
	filtersSave(fCallback, filters, raw, isRawIsActive) {
		this.defaultRequest(fCallback, 'FiltersSave', {
			'Raw': raw,
			'RawIsActive': boolToAjax(isRawIsActive),
			'Filters': _.map(filters, (item) => item.toJson())
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	filtersGet(fCallback) {
		this.defaultRequest(fCallback, 'Filters', {});
	}

	/**
	 * @param {?Function} fCallback
	 */
	templates(fCallback) {
		this.defaultRequest(fCallback, 'Templates', {});
	}

	/**
	 * @param {Function} fCallback
	 * @param {string} sID
	 */
	templateGetById(fCallback, sID) {
		this.defaultRequest(fCallback, 'TemplateGetByID', {
			'ID': sID
		});
	}

	/**
	 * @param {Function} fCallback
	 * @param {string} sID
	 */
	templateDelete(fCallback, sID) {
		this.defaultRequest(fCallback, 'TemplateDelete', {
			'IdToDelete': sID
		});
	}

	/**
	 * @param {Function} fCallback
	 * @param {string} sID
	 * @param {string} sName
	 * @param {string} sBody
	 */
	templateSetup(fCallback, sID, sName, sBody) {
		this.defaultRequest(fCallback, 'TemplateSetup', {
			'ID': sID,
			'Name': sName,
			'Body': sBody
		});
	}

	/**
	 * @param {Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {number=} iOffset = 0
	 * @param {number=} iLimit = 20
	 * @param {string=} sSearch = ''
	 * @param {string=} sThreadUid = ''
	 * @param {boolean=} bSilent = false
	 */
	messageList(fCallback, sFolderFullNameRaw, iOffset = 0, iLimit = 20, sSearch = '', sThreadUid = '', bSilent = false) {
		sFolderFullNameRaw = pString(sFolderFullNameRaw);

		const folderHash = getFolderHash(sFolderFullNameRaw),
			useThreads = AppStore.threadsAllowed() && SettingsStore.useThreads(),
			inboxUidNext = getFolderInboxName() === sFolderFullNameRaw ? getFolderUidNext(sFolderFullNameRaw) : '';

		if ('' !== folderHash && ('' === sSearch || -1 === sSearch.indexOf('is:'))) {
			return this.defaultRequest(
				fCallback,
				'MessageList',
				{},
				'' === sSearch ? DEFAULT_AJAX_TIMEOUT : SEARCH_AJAX_TIMEOUT,
				'MessageList/' +
					subQueryPrefix() +
					'/' +
					Base64.urlsafe_encode(
						[
							sFolderFullNameRaw,
							iOffset,
							iLimit,
							sSearch,
							AppStore.projectHash(),
							folderHash,
							inboxUidNext,
							useThreads ? '1' : '0',
							useThreads ? sThreadUid : ''
						].join(String.fromCharCode(0))
					),
				bSilent ? [] : ['MessageList']
			);
		}

		return this.defaultRequest(
			fCallback,
			'MessageList',
			{
				Folder: sFolderFullNameRaw,
				Offset: iOffset,
				Limit: iLimit,
				Search: sSearch,
				UidNext: inboxUidNext,
				UseThreads: useThreads ? '1' : '0',
				ThreadUid: useThreads ? sThreadUid : ''
			},
			'' === sSearch ? DEFAULT_AJAX_TIMEOUT : SEARCH_AJAX_TIMEOUT,
			'',
			bSilent ? [] : ['MessageList']
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aDownloads
	 */
	messageUploadAttachments(fCallback, aDownloads) {
		this.defaultRequest(
			fCallback,
			'MessageUploadAttachments',
			{
				'Attachments': aDownloads
			},
			999000
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iUid
	 * @returns {boolean}
	 */
	message(fCallback, sFolderFullNameRaw, iUid) {
		sFolderFullNameRaw = pString(sFolderFullNameRaw);
		iUid = pInt(iUid);

		if (getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid) {
			this.defaultRequest(
				fCallback,
				'Message',
				{},
				null,
				'Message/' +
					subQueryPrefix() +
					'/' +
					Base64.urlsafe_encode(
						[
							sFolderFullNameRaw,
							iUid,
							AppStore.projectHash(),
							AppStore.threadsAllowed() && SettingsStore.useThreads() ? '1' : '0'
						].join(String.fromCharCode(0))
					),
				['Message']
			);

			return true;
		}

		return false;
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aExternals
	 */
	composeUploadExternals(fCallback, aExternals) {
		this.defaultRequest(
			fCallback,
			'ComposeUploadExternals',
			{
				'Externals': aExternals
			},
			999000
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sUrl
	 * @param {string} sAccessToken
	 */
	composeUploadDrive(fCallback, sUrl, sAccessToken) {
		this.defaultRequest(
			fCallback,
			'ComposeUploadDrive',
			{
				'AccessToken': sAccessToken,
				'Url': sUrl
			},
			999000
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(fCallback, folder, list = []) {
		let request = true;
		const uids = [];

		if (isArray(list) && 0 < list.length) {
			request = false;
			_.each(list, (messageListItem) => {
				if (!getMessageFlagsFromCache(messageListItem.folderFullNameRaw, messageListItem.uid)) {
					uids.push(messageListItem.uid);
				}

				if (0 < messageListItem.threads().length) {
					_.each(messageListItem.threads(), (uid) => {
						if (!getMessageFlagsFromCache(messageListItem.folderFullNameRaw, uid)) {
							uids.push(uid);
						}
					});
				}
			});

			if (0 < uids.length) {
				request = true;
			}
		}

		if (request) {
			this.defaultRequest(fCallback, 'FolderInformation', {
				'Folder': folder,
				'FlagsUids': isArray(uids) ? uids.join(',') : '',
				'UidNext': getFolderInboxName() === folder ? getFolderUidNext(folder) : ''
			});
		} else if (SettingsStore.useThreads()) {
			getApp().reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aFolders
	 */
	folderInformationMultiply(fCallback, aFolders) {
		this.defaultRequest(fCallback, 'FolderInformationMultiply', {
			'Folders': aFolders
		});
	}

	/**
	 * @param {?Function} fCallback
	 */
	logout(fCallback) {
		this.defaultRequest(fCallback, 'Logout');
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetFlagged
	 */
	messageSetFlagged(fCallback, sFolderFullNameRaw, aUids, bSetFlagged) {
		this.defaultRequest(fCallback, 'MessageSetFlagged', {
			'Folder': sFolderFullNameRaw,
			'Uids': aUids.join(','),
			'SetAction': bSetFlagged ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetSeen
	 */
	messageSetSeen(fCallback, sFolderFullNameRaw, aUids, bSetSeen) {
		this.defaultRequest(fCallback, 'MessageSetSeen', {
			'Folder': sFolderFullNameRaw,
			'Uids': aUids.join(','),
			'SetAction': bSetSeen ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bSetSeen
	 * @param {Array} aThreadUids = null
	 */
	messageSetSeenToAll(fCallback, sFolderFullNameRaw, bSetSeen, aThreadUids = null) {
		this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
			'Folder': sFolderFullNameRaw,
			'SetAction': bSetSeen ? '1' : '0',
			'ThreadUids': aThreadUids ? aThreadUids.join(',') : ''
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sIdentityID
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sDraftFolder
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
	 * @param {boolean} bMarkAsImportant
	 */
	saveMessage(
		fCallback,
		sIdentityID,
		sMessageFolder,
		sMessageUid,
		sDraftFolder,
		sTo,
		sCc,
		sBcc,
		sReplyTo,
		sSubject,
		bTextIsHtml,
		sText,
		aAttachments,
		aDraftInfo,
		sInReplyTo,
		sReferences,
		bMarkAsImportant
	) {
		this.defaultRequest(
			fCallback,
			'SaveMessage',
			{
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
			},
			SAVE_MESSAGE_AJAX_TIMEOUT
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sReadReceipt
	 * @param {string} sSubject
	 * @param {string} sText
	 */
	sendReadReceiptMessage(fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText) {
		this.defaultRequest(fCallback, 'SendReadReceiptMessage', {
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'ReadReceipt': sReadReceipt,
			'Subject': sSubject,
			'Text': sText
		});
	}

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
	sendMessage(
		fCallback,
		sIdentityID,
		sMessageFolder,
		sMessageUid,
		sSentFolder,
		sTo,
		sCc,
		sBcc,
		sReplyTo,
		sSubject,
		bTextIsHtml,
		sText,
		aAttachments,
		aDraftInfo,
		sInReplyTo,
		sReferences,
		bRequestDsn,
		bRequestReadReceipt,
		bMarkAsImportant
	) {
		this.defaultRequest(
			fCallback,
			'SendMessage',
			{
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
			},
			SEND_MESSAGE_AJAX_TIMEOUT
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	saveSystemFolders(fCallback, oData) {
		this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	saveSettings(fCallback, oData) {
		this.defaultRequest(fCallback, 'SettingsUpdate', oData);
	}

	/**
	 * @param {string} key
	 * @param {?Function} valueFn
	 * @param {?Function} fn
	 */
	saveSettingsHelper(key, valueFn, fn) {
		return (value) => {
			this.saveSettings(fn || null, {
				[key]: valueFn ? valueFn(value) : value
			});
		};
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} prevPassword
	 * @param {string} newPassword
	 */
	changePassword(fCallback, prevPassword, newPassword) {
		this.defaultRequest(fCallback, 'ChangePassword', {
			'PrevPassword': prevPassword,
			'NewPassword': newPassword
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 */
	folderClear(fCallback, sFolderFullNameRaw) {
		this.defaultRequest(fCallback, 'FolderClear', {
			'Folder': sFolderFullNameRaw
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bSubscribe
	 */
	folderSetSubscribe(fCallback, sFolderFullNameRaw, bSubscribe) {
		this.defaultRequest(fCallback, 'FolderSubscribe', {
			'Folder': sFolderFullNameRaw,
			'Subscribe': bSubscribe ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bCheckable
	 */
	folderSetCheckable(fCallback, sFolderFullNameRaw, bCheckable) {
		this.defaultRequest(fCallback, 'FolderCheckable', {
			'Folder': sFolderFullNameRaw,
			'Checkable': bCheckable ? '1' : '0'
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 * @param {string=} sLearning
	 * @param {boolean=} bMarkAsRead
	 */
	messagesMove(fCallback, sFolder, sToFolder, aUids, sLearning, bMarkAsRead) {
		this.defaultRequest(
			fCallback,
			'MessageMove',
			{
				'FromFolder': sFolder,
				'ToFolder': sToFolder,
				'Uids': aUids.join(','),
				'MarkAsRead': bMarkAsRead ? '1' : '0',
				'Learning': sLearning || ''
			},
			null,
			'',
			['MessageList']
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 */
	messagesCopy(fCallback, sFolder, sToFolder, aUids) {
		this.defaultRequest(fCallback, 'MessageCopy', {
			'FromFolder': sFolder,
			'ToFolder': sToFolder,
			'Uids': aUids.join(',')
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {Array} aUids
	 */
	messagesDelete(fCallback, sFolder, aUids) {
		this.defaultRequest(
			fCallback,
			'MessageDelete',
			{
				'Folder': sFolder,
				'Uids': aUids.join(',')
			},
			null,
			'',
			['MessageList']
		);
	}

	/**
	 * @param {?Function} fCallback
	 */
	appDelayStart(fCallback) {
		this.defaultRequest(fCallback, 'AppDelayStart');
	}

	/**
	 * @param {?Function} fCallback
	 */
	quota(fCallback) {
		this.defaultRequest(fCallback, 'Quota');
	}

	/**
	 * @param {?Function} fCallback
	 * @param {number} iOffset
	 * @param {number} iLimit
	 * @param {string} sSearch
	 */
	contacts(fCallback, iOffset, iLimit, sSearch) {
		this.defaultRequest(
			fCallback,
			'Contacts',
			{
				'Offset': iOffset,
				'Limit': iLimit,
				'Search': sSearch
			},
			null,
			'',
			['Contacts']
		);
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sRequestUid
	 * @param {string} sUid
	 * @param {Array} aProperties
	 */
	contactSave(fCallback, sRequestUid, sUid, aProperties) {
		this.defaultRequest(fCallback, 'ContactSave', {
			'RequestUid': sRequestUid,
			'Uid': trim(sUid),
			'Properties': aProperties
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aUids
	 */
	contactsDelete(fCallback, aUids) {
		this.defaultRequest(fCallback, 'ContactsDelete', {
			'Uids': aUids.join(',')
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sQuery
	 * @param {number} iPage
	 */
	suggestions(fCallback, sQuery, iPage) {
		this.defaultRequest(
			fCallback,
			'Suggestions',
			{
				'Query': sQuery,
				'Page': iPage
			},
			null,
			'',
			['Suggestions']
		);
	}

	/**
	 * @param {?Function} fCallback
	 */
	clearUserBackground(fCallback) {
		this.defaultRequest(fCallback, 'ClearUserBackground');
	}

	/**
	 * @param {?Function} fCallback
	 */
	facebookUser(fCallback) {
		this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
	}

	/**
	 * @param {?Function} fCallback
	 */
	facebookDisconnect(fCallback) {
		this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
	}

	/**
	 * @param {?Function} fCallback
	 */
	twitterUser(fCallback) {
		this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
	}

	/**
	 * @param {?Function} fCallback
	 */
	twitterDisconnect(fCallback) {
		this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
	}

	/**
	 * @param {?Function} fCallback
	 */
	googleUser(fCallback) {
		this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
	}

	/**
	 * @param {?Function} fCallback
	 */
	googleDisconnect(fCallback) {
		this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
	}

	/**
	 * @param {?Function} fCallback
	 */
	socialUsers(fCallback) {
		this.defaultRequest(fCallback, 'SocialUsers');
	}
}

export default new RemoteUserAjax();
