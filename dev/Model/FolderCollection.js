import { AbstractCollectionModel } from 'Model/AbstractCollection';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, pInt } from 'Common/Utils';
import { ClientSideKeyName, FolderType } from 'Common/EnumsUser';
import * as Cache from 'Common/Cache';
import { Settings, SettingsGet } from 'Common/Globals';

import * as Local from 'Storage/Client';

import { AppUserStore } from 'Stores/User/App';
import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import ko from 'ko';

import { isPosNumeric } from 'Common/UtilsUser';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

const
	ServerFolderType = {
		USER: 0,
		INBOX: 1,
		SENT: 2,
		DRAFTS: 3,
		JUNK: 4,
		TRASH: 5,
		IMPORTANT: 10,
		FLAGGED: 11,
		ALL: 12
	},

normalizeFolder = sFolderFullNameRaw => ('' === sFolderFullNameRaw
	|| UNUSED_OPTION_VALUE === sFolderFullNameRaw
	|| null !== Cache.getFolderFromCacheList(sFolderFullNameRaw))
		? sFolderFullNameRaw
		: '';

export class FolderCollectionModel extends AbstractCollectionModel
{
/*
	constructor() {
		super();
		this.CountRec
		this.FoldersHash
		this.IsThreadsSupported
		this.Namespace;
		this.Optimized
		this.SystemFolders
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {FolderCollectionModel}
	 */
	static reviveFromJson(object) {
		const expandedFolders = Local.get(ClientSideKeyName.ExpandedFolders);
		return super.reviveFromJson(object, (oFolder, self) => {
			let oCacheFolder = Cache.getFolderFromCacheList(oFolder.FullNameRaw);
/*
			if (oCacheFolder) {
				oFolder.SubFolders = FolderCollectionModel.reviveFromJson(oFolder.SubFolders);
				oFolder.SubFolders && oCacheFolder.subFolders(oFolder.SubFolders);
			}
*/
			if (!oCacheFolder && (oCacheFolder = FolderModel.reviveFromJson(oFolder))) {
				if (oFolder.FullNameRaw == self.SystemFolders[ServerFolderType.INBOX]) {
					oCacheFolder.type(FolderType.Inbox);
					Cache.setFolderInboxName(oFolder.FullNameRaw);
				}
				Cache.setFolder(oCacheFolder.fullNameHash, oFolder.FullNameRaw, oCacheFolder);
			}

			if (oCacheFolder) {
				oCacheFolder.collapsed(!expandedFolders
					|| !isArray(expandedFolders)
					|| !expandedFolders.includes(oCacheFolder.fullNameHash));

				if (oFolder.Extended) {
					if (oFolder.Extended.Hash) {
						Cache.setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);
					}

					if (null != oFolder.Extended.MessageCount) {
						oCacheFolder.messageCountAll(oFolder.Extended.MessageCount);
					}

					if (null != oFolder.Extended.MessageUnseenCount) {
						oCacheFolder.messageCountUnread(oFolder.Extended.MessageUnseenCount);
					}
				}
			}
			return oCacheFolder;
		});
	}

	storeIt() {
		const cnt = pInt(this.CountRec);

		FolderUserStore.displaySpecSetting(0 >= cnt
			|| Math.max(10, Math.min(100, pInt(Settings.app('folderSpecLimit')))) < cnt);

		FolderUserStore.folderList(this);

		if (undefined !== this.Namespace) {
			FolderUserStore.namespace = this.Namespace;
		}

		AppUserStore.threadsAllowed(!!(Settings.app('useImapThread') && this.IsThreadsSupported));

		FolderUserStore.folderListOptimized(!!this.Optimized);
		FolderUserStore.sortSupported(!!this.IsSortSupported);

		let update = false;

		if (
			this.SystemFolders &&
				!('' +
					SettingsGet('SentFolder') +
					SettingsGet('DraftFolder') +
					SettingsGet('SpamFolder') +
					SettingsGet('TrashFolder') +
					SettingsGet('ArchiveFolder'))
		) {
			Settings.set('SentFolder', this.SystemFolders[ServerFolderType.SENT] || null);
			Settings.set('DraftFolder', this.SystemFolders[ServerFolderType.DRAFTS] || null);
			Settings.set('SpamFolder', this.SystemFolders[ServerFolderType.JUNK] || null);
			Settings.set('TrashFolder', this.SystemFolders[ServerFolderType.TRASH] || null);
			Settings.set('ArchiveFolder', this.SystemFolders[ServerFolderType.ALL] || null);

			update = true;
		}

		FolderUserStore.sentFolder(normalizeFolder(SettingsGet('SentFolder')));
		FolderUserStore.draftFolder(normalizeFolder(SettingsGet('DraftFolder')));
		FolderUserStore.spamFolder(normalizeFolder(SettingsGet('SpamFolder')));
		FolderUserStore.trashFolder(normalizeFolder(SettingsGet('TrashFolder')));
		FolderUserStore.archiveFolder(normalizeFolder(SettingsGet('ArchiveFolder')));

		if (update) {
			rl.app.Remote.saveSystemFolders(()=>{}, {
				SentFolder: FolderUserStore.sentFolder(),
				DraftFolder: FolderUserStore.draftFolder(),
				SpamFolder: FolderUserStore.spamFolder(),
				TrashFolder: FolderUserStore.trashFolder(),
				ArchiveFolder: FolderUserStore.archiveFolder()
			});
		}

		Local.set(ClientSideKeyName.FoldersLashHash, this.FoldersHash);
	}

}

