import { koComputable, addObservablesTo, addComputablesTo } from 'External/ko';

import { SMAudio } from 'Common/Audio';
import { Notification } from 'Common/Enums';
import { MessageSetAction } from 'Common/EnumsUser';
import { $htmlCL } from 'Common/Globals';
import { arrayLength, pInt, pString } from 'Common/Utils';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	getFolderInboxName,
	getFolderFromCacheList,
	setFolderHash,
	MessageFlagsCache
} from 'Common/Cache';

import { mailBox } from 'Common/Links';
import { i18n, getNotification } from 'Common/Translator';

import { EmailCollectionModel } from 'Model/EmailCollection';
import { MessageCollectionModel } from 'Model/MessageCollection';

import { AccountUserStore } from 'Stores/User/Account';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { NotificationUserStore } from 'Stores/User/Notification';
import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

const
	isChecked = item => item.checked(),
	replaceHash = hash => {
		rl.route.off();
		hasher.replaceHash(hash);
		rl.route.on();
	},
	disableAutoSelect = ko.observable(false).extend({ falseTimeout: 500 });

export const MessagelistUserStore = ko.observableArray().extend({ debounce: 0 });

addObservablesTo(MessagelistUserStore, {
	count: 0,
	listSearch: '',
	threadUid: 0,
	page: 1,
	pageBeforeThread: 1,
	error: '',
//	Folder: '',

	endHash: '',
	endThreadUid: 0,

	loading: false,
	// Happens when message(s) removed from list
	isIncomplete: false,

	selectedMessage: null,
	focusedMessage: null
});

// Computed Observables

addComputablesTo(MessagelistUserStore, {
	isLoading: () => {
		const value = MessagelistUserStore.loading() | MessagelistUserStore.isIncomplete();
		$htmlCL.toggle('list-loading', value);
		return value;
	},

	isArchiveFolder: () => FolderUserStore.archiveFolder() === MessagelistUserStore().Folder,

	isDraftFolder: () => FolderUserStore.draftsFolder() === MessagelistUserStore().Folder,

	isSentFolder: () => FolderUserStore.sentFolder() === MessagelistUserStore().Folder,

	isSpamFolder: () => FolderUserStore.spamFolder() === MessagelistUserStore().Folder,

	isTrashFolder: () => FolderUserStore.trashFolder() === MessagelistUserStore().Folder,

	archiveAllowed: () => ![UNUSED_OPTION_VALUE, MessagelistUserStore().Folder].includes(FolderUserStore.archiveFolder())
		&& !MessagelistUserStore.isDraftFolder(),

	canMarkAsSpam: () => !(UNUSED_OPTION_VALUE === FolderUserStore.spamFolder()
//		| MessagelistUserStore.isArchiveFolder()
		| MessagelistUserStore.isSentFolder()
		| MessagelistUserStore.isDraftFolder()
		| MessagelistUserStore.isSpamFolder()),

	pageCount: () => Math.max(1, Math.ceil(MessagelistUserStore.count() / SettingsUserStore.messagesPerPage())),

	mainSearch: {
		read: MessagelistUserStore.listSearch,
		write: value => hasher.setHash(
			mailBox(FolderUserStore.currentFolderFullNameHash(), 1,
				value.toString().trim(), MessagelistUserStore.threadUid())
		)
	},
/*
	// Idea for https://github.com/the-djmaze/snappymail/issues/737
	listByDay: () => {
		let list = {};
		MessagelistUserStore.forEach(msg => {
			let day = (new Date(msg.dateTimeStampInUTC() * 1000)).format('Ymd');
			if (!list[day]) {
				list[day] = {day:day,messages:[]};
			}
			list[day].messages.push(msg);
		});
		return Object.values(list);
	},
*/
	listCheckedOrSelected: () => {
		const
			selectedMessage = MessagelistUserStore.selectedMessage(),
			focusedMessage = MessagelistUserStore.focusedMessage(),
			checked = MessagelistUserStore.filter(item => isChecked(item));
		return checked.length ? checked : (selectedMessage || focusedMessage ? [selectedMessage || focusedMessage] : []);
	},

	listCheckedOrSelectedUidsWithSubMails: () => {
		let result = new Set;
		MessagelistUserStore.listCheckedOrSelected().forEach(message => {
			result.add(message.uid);
			if (1 < message.threadsLen()) {
				message.threads().forEach(result.add, result);
			}
		});
		return result;
	}
});

