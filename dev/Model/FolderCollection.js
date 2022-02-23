import { AbstractCollectionModel } from 'Model/AbstractCollection';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, getKeyByValue, forEachObjectEntry, b64EncodeJSONSafe } from 'Common/Utils';
import { ClientSideKeyName, FolderType, FolderMetadataKeys } from 'Common/EnumsUser';
import { getFolderFromCacheList, setFolder, setFolderInboxName, setFolderHash } from 'Common/Cache';
import { Settings, SettingsGet, fireEvent } from 'Common/Globals';

import * as Local from 'Storage/Client';

import { AppUserStore } from 'Stores/User/App';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { SettingsUserStore } from 'Stores/User/Settings';

import ko from 'ko';

import { sortFolders } from 'Common/Folders';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

import { koComputable } from 'External/ko';

//import { mailBox } from 'Common/Links';

import Remote from 'Remote/User/Fetch';

const
	isPosNumeric = value => null != value && /^[0-9]*$/.test(value.toString()),

	normalizeFolder = sFolderFullName => ('' === sFolderFullName
		|| UNUSED_OPTION_VALUE === sFolderFullName
		|| null !== getFolderFromCacheList(sFolderFullName))
			? sFolderFullName
			: '',

	SystemFolders = {
		Inbox:   0,
		Sent:    0,
		Drafts:  0,
		Spam:    0,
		Trash:   0,
		Archive: 0
	},

	kolabTypes = {
		configuration: 'CONFIGURATION',
		event: 'CALENDAR',
		contact: 'CONTACTS',
		task: 'TASKS',
		note: 'NOTES',
		file: 'FILES',
		journal: 'JOURNAL'
	},

	getKolabFolderName = type => kolabTypes[type] ? 'Kolab ' + i18n('SETTINGS_FOLDERS/TYPE_' + kolabTypes[type]) : '',

	getSystemFolderName = (type, def) => {
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
	};

export const
	/**
	 * @param {string} sFullName
	 * @param {boolean} bExpanded
	 */
	setExpandedFolder = (sFullName, bExpanded) => {
		let aExpandedList = Local.get(ClientSideKeyName.ExpandedFolders);
		if (!isArray(aExpandedList)) {
			aExpandedList = [];
		}

		if (bExpanded) {
			aExpandedList.includes(sFullName) || aExpandedList.push(sFullName);
		} else {
			aExpandedList = aExpandedList.filter(value => value !== sFullName);
		}

		Local.set(ClientSideKeyName.ExpandedFolders, aExpandedList);
	},

	/**
	 * @param {?Function} fCallback
	 */
	loadFolders = fCallback => {
//		clearTimeout(this.foldersTimeout);
		Remote.abort('Folders')
			.post('Folders', FolderUserStore.foldersLoading)
			.then(data => {
				data = FolderCollectionModel.reviveFromJson(data.Result);
				data && data.storeIt();
				fCallback && fCallback(true);
				// Repeat every 15 minutes?
//				this.foldersTimeout = setTimeout(loadFolders, 900000);
			})
			.catch(() => fCallback && setTimeout(fCallback, 1, false));
	};

