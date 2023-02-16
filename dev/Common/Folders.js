import { isArray, arrayLength } from 'Common/Utils';
import {
	MessageFlagsCache,
	setFolderETag,
	getFolderInboxName,
	getFolderFromCacheList
} from 'Common/Cache';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { getNotification } from 'Common/Translator';
import { Settings } from 'Common/Globals';
import { serverRequest } from 'Common/Links';

import Remote from 'Remote/User/Fetch';

let refreshInterval,
	// Default every 5 minutes
	refreshFoldersInterval = 300000;

export const

setRefreshFoldersInterval = minutes => {
	refreshFoldersInterval = Math.max(5, minutes) * 60000;
	clearInterval(refreshInterval);
	refreshInterval = setInterval(() => {
		const cF = FolderUserStore.currentFolderFullName(),
			iF = getFolderInboxName();
		folderInformation(iF);
		iF === cF || folderInformation(cF);
		folderInformationMultiply();
	}, refreshFoldersInterval);
},

sortFolders = folders => {
	try {
		let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
		folders.sort((a, b) =>
			a.isInbox() ? -1 : (b.isInbox() ? 1 : collator.compare(a.fullName, b.fullName))
		);
	} catch (e) {
		console.error(e);
	}
},

/**
 * @param {Array=} aDisabled
 * @param {Array=} aHeaderLines
 * @param {Function=} fRenameCallback
 * @param {Function=} fDisableCallback
 * @param {boolean=} bNoSelectSelectable Used in FolderCreatePopupView
 * @returns {Array}
 */
folderListOptionsBuilder = (
	aDisabled,
	aHeaderLines,
	fRenameCallback,
	fDisableCallback,
	bNoSelectSelectable,
	aList = FolderUserStore.folderList()
) => {
	const
		aResult = [],
		sDeepPrefix = '\u00A0\u00A0\u00A0',
		// FolderSystemPopupView should always be true
		showUnsubscribed = fRenameCallback ? !SettingsUserStore.hideUnsubscribed() : true,

		foldersWalk = folders => {
			folders.forEach(oItem => {
				if (showUnsubscribed || oItem.hasSubscriptions() || !oItem.exists) {
					aResult.push({
						id: oItem.fullName,
						name:
							sDeepPrefix.repeat(oItem.deep) +
							fRenameCallback(oItem),
						system: false,
						disabled: !bNoSelectSelectable && (
							!oItem.selectable() ||
							aDisabled.includes(oItem.fullName) ||
							fDisableCallback(oItem))
					});
				}
				foldersWalk(oItem.subFolders());
			});
		};


	fDisableCallback = fDisableCallback || (() => false);
	fRenameCallback = fRenameCallback || (oItem => oItem.name());
	isArray(aDisabled) || (aDisabled = []);

	isArray(aHeaderLines) && aHeaderLines.forEach(line =>
		aResult.push({
			id: line[0],
			name: line[1],
			system: false,
			disabled: false
		})
	);

	foldersWalk(aList);

	return aResult;
},

/**
 * @param {string} folder
 * @param {Array=} list = []
 */
folderInformation = (folder, list) => {
	if (folder?.trim()) {
		let count = 1;
		const uids = [];

		if (arrayLength(list)) {
			list.forEach(messageListItem => {
				MessageFlagsCache.getFor(folder, messageListItem.uid) || uids.push(messageListItem.uid);
				messageListItem.threads.forEach(uid => MessageFlagsCache.getFor(folder, uid) || uids.push(uid));
			});
			count = uids.length;
		}

		if (count) {
			Remote.request('FolderInformation', (iError, data) => {
				if (!iError && data.Result) {
					const result = data.Result,
						folderFromCache = getFolderFromCacheList(result.folder);
					if (folderFromCache) {
						const oldHash = folderFromCache.etag,
							unreadCountChange = (folderFromCache.unreadEmails() !== result.unreadEmails);

//						folderFromCache.revivePropertiesFromJson(result);
						folderFromCache.expires = Date.now();
						folderFromCache.uidNext = result.uidNext;
						folderFromCache.etag = result.etag;
						folderFromCache.totalEmails(result.totalEmails);
						folderFromCache.unreadEmails(result.unreadEmails);

						unreadCountChange && MessageFlagsCache.clearFolder(folderFromCache.fullName);

						if (result.messagesFlags.length) {
							result.messagesFlags.forEach(message =>
								MessageFlagsCache.setFor(folderFromCache.fullName, message.uid.toString(), message.flags)
							);

							MessagelistUserStore.reloadFlagsAndCachedMessage();
						}

						MessagelistUserStore.notifyNewMessages(folderFromCache.fullName, result.newMessages);

						if (!oldHash || unreadCountChange || result.etag !== oldHash) {
							if (folderFromCache.fullName === FolderUserStore.currentFolderFullName()) {
								MessagelistUserStore.reload();
/*
							} else if (getFolderInboxName() === folderFromCache.fullName) {
//								Remote.messageList(null, {folder: getFolderFromCacheList(getFolderInboxName())}, true);
								Remote.messageList(null, {folder: getFolderInboxName()}, true);
*/
							}
						}
					}
				}
			}, {
				folder: folder,
				flagsUids: uids,
				uidNext: getFolderFromCacheList(folder)?.uidNext || 0 // Used to check for new messages
			});
		} else if (SettingsUserStore.useThreads()) {
			MessagelistUserStore.reloadFlagsAndCachedMessage();
		}
	}
},

