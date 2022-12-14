import { AbstractCollectionModel } from 'Model/AbstractCollection';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, getKeyByValue, forEachObjectEntry, b64EncodeJSONSafe } from 'Common/Utils';
import { ClientSideKeyNameExpandedFolders, FolderType, FolderMetadataKeys } from 'Common/EnumsUser';
import { getFolderFromCacheList, setFolder, setFolderInboxName } from 'Common/Cache';
import { Settings, SettingsGet, fireEvent } from 'Common/Globals';

import * as Local from 'Storage/Client';

import { AppUserStore } from 'Stores/User/App';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { SettingsUserStore } from 'Stores/User/Settings';

import { sortFolders } from 'Common/Folders';
import { i18n, translateTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

import { koComputable, addObservablesTo } from 'External/ko';

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
		let aExpandedList = Local.get(ClientSideKeyNameExpandedFolders);
		aExpandedList = new Set(isArray(aExpandedList) ? aExpandedList : []);
		bExpanded ? aExpandedList.add(sFullName) : aExpandedList.delete(sFullName);
		Local.set(ClientSideKeyNameExpandedFolders, [...aExpandedList]);
	},

	foldersFilter = ko.observable(''),

	/**
	 * @param {?Function} fCallback
	 */
	loadFolders = fCallback => {
//		clearTimeout(this.foldersTimeout);
		Remote.abort('Folders')
			.post('Folders', FolderUserStore.foldersLoading)
			.then(data => {
				FolderCollectionModel.reviveFromJson(data.Result)?.storeIt();
				fCallback?.(true);
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
		const expandedFolders = Local.get(ClientSideKeyNameExpandedFolders);
		if (object?.SystemFolders) {
			forEachObjectEntry(SystemFolders, key =>
				SystemFolders[key] = SettingsGet(key+'Folder') || object.SystemFolders[FolderType[key]]
			);
		}

		const result = super.reviveFromJson(object, oFolder => {
			let oCacheFolder = getFolderFromCacheList(oFolder.FullName),
				type = FolderType[getKeyByValue(SystemFolders, oFolder.FullName)];

			if (oCacheFolder) {
//				oCacheFolder.revivePropertiesFromJson(oFolder);
				if (oFolder.Hash) {
					oCacheFolder.hash = oFolder.Hash;
				}
				if (null != oFolder.totalEmails) {
					oCacheFolder.totalEmails(oFolder.totalEmails);
				}
				if (null != oFolder.unreadEmails) {
					oCacheFolder.unreadEmails(oFolder.unreadEmails);
				}
			} else {
				oCacheFolder = FolderModel.reviveFromJson(oFolder);
				if (!oCacheFolder)
					return null;

				if (1 == type) {
					oCacheFolder.type(type);
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

		// 'THREAD=REFS', 'THREAD=REFERENCES', 'THREAD=ORDEREDSUBJECT'
		AppUserStore.threadsAllowed(!!(
			Settings.app('useImapThread') && this.Capabilities.some(capa => capa.startsWith('THREAD='))
		));

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

		this.hash = '';
//		this.id = null;
		this.uidNext = null;

		addObservablesTo(this, {
			name: '',
			type: FolderType.User,
			selectable: false,

			focused: false,
			selected: false,
			editing: false,
			isSubscribed: true,
			checkable: false, // Check for new messages
			askDelete: false,

			nameForEdit: '',
			errorMsg: '',

			totalEmailsValue: 0,
			unreadEmailsValue: 0,

			kolabType: null,

			collapsed: true,

			tagsAllowed: false
		});

		this.flags = ko.observableArray();
		this.permanentFlags = ko.observableArray();

		this.addSubscribables({
			kolabType: sValue => this.metadata[FolderMetadataKeys.KolabFolderType] = sValue,
			permanentFlags: aValue => this.tagsAllowed(aValue.includes('\\*'))
		});

		this.subFolders = ko.observableArray(new FolderCollectionModel);
		this.actionBlink = ko.observable(false).extend({ falseTimeout: 1000 });

		this.totalEmails = koComputable({
				read: this.totalEmailsValue,
				write: iValue =>
					isPosNumeric(iValue) ? this.totalEmailsValue(iValue) : this.totalEmailsValue.valueHasMutated()
			})
			.extend({ notify: 'always' });

		this.unreadEmails = koComputable({
				read: this.unreadEmailsValue,
				write: value =>
					isPosNumeric(value) ? this.unreadEmailsValue(value) : this.unreadEmailsValue.valueHasMutated()
			})
			.extend({ notify: 'always' });
/*
		https://www.rfc-editor.org/rfc/rfc8621.html#section-2
		"myRights": {
			"mayAddItems": true,
			"mayRename": false,
			"maySubmit": true,
			"mayDelete": false,
			"maySetKeywords": true,
			"mayRemoveItems": true,
			"mayCreateChild": true,
			"maySetSeen": true,
			"mayReadItems": true
		},
*/
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

			folder.addComputables({

				isInbox: () => FolderType.Inbox === folder.type(),

				isFlagged: () => FolderUserStore.currentFolder() === folder
					&& MessagelistUserStore.listSearch().includes('flagged'),

				hasVisibleSubfolders: () => !!folder.subFolders().find(folder => folder.visible()),

				hasSubscriptions: () => folder.isSubscribed() | !!folder.subFolders().find(
						oFolder => {
							const subscribed = oFolder.hasSubscriptions();
							return !oFolder.isSystemFolder() && subscribed;
						}
					),

				canBeEdited: () => FolderType.User === folder.type() && folder.exists/* && folder.selectable()*/,

				isSystemFolder: () => FolderType.User !== folder.type()
					| (FolderUserStore.allowKolab() && !!folder.kolabType() & !SettingsUserStore.unhideKolabFolders()),

				canBeSelected: () => folder.selectable() && !folder.isSystemFolder(),

				canBeDeleted: () => folder.canBeSelected() && folder.exists,

				canBeSubscribed: () => folder.selectable()
					&& !(folder.isSystemFolder() | !SettingsUserStore.hideUnsubscribed()),

				/**
				 * Folder is visible when:
				 * - hasVisibleSubfolders()
				 * Or when all below conditions are true:
				 * - selectable()
				 * - isSubscribed() OR hideUnsubscribed = false
				 * - FolderType.User
				 * - not kolabType()
				 */
				visible: () => {
					const selectable = folder.canBeSelected(),
						name = folder.name(),
						filter = foldersFilter(),
						visible = (folder.isSubscribed() | !SettingsUserStore.hideUnsubscribed())
							&& selectable
							&& (!filter || name.toLowerCase().includes(filter.toLowerCase()));
					return folder.hasVisibleSubfolders() | visible;
				},

				printableUnreadCount: () => folder.unreadEmails() || null,
/*
				{
					// TODO: make this optional in Settings
					// https://github.com/the-djmaze/snappymail/issues/457
					// https://github.com/the-djmaze/snappymail/issues/567
					const
						unread = folder.unreadEmails(),
						type = folder.type();
//					return ((!folder.isSystemFolder() || type == FolderType.Inbox) && unread) ? unread : null;
				},
*/

				localName: () => {
					let name = folder.name();
					if (folder.isSystemFolder()) {
						translateTrigger();
						name = getSystemFolderName(folder.type(), name);
					}
					return name;
				},

				manageFolderSystemName: () => {
					if (folder.isSystemFolder()) {
						translateTrigger();
						let suffix = getSystemFolderName(folder.type(), getKolabFolderName(folder.kolabType()));
						if (folder.name() !== suffix && 'inbox' !== suffix.toLowerCase()) {
							return '(' + suffix + ')';
						}
					}
					return '';
				},

				hasSubscribedUnreadMessagesSubfolders: () =>
					!!folder.subFolders().find(
						folder => folder.printableUnreadCount() | folder.hasSubscribedUnreadMessagesSubfolders()
					)
/*
					!!folder.subFolders().filter(
						folder => folder.printableUnreadCount() | folder.hasSubscribedUnreadMessagesSubfolders()
					).length
*/
//				,href: () => folder.canBeSelected() && mailBox(folder.fullNameHash)
			});

			folder.addSubscribables({
				editing: value => value && folder.nameForEdit(folder.name()),

				unreadEmails: unread => FolderType.Inbox === folder.type() && fireEvent('mailbox.inbox-unread-count', unread)
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
