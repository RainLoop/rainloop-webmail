import { arrayLength, pString, pInt, b64EncodeJSONSafe } from 'Common/Utils';

import {
	getFolderHash,
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

import { MessagelistUserStore } from 'Stores/User/Messagelist';

class RemoteUserFetch extends AbstractFetchRemote {

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
			UidNext: getFolderUidNext(sFolderFullName), // Used to check for new messages
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
				b64EncodeJSONSafe(params);
			params = {};
		}

		this.request('MessageList',
			fCallback,
			params,
			30000,
			sGetAdd,
			bSilent ? [] : ['MessageList']
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
			this.request('Message',
				fCallback,
				{},
				null,
				'Message/' +
					SUB_QUERY_PREFIX +
					'/' +
					b64EncodeJSONSafe([
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
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(fCallback, folder, list = []) {
		let fetch = !arrayLength(list);
		const uids = [];

		if (!fetch) {
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
			fetch = uids.length;
		}

		if (fetch) {
			this.request('FolderInformation', fCallback, {
				Folder: folder,
				FlagsUids: uids,
				UidNext: getFolderUidNext(folder) // Used to check for new messages
			});
		} else if (SettingsUserStore.useThreads()) {
			MessagelistUserStore.reloadFlagsAndCachedMessage();
		}
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullName
	 * @param {boolean} bSetSeen
	 * @param {Array} aThreadUids = null
	 */
	messageSetSeenToAll(sFolderFullName, bSetSeen, aThreadUids = null) {
		this.request('MessageSetSeenToAll', null, {
			Folder: sFolderFullName,
			SetAction: bSetSeen ? 1 : 0,
			ThreadUids: aThreadUids ? aThreadUids.join(',') : ''
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	saveSettings(fCallback, oData) {
		this.request('SettingsUpdate', fCallback, oData);
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
	 * @param {boolean} bSubscribe
	 */
	folderSetMetadata(fCallback, sFolderFullName, sKey, sValue) {
		this.request('FolderSetMetadata', fCallback, {
			Folder: sFolderFullName,
			Key: sKey,
			Value: sValue
		});
	}

	/**
	 * @param {?Function} fCallback
	 * @param {string} sQuery
	 * @param {number} iPage
	 */
	suggestions(fCallback, sQuery, iPage) {
		this.request('Suggestions',
			fCallback,
			{
				Query: sQuery,
				Page: iPage
			},
			null,
			'',
			['Suggestions']
		);
	}

/*
	folderMove(sPrevFolderFullName, sNewFolderFullName, bSubscribe) {
		return this.post('FolderMove', FolderUserStore.foldersRenaming, {
			Folder: sPrevFolderFullName,
			NewFolder: sNewFolderFullName,
			Subscribe: bSubscribe ? 1 : 0
		});
	}
*/
	attachmentsActions(sAction, aHashes, fTrigger) {
		return this.post('AttachmentsActions', fTrigger, {
			Do: sAction,
			Hashes: aHashes
		});
	}
}

export default new RemoteUserFetch();
