import { isArray, arrayLength } from 'Common/Utils';
import {
	MessageFlagsCache,
	setFolderHash,
	getFolderHash,
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
 * @param {Array=} aDisabled
 * @param {Array=} aHeaderLines
 * @param {Function=} fDisableCallback
 * @param {Function=} fRenameCallback
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
 * @param {boolean=} boot = false
 */
folderInformationMultiply = (boot = false) => {
	const folders = FolderUserStore.getNextFolderNames(refreshFoldersInterval);
	if (arrayLength(folders)) {
		Remote.request('FolderInformationMultiply', (iError, oData) => {
			if (!iError && arrayLength(oData.Result)) {
				const utc = Date.now();
				oData.Result.forEach(item => {
					const hash = getFolderHash(item.Folder),
						folder = getFolderFromCacheList(item.Folder);

					if (folder) {
						folder.expires = utc;

						setFolderHash(item.Folder, item.Hash);

						folder.messageCountAll(item.MessageCount);

						let unreadCountChange = folder.messageCountUnread() !== item.MessageUnseenCount;

						folder.messageCountUnread(item.MessageUnseenCount);

						if (unreadCountChange) {
							MessageFlagsCache.clearFolder(folder.fullName);
						}

						if (!hash || item.Hash !== hash) {
							if (folder.fullName === FolderUserStore.currentFolderFullName()) {
								MessagelistUserStore.reload();
							}
						} else if (unreadCountChange
						 && folder.fullName === FolderUserStore.currentFolderFullName()
						 && MessagelistUserStore.length) {
							rl.app.folderInformation(folder.fullName, MessagelistUserStore());
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

	Remote.request('MessageMove',
		moveOrDeleteResponseHelper,
		{
			FromFolder: fromFolderFullName,
			ToFolder: toFolderFullName,
			Uids: uidsForMove.join(','),
			MarkAsRead: (isSpam || FolderUserStore.trashFolder() === toFolderFullName) ? 1 : 0,
			Learning: isSpam ? 'SPAM' : isHam ? 'HAM' : ''
		},
		null,
		'',
		['MessageList']
	);
},

messagesDeleteHelper = (sFromFolderFullName, aUidForRemove) => {
	Remote.request('MessageDelete',
		moveOrDeleteResponseHelper,
		{
			Folder: sFromFolderFullName,
			Uids: aUidForRemove.join(',')
		},
		null,
		'',
		['MessageList']
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
