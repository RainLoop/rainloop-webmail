import { isArray, arrayLength } from 'Common/Utils';
import {
	MessageFlagsCache,
	setFolderHash,
	getFolderInboxName,
	getFolderFromCacheList
} from 'Common/Cache';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

export const

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
 * @param {?Function} fCallback
 * @param {string} folder
 * @param {Array=} list = []
 */
fetchFolderInformation = (fCallback, folder, list = []) => {
	let fetch = !arrayLength(list);
	const uids = [],
		folderFromCache = getFolderFromCacheList(folder);

	if (!fetch) {
		list.forEach(messageListItem => {
			if (!MessageFlagsCache.getFor(folder, messageListItem.uid)) {
				uids.push(messageListItem.uid);
			}

			if (messageListItem.threads.length) {
				messageListItem.threads.forEach(uid => {
					if (!MessageFlagsCache.getFor(folder, uid)) {
						uids.push(uid);
					}
				});
			}
		});
		fetch = uids.length;
	}

	if (fetch) {
		Remote.request('FolderInformation', fCallback, {
			Folder: folder,
			FlagsUids: uids,
			UidNext: (folderFromCache && folderFromCache.uidNext) || 0 // Used to check for new messages
		});
	} else if (SettingsUserStore.useThreads()) {
		MessagelistUserStore.reloadFlagsAndCachedMessage();
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

				if (oItem.subFolders.length) {
					foldersWalk(oItem.subFolders());
				}
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

// Every 5 minutes
refreshFoldersInterval = 300000,

/**
 * @param {string} folder
 * @param {Array=} list = []
 */
folderInformation = (folder, list) => {
	if (folder && folder.trim()) {
		fetchFolderInformation(
			(iError, data) => {
				if (!iError && data.Result) {
					const result = data.Result,
						folderFromCache = getFolderFromCacheList(result.Folder);
					if (folderFromCache) {
						const oldHash = folderFromCache.hash,
							unreadCountChange = (folderFromCache.unreadEmails() !== result.unreadEmails);

//							folderFromCache.revivePropertiesFromJson(result);
						folderFromCache.expires = Date.now();
						folderFromCache.uidNext = result.UidNext;
						folderFromCache.hash = result.Hash;
						folderFromCache.totalEmails(result.totalEmails);
						folderFromCache.unreadEmails(result.unreadEmails);

						if (unreadCountChange) {
							MessageFlagsCache.clearFolder(folderFromCache.fullName);
						}

						if (result.MessagesFlags.length) {
							result.MessagesFlags.forEach(message =>
								MessageFlagsCache.setFor(folderFromCache.fullName, message.Uid.toString(), message.Flags)
							);

							MessagelistUserStore.reloadFlagsAndCachedMessage();
						}

						MessagelistUserStore.notifyNewMessages(folderFromCache.fullName, result.NewMessages);

						if (!oldHash || unreadCountChange || result.Hash !== oldHash) {
							if (folderFromCache.fullName === FolderUserStore.currentFolderFullName()) {
								MessagelistUserStore.reload();
							} else if (getFolderInboxName() === folderFromCache.fullName) {
								Remote.messageList(null, {Folder: getFolderInboxName()}, true);
							}
						}
					}
				}
			},
			folder,
			list
		);
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
					const folder = getFolderFromCacheList(item.Folder);

					if (folder) {
						const oldHash = folder.hash,
							unreadCountChange = folder.unreadEmails() !== item.unreadEmails;

//						folder.revivePropertiesFromJson(item);
						folder.expires = utc;
						folder.hash = item.Hash;
						folder.totalEmails(item.totalEmails);
						folder.unreadEmails(item.unreadEmails);

						if (unreadCountChange) {
							MessageFlagsCache.clearFolder(folder.fullName);
						}

						if (!oldHash || item.Hash !== oldHash) {
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

				if (boot) {
					setTimeout(() => folderInformationMultiply(true), 2000);
				}
			}
		}, {
			Folders: folders
		});
	}
},

moveOrDeleteResponseHelper = (iError, oData) => {
	if (iError) {
		setFolderHash(FolderUserStore.currentFolderFullName(), '');
		alert(getNotification(iError));
	} else if (FolderUserStore.currentFolder()) {
		if (2 === arrayLength(oData.Result)) {
			setFolderHash(oData.Result[0], oData.Result[1]);
		} else {
			setFolderHash(FolderUserStore.currentFolderFullName(), '');
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
			FromFolder: fromFolderFullName,
			ToFolder: toFolderFullName,
			Uids: uidsForMove.join(','),
			MarkAsRead: (isSpam || FolderUserStore.trashFolder() === toFolderFullName) ? 1 : 0,
			Learning: isSpam ? 'SPAM' : isHam ? 'HAM' : ''
		}
	);
},

messagesDeleteHelper = (sFromFolderFullName, aUidForRemove) => {
	Remote.abort('MessageList').request('MessageDelete',
		moveOrDeleteResponseHelper,
		{
			Folder: sFromFolderFullName,
			Uids: aUidForRemove.join(',')
		}
	);
},

/**
 * @param {string} sFromFolderFullName
 * @param {Array} aUidForMove
 * @param {string} sToFolderFullName
 * @param {boolean=} bCopy = false
 */
moveMessagesToFolder = (sFromFolderFullName, aUidForMove, sToFolderFullName, bCopy) => {
	if (sFromFolderFullName !== sToFolderFullName && arrayLength(aUidForMove)) {
		const oFromFolder = getFolderFromCacheList(sFromFolderFullName),
			oToFolder = getFolderFromCacheList(sToFolderFullName);

		if (oFromFolder && oToFolder) {
			if (bCopy) {
				Remote.request('MessageCopy', null, {
					FromFolder: oFromFolder.fullName,
					ToFolder: oToFolder.fullName,
					Uids: aUidForMove.join(',')
				});
			} else {
				messagesMoveHelper(oFromFolder.fullName, oToFolder.fullName, aUidForMove);
			}

			MessagelistUserStore.removeMessagesFromList(oFromFolder.fullName, aUidForMove, oToFolder.fullName, bCopy);
			return true;
		}
	}

	return false;
};
