import { isArray, arrayLength, pString, pInt } from 'Common/Utils';

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

// unescape(encodeURIComponent()) makes the UTF-16 DOMString to an UTF-8 string
const urlSafeJSON = data => btoa(unescape(encodeURIComponent(JSON.stringify(data))))
	.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=+$/, '');
/* Withous deprecated 'unescape':
const urlSafeJSON = data => btoa(encodeURIComponent(JSON.stringify(data)).replace(
		/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)
    ))
	.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=+$/, '');
*/

class RemoteUserFetch extends AbstractFetchRemote {

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
	 * @param {Function} fCallback
	 * @param {object} params
	 * @param {boolean=} bSilent = false
	 */
	messageList(fCallback, params, bSilent = false) {
		const
			sFolderFullName = pString(params.Folder),
			folderHash = getFolderHash(sFolderFullName);

		params = Object.assign({
			Offset: 0,
			Limit: SettingsUserStore.messagesPerPage(),
			Search: '',
			UidNext: getFolderInboxName() === sFolderFullName ? getFolderUidNext(sFolderFullName) : '',
			Sort: FolderUserStore.sortMode(),
			Hash: folderHash + SettingsGet('AccountHash')
		}, params);
		params.Folder = sFolderFullName;
		if (AppUserStore.threadsAllowed() && SettingsUserStore.useThreads()) {
			params.UseThreads = 1;
		} else {
			params.ThreadUid = 0;
		}

		let sGetAdd = '';

		if (folderHash && (!params.Search || !params.Search.includes('is:'))) {
			sGetAdd = 'MessageList/' +
				SUB_QUERY_PREFIX +
				'/' +
				urlSafeJSON(params);
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
	 * @param {string} sFolderFullName
	 * @param {number} iUid
	 * @returns {boolean}
	 */
	message(fCallback, sFolderFullName, iUid) {
		sFolderFullName = pString(sFolderFullName);
		iUid = pInt(iUid);

		if (getFolderFromCacheList(sFolderFullName) && 0 < iUid) {
			this.defaultRequest(
				fCallback,
				'Message',
				{},
				null,
				'Message/' +
					SUB_QUERY_PREFIX +
					'/' +
					urlSafeJSON([
						sFolderFullName,
						iUid,
						AppUserStore.threadsAllowed() && SettingsUserStore.useThreads() ? 1 : 0,
						SettingsGet('AccountHash')
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

		if (arrayLength(list)) {
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
				FlagsUids: isArray(uids) ? uids : [],
				UidNext: getFolderInboxName() === folder ? getFolderUidNext(folder) : 0
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
	 * @param {string} sFolderFullName
	 * @param {Array} aUids
	 * @param {boolean} bSetFlagged
	 */
	messageSetFlagged(fCallback, sFolderFullName, aUids, bSetFlagged) {
		this.defaultRequest(fCallback, 'MessageSetFlagged', {
			Folder: sFolderFullName,
			Uids: aUids.join(','),
			SetAction: bSetFlagged ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {Array} aUids
	 * @param {boolean} bSetSeen
	 */
	messageSetSeen(fCallback, sFolderFullName, aUids, bSetSeen) {
		this.defaultRequest(fCallback, 'MessageSetSeen', {
			Folder: sFolderFullName,
			Uids: aUids.join(','),
			SetAction: bSetSeen ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {boolean} bSetSeen
	 * @param {Array} aThreadUids = null
	 */
	messageSetSeenToAll(fCallback, sFolderFullName, bSetSeen, aThreadUids = null) {
		this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
			Folder: sFolderFullName,
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
	 * @param {number} iMessageUid
	 * @param {string} sReadReceipt
	 * @param {string} sSubject
	 * @param {string} sText
	 */
	sendReadReceiptMessage(fCallback, sMessageFolder, iMessageUid, sReadReceipt, sSubject, sText) {
		this.defaultRequest(fCallback, 'SendReadReceiptMessage', {
			MessageFolder: sMessageFolder,
			MessageUid: iMessageUid,
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
	 * @param {string} sFolderFullName
	 */
	folderClear(fCallback, sFolderFullName) {
		this.defaultRequest(fCallback, 'FolderClear', {
			Folder: sFolderFullName
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {boolean} bSubscribe
	 */
	folderSetSubscribe(fCallback, sFolderFullName, bSubscribe) {
		this.defaultRequest(fCallback, 'FolderSubscribe', {
			Folder: sFolderFullName,
			Subscribe: bSubscribe ? 1 : 0
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {boolean} bSubscribe
	 */
	folderSetMetadata(fCallback, sFolderFullName, sKey, sValue) {
		this.defaultRequest(fCallback, 'FolderSetMetadata', {
			Folder: sFolderFullName,
			Key: sKey,
			Value: sValue
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {boolean} bCheckable
	 */
	folderSetCheckable(fCallback, sFolderFullName, bCheckable) {
		this.defaultRequest(fCallback, 'FolderCheckable', {
			Folder: sFolderFullName,
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

	/**
	 * @param {?Function} fCallback
	 */
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

	folderDelete(sFolderFullName) {
		return this.postRequest('FolderDelete', FolderUserStore.foldersDeleting, {
			Folder: sFolderFullName
		});
	}

	folderCreate(sNewFolderName, sParentName) {
		return this.postRequest('FolderCreate', FolderUserStore.foldersCreating, {
			Folder: sNewFolderName,
			Parent: sParentName
		});
	}

	folderMove(sPrevFolderFullName, sNewFolderFullName) {
		return this.postRequest('FolderMove', FolderUserStore.foldersRenaming, {
			Folder: sPrevFolderFullName,
			NewFolder: sNewFolderFullName
		});
	}

	folderRename(sPrevFolderFullName, sNewFolderName) {
		return this.postRequest('FolderRename', FolderUserStore.foldersRenaming, {
			Folder: sPrevFolderFullName,
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