MessagelistUserStore.listChecked = koComputable(
	() => MessagelistUserStore.filter(isChecked)
).extend({ rateLimit: 0 });

// Also used by Selector
MessagelistUserStore.hasChecked = koComputable(
	// Issue: not all are observed?
	() => !!MessagelistUserStore.find(isChecked)
).extend({ rateLimit: 0 });

MessagelistUserStore.hasCheckedOrSelected = koComputable(() =>
	!!MessagelistUserStore.selectedMessage()
	| !!MessagelistUserStore.focusedMessage()
	// Issue: not all are observed?
	| !!MessagelistUserStore.find(isChecked)
).extend({ rateLimit: 50 });

MessagelistUserStore.notifyNewMessages = (folder, newMessages) => {
	if (getFolderInboxName() === folder && arrayLength(newMessages)) {

		SMAudio.playNotification();

		const len = newMessages.length;
		if (3 < len) {
			NotificationUserStore.display(
				AccountUserStore.email(),
				i18n('MESSAGE_LIST/NEW_MESSAGE_NOTIFICATION', {
					COUNT: len
				}),
				{ Url: mailBox(newMessages[0].Folder) }
			);
		} else {
			newMessages.forEach(item => {
				NotificationUserStore.display(
					EmailCollectionModel.reviveFromJson(item.From).toString(),
					item.subject,
					{ Folder: item.Folder, Uid: item.Uid }
				);
			});
		}
	}
}

MessagelistUserStore.canAutoSelect = () =>
	!/is:unseen/.test(MessagelistUserStore.mainSearch())
	&& !disableAutoSelect()
	&& SettingsUserStore.usePreviewPane();

/**
 * @param {boolean=} bDropPagePosition = false
 * @param {boolean=} bDropCurrentFolderCache = false
 */
