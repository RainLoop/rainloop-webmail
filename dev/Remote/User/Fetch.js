import { pString, pInt } from 'Common/Utils';

import {
	getFolderHash,
	getFolderInboxName,
	getFolderUidNext,
	getFolderFromCacheList,
	MessageFlagsCache
} from 'Common/Cache';

import { SUB_QUERY_PREFIX } from 'Common/Links';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';

import { AbstractFetchRemote } from 'Remote/AbstractFetch';

import { FolderCollectionModel } from 'Model/FolderCollection';

//const toUTF8 = window.TextEncoder
//		? text => String.fromCharCode(...new TextEncoder().encode(text))
//		: text => unescape(encodeURIComponent(text)),
const urlsafeArray = array => btoa(unescape(encodeURIComponent(array.join('\x00').replace(/\r\n/g, '\n'))))
		.replace('+', '-')
		.replace('/', '_')
		.replace('=', '');

class RemoteUserFetch extends AbstractFetchRemote {
	/**
	 * @param {?Function} fCallback
	 */
	folders(fCallback) {
		const settingsGet = rl.settings.get;
		this.defaultRequest(
			fCallback,
			'Folders',
			{
				SentFolder: settingsGet('SentFolder'),
				DraftFolder: settingsGet('DraftFolder'),
				SpamFolder: settingsGet('SpamFolder'),
				TrashFolder: settingsGet('TrashFolder'),
				ArchiveFolder: settingsGet('ArchiveFolder')
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
			Email: sEmail,
			Login: sLogin,
			Password: sPassword,
			Language: sLanguage || '',
			AdditionalCode: sAdditionalCode || '',
			AdditionalCodeSignMe: bAdditionalCodeSignMe ? 1 : 0,
			SignMe: bSignMe ? 1 : 0
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
			Code: sCode
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 */
	enableTwoFactor(fCallback, bEnable) {
		this.defaultRequest(fCallback, 'EnableTwoFactor', {
			Enable: bEnable ? 1 : 0
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
		this.defaultRequest(fCallback, 'ContactsSync', null, 200000);
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
			Enable: bEnable ? 1 : 0,
			Url: sUrl,
			User: sUser,
			Password: sPassword
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
			Email: sEmail,
			Password: sPassword,
			New: bNew ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmailToDelete
	 */
	accountDelete(fCallback, sEmailToDelete) {
		this.defaultRequest(fCallback, 'AccountDelete', {
			EmailToDelete: sEmailToDelete
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aAccounts
	 * @param {Array} aIdentities
	 */
	accountsAndIdentitiesSortOrder(fCallback, aAccounts, aIdentities) {
		this.defaultRequest(fCallback, 'AccountsAndIdentitiesSortOrder', {
			Accounts: aAccounts,
			Identities: aIdentities
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
			Id: sId,
			Email: sEmail,
			Name: sName,
			ReplyTo: sReplyTo,
			Bcc: sBcc,
			Signature: sSignature,
			SignatureInsertBefore: bSignatureInsertBefore ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sIdToDelete
	 */
	identityDelete(fCallback, sIdToDelete) {
		this.defaultRequest(fCallback, 'IdentityDelete', {
			IdToDelete: sIdToDelete
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
	 * @param {SieveScriptModel} script
	 */
	filtersScriptSave(fCallback, script) {
		this.defaultRequest(fCallback, 'FiltersScriptSave', script.toJson());
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} name
	 */
	filtersScriptActivate(fCallback, name) {
		this.defaultRequest(fCallback, 'FiltersScriptActivate', {name:name});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} name
	 */
	filtersScriptDelete(fCallback, name) {
		this.defaultRequest(fCallback, 'FiltersScriptDelete', {name:name});
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
			ID: sID
		});
	}

	/**
	 * @param {Function} fCallback
	 * @param {string} sID
	 */
	templateDelete(fCallback, sID) {
		this.defaultRequest(fCallback, 'TemplateDelete', {
			IdToDelete: sID
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
			ID: sID,
			Name: sName,
			Body: sBody
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

		let params = {}, sGetAdd = '';

		if (folderHash && (!sSearch || !sSearch.includes('is:'))) {
			sGetAdd = 'MessageList/' +
				SUB_QUERY_PREFIX +
				'/' +
				urlsafeArray([
					sFolderFullNameRaw,
					iOffset,
					iLimit,
					sSearch,
					AppStore.projectHash(),
					folderHash,
					inboxUidNext,
					useThreads ? 1 : 0,
					useThreads ? sThreadUid : ''
				]);
		} else {
			params = {
				Folder: sFolderFullNameRaw,
				Offset: iOffset,
				Limit: iLimit,
				Search: sSearch,
				UidNext: inboxUidNext,
				UseThreads: useThreads ? 1 : 0,
				ThreadUid: useThreads ? sThreadUid : ''
			};
		}

		return this.defaultRequest(
			fCallback,
			'MessageList',
			params,
			sSearch ? 300000 : 30000,
			sGetAdd,
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
				Attachments: aDownloads
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
					SUB_QUERY_PREFIX +
					'/' +
					urlsafeArray([
						sFolderFullNameRaw,
						iUid,
						AppStore.projectHash(),
						AppStore.threadsAllowed() && SettingsStore.useThreads() ? 1 : 0
					]),
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
				Externals: aExternals
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
				AccessToken: sAccessToken,
				Url: sUrl
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

		if (Array.isNotEmpty(list)) {
			request = false;
			list.forEach(messageListItem => {
				if (!MessageFlagsCache.getFor(messageListItem.folder, messageListItem.uid)) {
					uids.push(messageListItem.uid);
				}

				if (messageListItem.threads.length) {
					messageListItem.threads.forEach(uid => {
						if (!MessageFlagsCache.getFor(messageListItem.folder, uid)) {
							uids.push(uid);
						}
					});
				}
			});

			if (uids.length) {
				request = true;
			}
		}

		if (request) {
			this.defaultRequest(fCallback, 'FolderInformation', {
				Folder: folder,
				FlagsUids: Array.isArray(uids) ? uids.join(',') : '',
				UidNext: getFolderInboxName() === folder ? getFolderUidNext(folder) : ''
			});
		} else if (SettingsStore.useThreads()) {
			rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aFolders
	 */
	folderInformationMultiply(fCallback, aFolders) {
		this.defaultRequest(fCallback, 'FolderInformationMultiply', {
			Folders: aFolders
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
			Folder: sFolderFullNameRaw,
			Uids: aUids.join(','),
			SetAction: bSetFlagged ? 1 : 0
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
			Folder: sFolderFullNameRaw,
			Uids: aUids.join(','),
			SetAction: bSetSeen ? 1 : 0
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
			Folder: sFolderFullNameRaw,
			SetAction: bSetSeen ? 1 : 0,
			ThreadUids: aThreadUids ? aThreadUids.join(',') : ''
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	saveMessage(fCallback, oData) {
		this.defaultRequest(fCallback, 'SaveMessage', oData, 200000);
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
			MessageFolder: sMessageFolder,
			MessageUid: sMessageUid,
			ReadReceipt: sReadReceipt,
			Subject: sSubject,
			Text: sText
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	sendMessage(fCallback, oData) {
		this.defaultRequest(fCallback, 'SendMessage', oData, 300000);
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
	 * @param {string} sFolderFullNameRaw
	 */
	folderClear(fCallback, sFolderFullNameRaw) {
		this.defaultRequest(fCallback, 'FolderClear', {
			Folder: sFolderFullNameRaw
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bSubscribe
	 */
	folderSetSubscribe(fCallback, sFolderFullNameRaw, bSubscribe) {
		this.defaultRequest(fCallback, 'FolderSubscribe', {
			Folder: sFolderFullNameRaw,
			Subscribe: bSubscribe ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bCheckable
	 */
	folderSetCheckable(fCallback, sFolderFullNameRaw, bCheckable) {
		this.defaultRequest(fCallback, 'FolderCheckable', {
			Folder: sFolderFullNameRaw,
			Checkable: bCheckable ? 1 : 0
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
				FromFolder: sFolder,
				ToFolder: sToFolder,
				Uids: aUids.join(','),
				MarkAsRead: bMarkAsRead ? 1 : 0,
				Learning: sLearning || ''
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
			FromFolder: sFolder,
			ToFolder: sToFolder,
			Uids: aUids.join(',')
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
				Folder: sFolder,
				Uids: aUids.join(',')
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
				Offset: iOffset,
				Limit: iLimit,
				Search: sSearch
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
			RequestUid: sRequestUid,
			Uid: sUid,
			Properties: aProperties
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aUids
	 */
	contactsDelete(fCallback, aUids) {
		this.defaultRequest(fCallback, 'ContactsDelete', {
			Uids: aUids.join(',')
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
				Query: sQuery,
				Page: iPage
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

	foldersReload(fTrigger) {
		return this.abort('Folders')
			.postRequest('Folders', fTrigger)
			.then(data => {
				data = FolderCollectionModel.reviveFromJson(data.Result);
				data && data.storeIt();
				return true;
			});
	}

	foldersReloadWithTimeout(fTrigger) {
		this.setTrigger(fTrigger, true);

		clearTimeout(this.foldersTimeout);
		this.foldersTimeout = setTimeout(() => this.foldersReload(fTrigger), 500);
	}

	folderDelete(sFolderFullNameRaw, fTrigger) {
		return this.postRequest('FolderDelete', fTrigger, {
			Folder: sFolderFullNameRaw
		});
	}

	folderCreate(sNewFolderName, sParentName, fTrigger) {
		return this.postRequest('FolderCreate', fTrigger, {
			Folder: sNewFolderName,
			Parent: sParentName
		});
	}

	folderRename(sPrevFolderFullNameRaw, sNewFolderName, fTrigger) {
		return this.postRequest('FolderRename', fTrigger, {
			Folder: sPrevFolderFullNameRaw,
			NewFolderName: sNewFolderName
		});
	}

	attachmentsActions(sAction, aHashes, fTrigger) {
		return this.postRequest('AttachmentsActions', fTrigger, {
			Do: sAction,
			Hashes: aHashes
		});
	}
}

export default new RemoteUserFetch();
