import { koComputable } from 'External/ko';

import { SMAudio } from 'Common/Audio';
import { Notification } from 'Common/Enums';
import { MessageSetAction } from 'Common/EnumsUser';
import { $htmlCL } from 'Common/Globals';
import { arrayLength, pInt, pString } from 'Common/Utils';
import { addObservablesTo, addComputablesTo } from 'External/ko';

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
	}

export const MessagelistUserStore = ko.observableArray().extend({ debounce: 0 });

addObservablesTo(MessagelistUserStore, {
	count: 0,
	listSearch: '',
	threadUid: 0,
	page: 1,
	pageBeforeThread: 1,
	error: '',

	endHash: '',
	endThreadUid: 0,

	loading: false,
	// Happens when message(s) removed from list
	isIncomplete: false,

	selectedMessage: null,
	focusedMessage: null
});

MessagelistUserStore.disableAutoSelect = ko.observable(false).extend({ falseTimeout: 500 });

// Computed Observables

addComputablesTo(MessagelistUserStore, {
	isLoading: () => {
		const value = MessagelistUserStore.loading() | MessagelistUserStore.isIncomplete();
		$htmlCL.toggle('list-loading', value);
		return value;
	},

	pageCount: () => Math.max(1, Math.ceil(MessagelistUserStore.count() / SettingsUserStore.messagesPerPage())),

	mainSearch: {
		read: MessagelistUserStore.listSearch,
		write: value => hasher.setHash(
			mailBox(FolderUserStore.currentFolderFullNameHash(), 1,
				value.toString().trim(), MessagelistUserStore.threadUid())
		)
	},

	listCheckedOrSelected: () => {
		const
			selectedMessage = MessagelistUserStore.selectedMessage(),
			focusedMessage = MessagelistUserStore.focusedMessage(),
			checked = MessagelistUserStore.filter(item => isChecked(item) || item === selectedMessage);
		return checked.length ? checked : (focusedMessage ? [focusedMessage] : []);
	},

	listCheckedOrSelectedUidsWithSubMails: () => {
		let result = [];
		MessagelistUserStore.listCheckedOrSelected().forEach(message => {
			result.push(message.uid);
			if (1 < message.threadsLen()) {
				result = result.concat(message.threads()).unique();
			}
		});
		return result;
	}
});

MessagelistUserStore.listChecked = koComputable(
	() => MessagelistUserStore.filter(isChecked)).extend({ rateLimit: 0 }
);

MessagelistUserStore.hasCheckedMessages = koComputable(
	() => !!MessagelistUserStore.find(isChecked)
).extend({ rateLimit: 0 });

MessagelistUserStore.hasCheckedOrSelected = koComputable(() =>
		!!(MessagelistUserStore.selectedMessage()
		|| MessagelistUserStore.focusedMessage()
		|| MessagelistUserStore.find(item => item.checked()))
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
	MessagelistUserStore.error('');
	Remote.messageList(
		(iError, oData, bCached) => {
			if (iError) {
				if (Notification.RequestAborted !== iError) {
					MessagelistUserStore([]);
				}
				MessagelistUserStore.error(getNotification(iError));
			} else {
				const collection = MessageCollectionModel.reviveFromJson(oData.Result, bCached);
				if (collection) {
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

					MessagelistUserStore.disableAutoSelect(true);

					MessagelistUserStore(collection);
					MessagelistUserStore.isIncomplete(false);

					if (folder && (bCached || unreadCountChange || SettingsUserStore.useThreads())) {
						rl.app.folderInformation(folder.fullName, collection);
					}
				} else {
					MessagelistUserStore.count(0);
					MessagelistUserStore([]);
					MessagelistUserStore.error(getNotification(Notification.CantGetMessageList));
				}
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
		rootUids = messages.map(oMessage => oMessage && oMessage.uid ? oMessage.uid : null)
			.validUnique(),
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
 * @param {Array} uidForRemove
 * @param {string=} toFolderFullName = ''
 * @param {boolean=} copy = false
 */
MessagelistUserStore.removeMessagesFromList = (
	fromFolderFullName, uidForRemove, toFolderFullName = '', copy = false
) => {
	uidForRemove = uidForRemove.map(mValue => pInt(mValue));

	let unseenCount = 0,
		messageList = MessagelistUserStore,
		currentMessage = MessageUserStore.message();

	const trashFolder = FolderUserStore.trashFolder(),
		spamFolder = FolderUserStore.spamFolder(),
		fromFolder = getFolderFromCacheList(fromFolderFullName),
		toFolder = toFolderFullName ? getFolderFromCacheList(toFolderFullName) : null,
		messages =
			FolderUserStore.currentFolderFullName() === fromFolderFullName
				? messageList.filter(item => item && uidForRemove.includes(pInt(item.uid)))
				: [];

	messages.forEach(item => item && item.isUnseen() && ++unseenCount);

	if (fromFolder) {
		fromFolder.hash = '';
		if (!copy) {
			fromFolder.totalEmails(
				0 <= fromFolder.totalEmails() - uidForRemove.length ? fromFolder.totalEmails() - uidForRemove.length : 0
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

		toFolder.totalEmails(toFolder.totalEmails() + uidForRemove.length);
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

			setTimeout(() => messages.forEach(item => messageList.remove(item)), 350);
		}
	}

	if (MessagelistUserStore.threadUid()) {
		if (
			messageList.length &&
			messageList.find(item => item && item.deleted() && item.uid == MessagelistUserStore.threadUid())
		) {
			const message = messageList.find(item => item && !item.deleted());
			let setHash;
			if (!message) {
				if (1 < MessagelistUserStore.page()) {
					MessagelistUserStore.page(MessagelistUserStore.page() - 1);
					setHash = 1;
				} else {
					MessagelistUserStore.threadUid(0);
					replaceHash(
						mailBox(
							FolderUserStore.currentFolderFullNameHash(),
							MessagelistUserStore.pageBeforeThread(),
							MessagelistUserStore.listSearch()
						)
					);
				}
			} else if (MessagelistUserStore.threadUid() != message.uid) {
				MessagelistUserStore.threadUid(message.uid);
				setHash = 1;
			}
			if (setHash) {
				replaceHash(
					mailBox(
						FolderUserStore.currentFolderFullNameHash(),
						MessagelistUserStore.page(),
						MessagelistUserStore.listSearch(),
						MessagelistUserStore.threadUid()
					)
				);
			}
		}
	}
},

MessagelistUserStore.reloadFlagsAndCachedMessage = () => {
	MessagelistUserStore.forEach(message => MessageFlagsCache.initMessage(message));
	MessageFlagsCache.initMessage(MessageUserStore.message());
};