export class FolderCollectionModel extends AbstractCollectionModel
{
/*
	constructor() {
		super();
		this.CountRec
		this.IsThreadsSupported
		this.Namespace;
		this.Optimized
		this.SystemFolders
		this.Capabilities
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {FolderCollectionModel}
	 */
	static reviveFromJson(object) {
		const expandedFolders = Local.get(ClientSideKeyName.ExpandedFolders);
		if (object && object.SystemFolders) {
			forEachObjectEntry(SystemFolders, key =>
				SystemFolders[key] = SettingsGet(key+'Folder') || object.SystemFolders[FolderType[key]]
			);
		}

		const result = super.reviveFromJson(object, oFolder => {
			let oCacheFolder = getFolderFromCacheList(oFolder.FullName),
				type = FolderType[getKeyByValue(SystemFolders, oFolder.FullName)];

			if (!oCacheFolder) {
				oCacheFolder = FolderModel.reviveFromJson(oFolder);
				if (!oCacheFolder)
					return null;

				if (1 == type) {
					oCacheFolder.type(FolderType.Inbox);
					setFolderInboxName(oFolder.FullName);
				}
				setFolder(oCacheFolder);
			}

			if (1 < type) {
				oCacheFolder.type(type);
			}

			oCacheFolder.collapsed(!expandedFolders
				|| !isArray(expandedFolders)
				|| !expandedFolders.includes(oCacheFolder.fullName));

			if (oFolder.Extended) {
				if (oFolder.Extended.Hash) {
					setFolderHash(oCacheFolder.fullName, oFolder.Extended.Hash);
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

		let i = result.length;
		if (i) {
			sortFolders(result);
			try {
				while (i--) {
					let folder = result[i], parent = getFolderFromCacheList(folder.parentName);
					if (parent) {
						parent.subFolders.unshift(folder);
						result.splice(i,1);
					}
				}
			} catch (e) {
				console.error(e);
			}
		}

		return result;
	}

	storeIt() {
		FolderUserStore.displaySpecSetting(Settings.app('folderSpecLimit') < this.CountRec);

		if (!(
				SettingsGet('SentFolder') +
				SettingsGet('DraftsFolder') +
				SettingsGet('SpamFolder') +
				SettingsGet('TrashFolder') +
				SettingsGet('ArchiveFolder')
			)
		) {
			FolderUserStore.saveSystemFolders(SystemFolders);
		}

		FolderUserStore.folderList(this);

		FolderUserStore.namespace = this.Namespace;

		AppUserStore.threadsAllowed(!!(Settings.app('useImapThread') && this.IsThreadsSupported));

		FolderUserStore.folderListOptimized(!!this.Optimized);
		FolderUserStore.quotaUsage(this.quotaUsage);
		FolderUserStore.quotaLimit(this.quotaLimit);
		FolderUserStore.capabilities(this.Capabilities);

		FolderUserStore.sentFolder(normalizeFolder(SystemFolders.Sent));
		FolderUserStore.draftsFolder(normalizeFolder(SystemFolders.Drafts));
		FolderUserStore.spamFolder(normalizeFolder(SystemFolders.Spam));
		FolderUserStore.trashFolder(normalizeFolder(SystemFolders.Trash));
		FolderUserStore.archiveFolder(normalizeFolder(SystemFolders.Archive));

//		FolderUserStore.folderList.valueHasMutated();
	}

}

export class FolderModel extends AbstractModel {
	constructor() {
		super();

		this.fullName = '';
		this.delimiter = '';
		this.deep = 0;
		this.expires = 0;
		this.metadata = {};

		this.exists = true;

//		this.hash = '';
//		this.uidNext = 0;

		this.addObservables({
			name: '',
			type: FolderType.User,
			selectable: false,

			focused: false,
			selected: false,
			edited: false,
			subscribed: true,
			checkable: false, // Check for new messages
			askDelete: false,

			nameForEdit: '',
			errorMsg: '',

			privateMessageCountAll: 0,
			privateMessageCountUnread: 0,

			kolabType: null,

			collapsed: true
		});

		this.addSubscribables({
			kolabType: sValue => this.metadata[FolderMetadataKeys.KolabFolderType] = sValue
		});

		this.subFolders = ko.observableArray(new FolderCollectionModel);
		this.actionBlink = ko.observable(false).extend({ falseTimeout: 1000 });
	}

	/**
	 * For url safe '/#/mailbox/...' path
	 */
	get fullNameHash() {
		return this.fullName.replace(/[^a-z0-9._-]+/giu, b64EncodeJSONSafe);
//		return /^[a-z0-9._-]+$/iu.test(this.fullName) ? this.fullName : b64EncodeJSONSafe(this.fullName);
	}

	/**
	 * @static
	 * @param {FetchJsonFolder} json
	 * @returns {?FolderModel}
	 */
	static reviveFromJson(json) {
		const folder = super.reviveFromJson(json);
		if (folder) {
			const path = folder.fullName.split(folder.delimiter),
				type = (folder.metadata[FolderMetadataKeys.KolabFolderType]
					|| folder.metadata[FolderMetadataKeys.KolabFolderTypeShared]
					|| ''
				).split('.')[0];

			folder.deep = path.length - 1;
			path.pop();
			folder.parentName = path.join(folder.delimiter);

			type && 'mail' != type && folder.kolabType(type);

			folder.messageCountAll = koComputable({
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

			folder.messageCountUnread = koComputable({
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
					&& MessagelistUserStore.listSearch().includes('flagged'),

				hasVisibleSubfolders: () => !!folder.subFolders().find(folder => folder.visible()),

				hasSubscriptions: () => folder.subscribed() | !!folder.subFolders().find(
						oFolder => {
							const subscribed = oFolder.hasSubscriptions();
							return !oFolder.isSystemFolder() && subscribed;
						}
					),

				canBeEdited: () => FolderType.User === folder.type() && folder.exists/* && folder.selectable()*/,

				isSystemFolder: () => FolderType.User !== folder.type() | !!folder.kolabType(),

				canBeSelected: () => folder.selectable() && !folder.isSystemFolder(),

				canBeDeleted: () => folder.canBeSelected() && folder.exists,

				canBeSubscribed: () => folder.selectable()
					&& !(folder.isSystemFolder() | !SettingsUserStore.hideUnsubscribed()),

				/**
				 * Folder is visible when:
				 * - hasVisibleSubfolders()
				 * Or when all below conditions are true:
				 * - selectable()
				 * - subscribed() OR hideUnsubscribed = false
				 * - FolderType.User
				 * - not kolabType()
				 */
				visible: () => {
					const selectable = folder.canBeSelected(),
						visible = (folder.subscribed() | !SettingsUserStore.hideUnsubscribed()) && selectable;
					return folder.hasVisibleSubfolders() | visible;
				},

				hidden: () => !folder.selectable() && (folder.isSystemFolder() | !folder.hasVisibleSubfolders()),

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

				hasUnreadMessages: () => 0 < folder.messageCountUnread() && folder.printableUnreadCount(),

				hasSubscribedUnreadMessagesSubfolders: () =>
					!!folder.subFolders().find(
						folder => folder.hasUnreadMessages() | folder.hasSubscribedUnreadMessagesSubfolders()
					)

//				,href: () => folder.canBeSelected() && mailBox(folder.fullNameHash)
			});

			folder.addSubscribables({
				name: value => folder.nameForEdit(value),

				edited: value => value && folder.nameForEdit(folder.name()),

				messageCountUnread: unread => {
					if (FolderType.Inbox === folder.type()) {
						fireEvent('mailbox.inbox-unread-count', unread);
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
		return 'e-collapsed-sign ' + (this.hasVisibleSubfolders()
			? (this.collapsed() ? 'icon-right-mini' : 'icon-down-mini')
			: 'icon-none'
		);
	}
}
