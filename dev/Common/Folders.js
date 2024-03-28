import { RFC822 } from 'Common/File';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';
import { baseCollator } from 'Common/Translator';
import { isArray, arrayLength } from 'Common/Utils';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

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
		let collator = baseCollator(true);
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
	fDisableCallback
) => {
	const
		aResult = [],
		sDeepPrefix = '\u00A0\u00A0\u00A0',
		// FolderSystemPopupView should always be true
		showUnsubscribed = fRenameCallback ? !SettingsUserStore.hideUnsubscribed() : true,
		isDisabled = fDisableCallback || (item => !item.selectable() || aDisabled.includes(item.fullName)),

		foldersWalk = folders => {
			folders.forEach(oItem => {
				if (showUnsubscribed || oItem.hasSubscriptions() || !oItem.exists) {
					aResult.push({
						id: oItem.fullName,
						name:
							sDeepPrefix.repeat(oItem.deep) +
							fRenameCallback(oItem),
						system: false,
						disabled: isDisabled(oItem)
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

	foldersWalk(FolderUserStore.folderList());

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
				uids.push(messageListItem.uid);
				messageListItem.threads.forEach(uid => uids.push(uid));
			});
			count = uids.length;
		}

		if (count) {
			Remote.request('FolderInformation', (iError, data) => {
				if (!iError && data.Result) {
					const result = data.Result,
						folderFromCache = getFolderFromCacheList(result.name);
					if (folderFromCache) {
						const oldHash = folderFromCache.etag,
							unreadCountChange = (folderFromCache.unreadEmails() !== result.unreadEmails);

//						folderFromCache.revivePropertiesFromJson(result);
						folderFromCache.expires = Date.now();
						folderFromCache.uidNext = result.uidNext;
						folderFromCache.etag = result.etag;
						folderFromCache.totalEmails(result.totalEmails);
						folderFromCache.unreadEmails(result.unreadEmails);

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

dropFilesInFolder = (sFolderFullName, files) => {
	let count = files.length;
	for (const file of files) {
		if (RFC822 === file.type) {
			let data = new FormData;
			data.append('folder', sFolderFullName);
			data.append('appendFile', file);
			Remote.request('FolderAppend', (iError, data)=>{
				iError && console.error(data.ErrorMessage);
				0 == --count
				&& FolderUserStore.currentFolderFullName() == sFolderFullName
				&& MessagelistUserStore.reload(true, true);
			}, data);
		} else {
			--count;
		}
	}
};