/**
 * @param {boolean=} boot = false
 */
folderInformationMultiply = (boot = false) => {
	const folders = FolderUserStore.getNextFolderNames(refreshFoldersInterval);
	if (arrayLength(folders)) {
		Remote.request('FolderInformationMultiply', (iError, oData) => {
			if (!iError && arrayLength(oData.Result)) {
				const utc = Date.now();
				oData.Result.forEach(item => {
					const folder = getFolderFromCacheList(item.name);

					if (folder) {
						const oldHash = folder.etag,
							unreadCountChange = folder.unreadEmails() !== item.unreadEmails;

//						folder.revivePropertiesFromJson(item);
						folder.expires = utc;
						folder.etag = item.etag;
						folder.totalEmails(item.totalEmails);
						folder.unreadEmails(item.unreadEmails);

						unreadCountChange && MessageFlagsCache.clearFolder(folder.fullName);

						if (!oldHash || item.etag !== oldHash) {
							if (folder.fullName === FolderUserStore.currentFolderFullName()) {
								MessagelistUserStore.reload();
							}
						} else if (unreadCountChange
						 && folder.fullName === FolderUserStore.currentFolderFullName()
						 && MessagelistUserStore.length) {
							folderInformation(folder.fullName, MessagelistUserStore());
						}
					}
				});

				boot && setTimeout(() => folderInformationMultiply(true), 2000);
			}
		}, {
			folders: folders
		});
	}
},

moveOrDeleteResponseHelper = (iError, oData) => {
	if (iError) {
		setFolderETag(FolderUserStore.currentFolderFullName(), '');
		alert(getNotification(iError));
	} else if (FolderUserStore.currentFolder()) {
		if (2 === arrayLength(oData.Result)) {
			setFolderETag(oData.Result[0], oData.Result[1]);
		} else {
			setFolderETag(FolderUserStore.currentFolderFullName(), '');
		}
		MessagelistUserStore.reload(!MessagelistUserStore.length);
	}
},

messagesMoveHelper = (fromFolderFullName, toFolderFullName, uidsForMove) => {
	const
		sSpamFolder = FolderUserStore.spamFolder(),
		isSpam = sSpamFolder === toFolderFullName,
		isHam = !isSpam && sSpamFolder === fromFolderFullName && getFolderInboxName() === toFolderFullName;

	Remote.abort('MessageList').request('MessageMove',
		moveOrDeleteResponseHelper,
		{
			fromFolder: fromFolderFullName,
			toFolder: toFolderFullName,
			uids: [...uidsForMove].join(','),
			markAsRead: (isSpam || FolderUserStore.trashFolder() === toFolderFullName) ? 1 : 0,
			learning: isSpam ? 'SPAM' : isHam ? 'HAM' : ''
		}
	);
},

messagesDeleteHelper = (sFromFolderFullName, aUidForRemove) => {
	Remote.abort('MessageList').request('MessageDelete',
		moveOrDeleteResponseHelper,
		{
			folder: sFromFolderFullName,
			uids: [...aUidForRemove].join(',')
		}
	);
},

/**
 * @param {string} sFromFolderFullName
 * @param {Set} oUids
 * @param {string} sToFolderFullName
 * @param {boolean=} bCopy = false
 */
moveMessagesToFolder = (sFromFolderFullName, oUids, sToFolderFullName, bCopy) => {
	if (sFromFolderFullName !== sToFolderFullName && oUids?.size) {
		const oFromFolder = getFolderFromCacheList(sFromFolderFullName),
			oToFolder = getFolderFromCacheList(sToFolderFullName);

		if (oFromFolder && oToFolder) {
			bCopy
				? Remote.request('MessageCopy', null, {
						fromFolder: oFromFolder.fullName,
						toFolder: oToFolder.fullName,
						uids: [...oUids].join(',')
					})
				: messagesMoveHelper(oFromFolder.fullName, oToFolder.fullName, oUids);

			MessagelistUserStore.removeMessagesFromList(oFromFolder.fullName, oUids, oToFolder.fullName, bCopy);
			return true;
		}
	}

	return false;
},

dropFilesInFolder = (sFolderFullName, files) => {
	let count = 0,
		fn = () => 0 == --count
			&& FolderUserStore.currentFolderFullName() == sFolderFullName
			&& MessagelistUserStore.reload(true, true);
	for (const file of files) {
		if ('message/rfc822' === file.type) {
			++count;
			let data = new FormData;
			data.append('folder', sFolderFullName);
			data.append('appendFile', file);
			data.XToken = Settings.app('token');
			fetch(serverRequest('Append'), {
				method: 'POST',
				mode: 'same-origin',
				cache: 'no-cache',
				redirect: 'error',
				referrerPolicy: 'no-referrer',
				credentials: 'same-origin',
				body: data
			})
			.then(fn)
			.catch(fn);
		}
	}
};
