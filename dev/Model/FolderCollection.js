import { AbstractCollectionModel } from 'Model/AbstractCollection';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, pInt, getKeyByValue } from 'Common/Utils';
import { ClientSideKeyName, FolderType, FolderMetadataKeys } from 'Common/EnumsUser';
import * as Cache from 'Common/Cache';
import { Settings, SettingsGet } from 'Common/Globals';

import * as Local from 'Storage/Client';

import { AppUserStore } from 'Stores/User/App';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { SettingsUserStore } from 'Stores/User/Settings';

import ko from 'ko';

import { isPosNumeric } from 'Common/UtilsUser';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

const
normalizeFolder = sFolderFullNameRaw => ('' === sFolderFullNameRaw
	|| UNUSED_OPTION_VALUE === sFolderFullNameRaw
	|| null !== Cache.getFolderFromCacheList(sFolderFullNameRaw))
		? sFolderFullNameRaw
		: '';

// index is FolderType value
let SystemFolders = [];

export class FolderCollectionModel extends AbstractCollectionModel
{
/*
	constructor() {
		super();
		this.CountRec
		this.FoldersHash
		this.IsMetadataSupported
		this.IsThreadsSupported
		this.IsSortSupported
		this.IsExtendedSupported
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
		if (object && object.SystemFolders) {
			let sf = object.SystemFolders;
			SystemFolders = [
				/* USER  */ 0,
				/* INBOX */ sf[1],
				SettingsGet('SentFolder') || sf[2],
				SettingsGet('DraftFolder') || sf[3],
				SettingsGet('SpamFolder') || sf[4],
				SettingsGet('TrashFolder') || sf[5],
				SettingsGet('ArchiveFolder') || sf[12]
//				SettingsGet('TemplatesFolder') || sf[19]
//				IMPORTANT: sf[10],
//				FLAGGED: sf[11],
//				ALL: sf[13]
			];
		}

		return super.reviveFromJson(object, oFolder => {
			let oCacheFolder = Cache.getFolderFromCacheList(oFolder.FullNameRaw);

			if (oCacheFolder) {
				oFolder.SubFolders = FolderCollectionModel.reviveFromJson(oFolder.SubFolders);
				oFolder.SubFolders && oCacheFolder.subFolders(oFolder.SubFolders);
			} else {
				oCacheFolder = FolderModel.reviveFromJson(oFolder);
				if (!oCacheFolder)
					return null;

				if (1 == SystemFolders.indexOf(oFolder.FullNameRaw)) {
					oCacheFolder.type(FolderType.Inbox);
					Cache.setFolderInboxName(oFolder.FullNameRaw);
				}
				Cache.setFolder(oCacheFolder.fullNameHash, oFolder.FullNameRaw, oCacheFolder);
			}

			let type = SystemFolders.indexOf(oFolder.FullNameRaw);
			if (1 < type) {
				oCacheFolder.type(type);
			}

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
			return oCacheFolder;
		});
	}

	storeIt() {
		const cnt = pInt(this.CountRec);

		FolderUserStore.displaySpecSetting(0 >= cnt
			|| Math.max(10, Math.min(100, pInt(Settings.app('folderSpecLimit')))) < cnt);

		if (SystemFolders &&
			!('' +
				SettingsGet('SentFolder') +
				SettingsGet('DraftFolder') +
				SettingsGet('SpamFolder') +
				SettingsGet('TrashFolder') +
				SettingsGet('ArchiveFolder'))
		) {
			FolderUserStore.saveSystemFolders({
				SentFolder: SystemFolders[FolderType.SENT] || null,
				DraftFolder: SystemFolders[FolderType.DRAFTS] || null,
				SpamFolder: SystemFolders[FolderType.SPAM] || null,
				TrashFolder: SystemFolders[FolderType.TRASH] || null,
				ArchiveFolder: SystemFolders[FolderType.ARCHIVE] || null
			});
		}

		FolderUserStore.folderList(this);

		if (undefined !== this.Namespace) {
			FolderUserStore.namespace = this.Namespace;
		}

		AppUserStore.threadsAllowed(!!(Settings.app('useImapThread') && this.IsThreadsSupported));

		FolderUserStore.folderListOptimized(!!this.Optimized);
		FolderUserStore.sortSupported(!!this.IsSortSupported);
		FolderUserStore.metadataSupported(!!this.IsMetadataSupported);
		FolderUserStore.listStatusSupported(!!this.IsListStatusSupported);

		FolderUserStore.sentFolder(normalizeFolder(SettingsGet('SentFolder')));
		FolderUserStore.draftFolder(normalizeFolder(SettingsGet('DraftFolder')));
		FolderUserStore.spamFolder(normalizeFolder(SettingsGet('SpamFolder')));
		FolderUserStore.trashFolder(normalizeFolder(SettingsGet('TrashFolder')));
		FolderUserStore.archiveFolder(normalizeFolder(SettingsGet('ArchiveFolder')));

//		FolderUserStore.folderList.valueHasMutated();

		Local.set(ClientSideKeyName.FoldersLashHash, this.FoldersHash);
	}

}