MessagelistUserStore.reload = (bDropPagePosition = false, bDropCurrentFolderCache = false) => {
	let iOffset = (MessagelistUserStore.page() - 1) * SettingsUserStore.messagesPerPage();

	if (bDropCurrentFolderCache) {
		setFolderHash(FolderUserStore.currentFolderFullName(), '');
	}

	if (bDropPagePosition) {
		MessagelistUserStore.page(1);
		MessagelistUserStore.pageBeforeThread(1);
		iOffset = 0;

		replaceHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				MessagelistUserStore.page(),
				MessagelistUserStore.listSearch(),
				MessagelistUserStore.threadUid()
			)
		);
	}

	MessagelistUserStore.loading(true);
	Remote.messageList(
		(iError, oData, bCached) => {
			let error = '';
			if (iError) {
				error = getNotification(iError);
				if (Notification.RequestAborted !== iError) {
					MessagelistUserStore([]);
				}
			} else {
				const collection = MessageCollectionModel.reviveFromJson(oData.Result, bCached);
				if (collection) {
					error = '';
					let unreadCountChange = false;

					const
						folder = getFolderFromCacheList(collection.Folder),
						folderInfo = collection.FolderInfo;
					if (folder && !bCached) {
//						folder.revivePropertiesFromJson(result);
						folder.expires = Date.now();
						folder.uidNext = folderInfo.UidNext;
						folder.hash = collection.FolderHash;

						if (null != folderInfo.totalEmails) {
							folder.totalEmails(folderInfo.totalEmails);
						}

						if (null != folderInfo.unreadEmails) {
							if (pInt(folder.unreadEmails()) !== pInt(folderInfo.unreadEmails)) {
								unreadCountChange = true;
								MessageFlagsCache.clearFolder(folder.fullName);
							}
							folder.unreadEmails(folderInfo.unreadEmails);
						}

						folder.flags(folderInfo.Flags);
						let flags = folderInfo.PermanentFlags;
						if (flags.includes('\\*')) {
							let i = 6;
							while (--i) {
								flags.includes('$label'+i) || flags.push('$label'+i);
							}
						}
						flags.sort((a, b) => {
							a = a.toUpperCase();
							b = b.toUpperCase();
							return (a < b) ? -1 : ((a > b) ? 1 : 0);
						});
						folder.permanentFlags(flags);

						MessagelistUserStore.notifyNewMessages(folder.fullName, collection.NewMessages);
					}

					MessagelistUserStore.count(collection.MessageResultCount);
					MessagelistUserStore.listSearch(pString(collection.Search));
					MessagelistUserStore.page(Math.ceil(collection.Offset / SettingsUserStore.messagesPerPage() + 1));
					MessagelistUserStore.threadUid(collection.ThreadUid);

					MessagelistUserStore.endHash(
						collection.Folder +
						'|' + collection.Search +
						'|' + MessagelistUserStore.threadUid() +
						'|' + MessagelistUserStore.page()
					);
					MessagelistUserStore.endThreadUid(collection.ThreadUid);
					const message = MessageUserStore.message();
					if (message && collection.Folder !== message.folder) {
						MessageUserStore.message(null);
					}

					disableAutoSelect(true);

					MessagelistUserStore(collection);
					MessagelistUserStore.isIncomplete(false);

					if (folder && (bCached || unreadCountChange || SettingsUserStore.useThreads())) {
						rl.app.folderInformation(folder.fullName, collection);
					}
				} else {
					MessagelistUserStore.count(0);
					MessagelistUserStore([]);
					error = getNotification(Notification.CantGetMessageList);
				}
				MessagelistUserStore.error(error);
			}
			MessagelistUserStore.loading(false);
		},
		{
			Folder: FolderUserStore.currentFolderFullName(),
			Offset: iOffset,
			Limit: SettingsUserStore.messagesPerPage(),
			Search: MessagelistUserStore.listSearch(),
			ThreadUid: MessagelistUserStore.threadUid()
		}
	);
};

/**
 * @param {string} sFolderFullName
 * @param {number} iSetAction
 * @param {Array=} messages = null
 */
MessagelistUserStore.setAction = (sFolderFullName, iSetAction, messages) => {
	messages = messages || MessagelistUserStore.listChecked();

	let folder,
		alreadyUnread = 0,
		rootUids = messages.map(oMessage => oMessage?.uid).validUnique(),
		length = rootUids.length;

	if (sFolderFullName && length) {
		rootUids.forEach(sSubUid =>
			alreadyUnread += MessageFlagsCache.storeBySetAction(sFolderFullName, sSubUid, iSetAction)
		);
		switch (iSetAction) {
			case MessageSetAction.SetSeen:
				length = 0;
				// fallthrough is intentionally
			case MessageSetAction.UnsetSeen:
				folder = getFolderFromCacheList(sFolderFullName);
				if (folder) {
					folder.unreadEmails(folder.unreadEmails() - alreadyUnread + length);
				}
				Remote.request('MessageSetSeen', null, {
					Folder: sFolderFullName,
					Uids: rootUids.join(','),
					SetAction: iSetAction == MessageSetAction.SetSeen ? 1 : 0
				});
				break;

			case MessageSetAction.SetFlag:
			case MessageSetAction.UnsetFlag:
				Remote.request('MessageSetFlagged', null, {
					Folder: sFolderFullName,
					Uids: rootUids.join(','),
					SetAction: iSetAction == MessageSetAction.SetFlag ? 1 : 0
				});
				break;
			// no default
		}

		MessagelistUserStore.reloadFlagsAndCachedMessage();
	}
};