function getSystemFolderName(type, def)
{
	switch (type) {
		case FolderType.Inbox:
			return i18n('FOLDER_LIST/INBOX_NAME');
		case FolderType.SentItems:
			return i18n('FOLDER_LIST/SENT_NAME');
		case FolderType.Draft:
			return i18n('FOLDER_LIST/DRAFTS_NAME');
		case FolderType.Spam:
			return i18n('GLOBAL/SPAM');
		case FolderType.Trash:
			return i18n('FOLDER_LIST/TRASH_NAME');
		case FolderType.Archive:
			return i18n('FOLDER_LIST/ARCHIVE_NAME');
		// no default
	}
	return def;
}

export class FolderModel extends AbstractModel {
	constructor() {
		super();

		this.fullName = '';
		this.fullNameRaw = '';
		this.fullNameHash = '';
		this.delimiter = '';
		this.namespace = '';
		this.deep = 0;
		this.expires = 0;

		this.selectable = false;
		this.exists = true;

		this.addObservables({
			name: '',
			type: FolderType.User,

			focused: false,
			selected: false,
			edited: false,
			subscribed: true,
			checkable: false,
			deleteAccess: false,

			nameForEdit: '',

			privateMessageCountAll: 0,
			privateMessageCountUnread: 0,

			collapsedPrivate: true
		});

		this.subFolders = ko.observableArray(new FolderCollectionModel);
		this.actionBlink = ko.observable(false).extend({ falseTimeout: 1000 });
	}

	/**
	 * @static
	 * @param {FetchJsonFolder} json
	 * @returns {?FolderModel}
	 */
	static reviveFromJson(json) {
		const folder = super.reviveFromJson(json);
		if (folder) {
			folder.deep = json.FullNameRaw.split(folder.delimiter).length - 1;

			folder.messageCountAll = ko.computed({
					read: folder.privateMessageCountAll,
					write: (iValue) => {
						if (isPosNumeric(iValue, true)) {
							folder.privateMessageCountAll(iValue);
						} else {
							folder.privateMessageCountAll.valueHasMutated();
						}
					}
				})
				.extend({ notify: 'always' });

			folder.messageCountUnread = ko.computed({
					read: folder.privateMessageCountUnread,
					write: (value) => {
						if (isPosNumeric(value, true)) {
							folder.privateMessageCountUnread(value);
						} else {
							folder.privateMessageCountUnread.valueHasMutated();
						}
					}
				})
				.extend({ notify: 'always' });

			folder.addComputables({

				isInbox: () => FolderType.Inbox === folder.type(),

				hasSubscribedSubfolders:
					() =>
						!!folder.subFolders.find(
							oFolder => (oFolder.subscribed() || oFolder.hasSubscribedSubfolders()) && !oFolder.isSystemFolder()
						),

				canBeEdited: () => FolderType.User === folder.type() && folder.exists && folder.selectable,

				visible: () => {
					const isSubscribed = folder.subscribed(),
						isSubFolders = folder.hasSubscribedSubfolders();

					return isSubscribed || (isSubFolders && (!folder.exists || !folder.selectable));
				},

				isSystemFolder: () => FolderType.User !== folder.type(),

				hidden: () => {
					const isSystem = folder.isSystemFolder(),
						isSubFolders = folder.hasSubscribedSubfolders();

					return (isSystem && !isSubFolders) || (!folder.selectable && !isSubFolders);
				},

				printableUnreadCount: () => {
					const count = folder.messageCountAll(),
						unread = folder.messageCountUnread(),
						type = folder.type();

					if (0 < count) {
						if (FolderType.Draft === type) {
							return '' + count;
						}
						if (
							0 < unread &&
							FolderType.Trash !== type &&
							FolderType.Archive !== type &&
							FolderType.SentItems !== type
						) {
							return '' + unread;
						}
					}

					return '';
				},

				canBeDeleted: () => !folder.isSystemFolder() && !folder.subFolders.length,

				canBeSubscribed: () => !folder.isSystemFolder()
					&& SettingsUserStore.hideUnsubscribed()
					&& folder.selectable
					&& Settings.app('useImapSubscribe'),

				canBeSelected:   () => !folder.isSystemFolder() && folder.selectable,

				localName: () => {
					let name = folder.name();
					if (folder.isSystemFolder()) {
						translatorTrigger();
						name = getSystemFolderName(folder.type(), name);
					}
					return name;
				},

				manageFolderSystemName: () => {
					if (folder.isSystemFolder()) {
						translatorTrigger();
						let suffix = getSystemFolderName(folder.type(), '');
						if (folder.name() !== suffix && 'inbox' !== suffix.toLowerCase()) {
							return '(' + suffix + ')';
						}
					}

					return '';
				},

				collapsed: {
					read: () => !folder.hidden() && folder.collapsedPrivate(),
					write: (value) => {
						folder.collapsedPrivate(value);
					}
				},

				hasUnreadMessages: () => 0 < folder.messageCountUnread() && folder.printableUnreadCount(),

				hasSubscribedUnreadMessagesSubfolders: () =>
						!!folder.subFolders.find(
							folder => folder.hasUnreadMessages() || folder.hasSubscribedUnreadMessagesSubfolders()
						)
			});

			folder.addSubscribables({
				name: value => folder.nameForEdit(value),

				edited: value => value && folder.nameForEdit(folder.name()),

				messageCountUnread: unread => {
					if (FolderType.Inbox === folder.type()) {
						dispatchEvent(new CustomEvent('mailbox.inbox-unread-count', {detail:unread}));
					}
				}
			});
		}
		return folder;
	}

	/**
	 * @returns {string}
	 */
	collapsedCss() {
		return 'e-collapsed-sign ' + (this.hasSubscribedSubfolders()
			? (this.collapsed() ? 'icon-right-mini' : 'icon-down-mini')
			: 'icon-none'
		);
	}

	/**
	 * @returns {string}
	 */
	printableFullName() {
		return this.fullName.split(this.delimiter).join(' / ');
	}
}
