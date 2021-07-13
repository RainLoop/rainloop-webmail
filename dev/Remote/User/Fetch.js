import { isArray, isNonEmptyArray, pString, pInt } from 'Common/Utils';

import {
	getFolderHash,
	getFolderInboxName,
	getFolderUidNext,
	getFolderFromCacheList,
	MessageFlagsCache
} from 'Common/Cache';

import { SettingsGet } from 'Common/Globals';
import { SUB_QUERY_PREFIX } from 'Common/Links';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';

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
		this.defaultRequest(
			fCallback,
			'Folders',
			{
				SentFolder: SettingsGet('SentFolder'),
				DraftFolder: SettingsGet('DraftFolder'),
				SpamFolder: SettingsGet('SpamFolder'),
				TrashFolder: SettingsGet('TrashFolder'),
				ArchiveFolder: SettingsGet('ArchiveFolder')
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
	 */
	login(fCallback, sEmail, sPassword, bSignMe, sLanguage) {
		this.defaultRequest(fCallback, 'Login', {
			Email: sEmail,
			Login: '',
			Password: sPassword,
			Language: sLanguage || '',
			SignMe: bSignMe ? 1 : 0
		});
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
	 * @param {object} params
	 * @param {boolean=} bSilent = false
	 */
	messageList(fCallback, params, bSilent = false) {
		const
			sFolderFullNameRaw = pString(params.Folder),
			folderHash = getFolderHash(sFolderFullNameRaw),
			useThreads = AppUserStore.threadsAllowed() && SettingsUserStore.useThreads() ? 1 : 0,
			inboxUidNext = getFolderInboxName() === sFolderFullNameRaw ? getFolderUidNext(sFolderFullNameRaw) : '';

		params.Folder = sFolderFullNameRaw;
		params.ThreadUid = useThreads ? params.ThreadUid : '';
		params = Object.assign({
			Folder: '',
			Offset: 0,
			Limit: SettingsUserStore.messagesPerPage(),
			Search: '',
			UidNext: inboxUidNext,
			UseThreads: useThreads,
			ThreadUid: '',
			Sort: FolderUserStore.sortMode()
		}, params);

		let sGetAdd = '';

		if (folderHash && (!params.Search || !params.Search.includes('is:'))) {
			sGetAdd = 'MessageList/' +
				SUB_QUERY_PREFIX +
				'/' +
				urlsafeArray([SettingsGet('ProjectHash'),folderHash].concat(Object.values(params)));
			params = {};
		}

		this.defaultRequest(
			fCallback,
			'MessageList',
			params,
			30000,
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
						SettingsGet('ProjectHash'),
						AppUserStore.threadsAllowed() && SettingsUserStore.useThreads() ? 1 : 0
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

		if (isNonEmptyArray(list)) {
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
				FlagsUids: isArray(uids) ? uids.join(',') : '',
				UidNext: getFolderInboxName() === folder ? getFolderUidNext(folder) : ''
			});
		} else if (SettingsUserStore.useThreads()) {
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
		this.defaultRequest(fCallback, 'SendMessage', oData, 30000);
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
	 * @param {?scalar} value
	 * @param {?Function} fCallback
	 */
	saveSetting(key, value, fCallback) {
		this.saveSettings(fCallback, {
			[key]: value
		});
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

	foldersReload(fCallback) {
		this.abort('Folders')
			.postRequest('Folders', FolderUserStore.foldersLoading)
			.then(data => {
				data = FolderCollectionModel.reviveFromJson(data.Result);
				data && data.storeIt();
				fCallback && fCallback(true);
			})
			.catch(() => fCallback && setTimeout(() => fCallback(false), 1));
	}

	foldersReloadWithTimeout() {
		this.setTrigger(FolderUserStore.foldersLoading, true);

		clearTimeout(this.foldersTimeout);
		this.foldersTimeout = setTimeout(() => this.foldersReload(), 500);
	}

	folderDelete(sFolderFullNameRaw) {
		return this.postRequest('FolderDelete', FolderUserStore.foldersDeleting, {
			Folder: sFolderFullNameRaw
		});
	}

	folderCreate(sNewFolderName, sParentName) {
		return this.postRequest('FolderCreate', FolderUserStore.foldersCreating, {
			Folder: sNewFolderName,
			Parent: sParentName
		});
	}

	folderMove(sPrevFolderFullNameRaw, sNewFolderFullName) {
		return this.postRequest('FolderMove', FolderUserStore.foldersRenaming, {
			Folder: sPrevFolderFullNameRaw,
			NewFolder: sNewFolderFullName
		});
	}

	folderRename(sPrevFolderFullNameRaw, sNewFolderName) {
		return this.postRequest('FolderRename', FolderUserStore.foldersRenaming, {
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