/**
 * @param {string} fromFolderFullName
 * @param {Set} oUids
 * @param {string=} toFolderFullName = ''
 * @param {boolean=} copy = false
 */
MessagelistUserStore.removeMessagesFromList = (
	fromFolderFullName, oUids, toFolderFullName = '', copy = false
) => {
	let unseenCount = 0,
		setPage = 0,
		currentMessage = MessageUserStore.message();

	const trashFolder = FolderUserStore.trashFolder(),
		spamFolder = FolderUserStore.spamFolder(),
		fromFolder = getFolderFromCacheList(fromFolderFullName),
		toFolder = toFolderFullName ? getFolderFromCacheList(toFolderFullName) : null,
		messages =
			FolderUserStore.currentFolderFullName() === fromFolderFullName
				? MessagelistUserStore.filter(item => item && oUids.has(item.uid))
				: [];

	messages.forEach(item => item?.isUnseen() && ++unseenCount);

	if (fromFolder) {
		fromFolder.hash = '';
		if (!copy) {
			fromFolder.totalEmails(
				0 <= fromFolder.totalEmails() - oUids.size ? fromFolder.totalEmails() - oUids.size : 0
			);

			if (0 < unseenCount) {
				fromFolder.unreadEmails(
					0 <= fromFolder.unreadEmails() - unseenCount ? fromFolder.unreadEmails() - unseenCount : 0
				);
			}
		}
	}

	if (toFolder) {
		toFolder.hash = '';

		if (trashFolder === toFolder.fullName || spamFolder === toFolder.fullName) {
			unseenCount = 0;
		}

		toFolder.totalEmails(toFolder.totalEmails() + oUids.size);
		if (0 < unseenCount) {
			toFolder.unreadEmails(toFolder.unreadEmails() + unseenCount);
		}

		toFolder.actionBlink(true);
	}

	if (messages.length) {
		if (copy) {
			messages.forEach(item => item.checked(false));
		} else {
			MessagelistUserStore.isIncomplete(true);

			messages.forEach(item => {
				if (currentMessage && currentMessage.hash === item.hash) {
					currentMessage = null;
					MessageUserStore.message(null);
				}

				item.deleted(true);
			});

			setTimeout(() => messages.forEach(item => MessagelistUserStore.remove(item)), 350);

			const
				count = MessagelistUserStore.count() - messages.length,
				page = MessagelistUserStore.page();
			MessagelistUserStore.count(count);
			if (page > MessagelistUserStore.pageCount()) {
				setPage = MessagelistUserStore.pageCount();
			}
		}
	}

	if (MessagelistUserStore.threadUid()
	 && MessagelistUserStore.length
	 && MessagelistUserStore.find(item => item?.deleted() && item.uid == MessagelistUserStore.threadUid())
	) {
		const message = MessagelistUserStore.find(item => item && !item.deleted());
		if (!message) {
			if (1 < MessagelistUserStore.page()) {
				setPage = MessagelistUserStore.page() - 1;
			} else {
				MessagelistUserStore.threadUid(0);
				setPage = MessagelistUserStore.pageBeforeThread();
			}
		} else if (MessagelistUserStore.threadUid() != message.uid) {
			MessagelistUserStore.threadUid(message.uid);
			setPage = MessagelistUserStore.page();
		}
	}

	if (setPage) {
		MessagelistUserStore.page(setPage);
		replaceHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				setPage,
				MessagelistUserStore.listSearch(),
				MessagelistUserStore.threadUid()
			)
		);
	}
},

MessagelistUserStore.reloadFlagsAndCachedMessage = () => {
	MessagelistUserStore.forEach(message => MessageFlagsCache.initMessage(message));
	MessageFlagsCache.initMessage(MessageUserStore.message());
};