function getKolabFolderName(type)
{
	const types = {
		configuration: 'CONFIGURATION',
		event: 'CALENDAR',
		contact: 'CONTACTS',
		task: 'TASKS',
		note: 'NOTES',
		file: 'FILES',
		journal: 'JOURNAL'
	};
	return types[type] ? 'Kolab ' + i18n('SETTINGS_FOLDERS/TYPE_' + types[type]) : '';
}

function getSystemFolderName(type, def)
{
	switch (type) {
		case FolderType.Inbox:
		case FolderType.Sent:
		case FolderType.Drafts:
		case FolderType.Trash:
		case FolderType.Archive:
			return i18n('FOLDER_LIST/' + getKeyByValue(FolderType, type).toUpperCase() + '_NAME');
		case FolderType.Spam:
			return i18n('GLOBAL/SPAM');
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
		this.metadata = {};

		this.exists = true;

		this.addObservables({
			name: '',
			type: FolderType.User,
			selectable: false,

			focused: false,
			selected: false,
			edited: false,
			subscribed: true,
			checkable: false,
			deleteAccess: false,

			nameForEdit: '',

			privateMessageCountAll: 0,
			privateMessageCountUnread: 0,

			kolabType: null,

			collapsedPrivate: true
		});

		this.addSubscribables({
			kolabType: sValue => this.metadata[FolderMetadataKeys.KolabFolderType] = sValue
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

			let type = (folder.metadata[FolderMetadataKeys.KolabFolderType]
				|| folder.metadata[FolderMetadataKeys.KolabFolderTypeShared]
				|| ''
			).split('.')[0];
			type && 'mail' != type && folder.kolabType(type);

			folder.messageCountAll = ko.computed({
					read: folder.privateMessageCountAll,
					write: (iValue) => {
						if (isPosNumeric(iValue)) {
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
						if (isPosNumeric(value)) {
							folder.privateMessageCountUnread(value);
						} else {
							folder.privateMessageCountUnread.valueHasMutated();
						}
					}
				})
				.extend({ notify: 'always' });

			folder.addComputables({

				isInbox: () => FolderType.Inbox === folder.type(),

				isFlagged: () => FolderUserStore.currentFolder() === folder
					&& MessageUserStore.listSearch().trim().includes('is:flagged'),

				hasSubscribedSubfolders:
					() => !!folder.subFolders().find(
						oFolder => {
							const subscribed = oFolder.hasSubscriptions();
							return !oFolder.isSystemFolder() && subscribed;
						}
					),

				hasSubscriptions: () => folder.subscribed() | folder.hasSubscribedSubfolders(),

				canBeEdited: () => FolderType.User === folder.type() && folder.exists/* && folder.selectable()*/,

				visible: () => folder.hasSubscriptions() | !SettingsUserStore.hideUnsubscribed(),

				isSystemFolder: () => FolderType.User !== folder.type() | !!folder.kolabType(),

				hidden: () => {
					let hasSubFolders = folder.hasSubscribedSubfolders();
					return (folder.isSystemFolder() | !folder.selectable()) && !hasSubFolders;
				},

				printableUnreadCount: () => {
					const count = folder.messageCountAll(),
						unread = folder.messageCountUnread(),
						type = folder.type();

					if (count) {
						if (FolderType.Drafts === type) {
							return count;
						}
						if (
							unread &&
							FolderType.Trash !== type &&
							FolderType.Archive !== type &&
							FolderType.Sent !== type
						) {
							return unread;
						}
					}

					return null;
				},

				canBeDeleted: () => !(folder.isSystemFolder() | !folder.selectable()),

				canBeSubscribed: () => Settings.app('useImapSubscribe')
					&& !(folder.isSystemFolder() | !SettingsUserStore.hideUnsubscribed() | !folder.selectable()),

				canBeSelected:   () => !(folder.isSystemFolder() | !folder.selectable() | folder.kolabType()),

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
						let suffix = getSystemFolderName(folder.type(), getKolabFolderName(folder.kolabType()));
						if (folder.name() !== suffix && 'inbox' !== suffix.toLowerCase()) {
							return '(' + suffix + ')';
						}
					}
					return '';
				},

				collapsed: {
					read: () => !folder.hidden() && folder.collapsedPrivate(),
					write: value => folder.collapsedPrivate(value)
				},

				hasUnreadMessages: () => 0 < folder.messageCountUnread() && folder.printableUnreadCount(),

				hasSubscribedUnreadMessagesSubfolders: () =>
						!!folder.subFolders().find(
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
		return this.fullName.replace(this.delimiter, ' / ');
	}
}
