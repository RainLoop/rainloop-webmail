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

import { /*koComputable,*/ addObservablesTo } from 'External/ko';

//import { mailBox } from 'Common/Links';

import Remote from 'Remote/User/Fetch';

const
//	isPosNumeric = value => null != value && /^[0-9]*$/.test(value.toString()),

	normalizeFolder = sFolderFullName => ('' === sFolderFullName
		|| UNUSED_OPTION_VALUE === sFolderFullName
		|| null !== getFolderFromCacheList(sFolderFullName))
			? sFolderFullName
			: '',

	SystemFolders = {
		Inbox:   0,
		Sent:    0,
		Drafts:  0,
		Junk:    0, // Spam
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
			case FolderType.Junk:
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
		this.quotaUsage;
		this.quotaLimit;
		this.namespace;
		this.optimized
		this.capabilities
	}
*/

	/**
	 * @param {?Object} json
	 * @returns {FolderCollectionModel}
	 */
	static reviveFromJson(object) {
		const expandedFolders = Local.get(ClientSideKeyNameExpandedFolders);

		forEachObjectEntry(SystemFolders, (key, value) =>
			value || (SystemFolders[key] = SettingsGet(key+'Folder'))
		);

		const result = super.reviveFromJson(object, oFolder => {
			let oCacheFolder = getFolderFromCacheList(oFolder.FullName);
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
				setFolder(oCacheFolder);
			}

			// JMAP RFC 8621
			let role = oFolder.role;
/*
			if (!role) {
				// Kolab
				let type = oFolder.metadata[FolderMetadataKeys.KolabFolderType]
					|| oFolder.metadata[FolderMetadataKeys.KolabFolderTypeShared];
				switch (type) {
					case 'mail.inbox':
					case 'mail.drafts':
						role = type.replace('mail.', '');
						break;
//					case 'mail.outbox':
					case 'mail.sentitems':
						role = 'sent';
						break;
					case 'mail.junkemail':
						role = 'spam';
						break;
					case 'mail.wastebasket':
						role = 'trash';
						break;
				}
				// Flags
				if (oFolder.Flags.includes('\\sentmail')) {
					role = 'sent';
				}
				if (oFolder.Flags.includes('\\spam')) {
					role = 'junk';
				}
				if (oFolder.Flags.includes('\\bin')) {
					role = 'trash';
				}
				if (oFolder.Flags.includes('\\important')) {
					role = 'important';
				}
				if (oFolder.Flags.includes('\\starred')) {
					role = 'flagged';
				}
				if (oFolder.Flags.includes('\\all') || oFolder.Flags.includes('\\allmail')) {
					role = 'all';
				}
			}
*/
			if (role) {
				role = role[0].toUpperCase() + role.slice(1);
				SystemFolders[role] || (SystemFolders[role] = oFolder.FullName);
			}

			oCacheFolder.type(FolderType[getKeyByValue(SystemFolders, oFolder.FullName)] || 0);

			oCacheFolder.collapsed(!expandedFolders
				|| !isArray(expandedFolders)
				|| !expandedFolders.includes(oCacheFolder.fullName));

			return oCacheFolder;
		});

		result.CountRec = result.length;
		setFolderInboxName(SystemFolders.Inbox);

		let i = result.length;
		if (i) {
			sortFolders(result);
			try {
				while (i--) {
					let folder = result[i], parent = getFolderFromCacheList(folder.parentName);
					if (!parent) {
						// Create NonExistent parent folders
						let delimiter = folder.delimiter;
						if (delimiter) {
							let parents = folder.fullName.split(delimiter);
							parents.pop();
							while (parents.length) {
								let parentName = parents.join(delimiter),
									name = parents.pop(),
									pfolder = getFolderFromCacheList(parentName);
								if (!pfolder) {
									pfolder = FolderModel.reviveFromJson({
										'@Object': 'Object/Folder',
										Name: name,
										FullName: parentName,
										Delimiter: delimiter,
										Exists: false,
										isSubscribed: false,
										Flags: ['\\nonexistent']
									});
									setFolder(pfolder);
									result.splice(i, 0, pfolder);
									++i;
								}
							}
							parent = getFolderFromCacheList(folder.parentName);
						}
					}
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
				SettingsGet('JunkFolder') +
				SettingsGet('TrashFolder') +
				SettingsGet('ArchiveFolder')
			)
		) {
			FolderUserStore.saveSystemFolders(SystemFolders);
		}

		FolderUserStore.folderList(this);

		FolderUserStore.namespace = this.namespace;

		// 'THREAD=REFS', 'THREAD=REFERENCES', 'THREAD=ORDEREDSUBJECT'
		AppUserStore.threadsAllowed(!!(
			Settings.app('useImapThread') && this.capabilities.some(capa => capa.startsWith('THREAD='))
		));

//		FolderUserStore.folderListOptimized(!!this.optimized);
		FolderUserStore.quotaUsage(this.quotaUsage);
		FolderUserStore.quotaLimit(this.quotaLimit);
		FolderUserStore.capabilities(this.capabilities);

		FolderUserStore.sentFolder(normalizeFolder(SystemFolders.Sent));
		FolderUserStore.draftsFolder(normalizeFolder(SystemFolders.Drafts));
		FolderUserStore.spamFolder(normalizeFolder(SystemFolders.Junk));
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
			type: 0,
			role: null,
			selectable: false,

			focused: false,
			selected: false,
			editing: false,
			isSubscribed: true,
			checkable: false, // Check for new messages
			askDelete: false,

			nameForEdit: '',
			errorMsg: '',

			totalEmails: 0,
			unreadEmails: 0,

			kolabType: null,

			collapsed: true,

			tagsAllowed: false
		});

		this.flags = ko.observableArray();
		this.permanentFlags = ko.observableArray();

		this.addSubscribables({
			kolabType: sValue => this.metadata[FolderMetadataKeys.KolabFolderType] = sValue,
			permanentFlags: aValue => this.tagsAllowed(aValue.includes('\\*')),
			editing: value => value && this.nameForEdit(this.name()),
			unreadEmails: unread => FolderType.Inbox === this.type() && fireEvent('mailbox.inbox-unread-count', unread)
		});

		this.subFolders = ko.observableArray(new FolderCollectionModel);
		this.actionBlink = ko.observable(false).extend({ falseTimeout: 1000 });
/*
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
*/
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

		this.addComputables({

			isInbox: () => FolderType.Inbox === this.type(),

			isFlagged: () => FolderUserStore.currentFolder() === this
				&& MessagelistUserStore.listSearch().includes('flagged'),

			hasVisibleSubfolders: () => !!this.subFolders().find(folder => folder.visible()),

			hasSubscriptions: () => this.isSubscribed() | !!this.subFolders().find(
					oFolder => {
						const subscribed = oFolder.hasSubscriptions();
						return !oFolder.isSystemFolder() && subscribed;
					}
				),

			canBeEdited: () => !this.type() && this.exists/* && this.selectable()*/,

			isSystemFolder: () => this.type()
				| (FolderUserStore.allowKolab() && !!this.kolabType() & !SettingsUserStore.unhideKolabFolders()),

			canBeSelected: () => this.selectable() && !this.isSystemFolder(),

			canBeDeleted: () => this.canBeSelected() && this.exists,

			canBeSubscribed: () => this.selectable()
				&& !(this.isSystemFolder() | !SettingsUserStore.hideUnsubscribed()),

			/**
			 * Folder is visible when:
			 * - hasVisibleSubfolders()
			 * Or when all below conditions are true:
			 * - selectable()
			 * - isSubscribed() OR hideUnsubscribed = false
			 * - 0 == type()
			 * - not kolabType()
			 */
			visible: () => {
				const selectable = this.canBeSelected(),
					name = this.name(),
					filter = foldersFilter(),
					visible = (this.isSubscribed() | !SettingsUserStore.hideUnsubscribed())
						&& selectable
						&& (!filter || name.toLowerCase().includes(filter.toLowerCase()));
				return this.hasVisibleSubfolders() | visible;
			},

			unreadCount: () => this.unreadEmails() || null,
/*
			{
				// TODO: make this optional in Settings
				// https://github.com/the-djmaze/snappymail/issues/457
				// https://github.com/the-djmaze/snappymail/issues/567
				const
					unread = this.unreadEmails(),
					type = this.type();
//				return ((!this.isSystemFolder() || type == FolderType.Inbox) && unread) ? unread : null;
			},
*/

			localName: () => {
				let name = this.name();
				if (this.isSystemFolder()) {
					translateTrigger();
					name = getSystemFolderName(this.type(), name);
				}
				return name;
			},

			manageFolderSystemName: () => {
				if (this.isSystemFolder()) {
					translateTrigger();
					let suffix = getSystemFolderName(this.type(), getKolabFolderName(this.kolabType()));
					if (this.name() !== suffix && 'inbox' !== suffix.toLowerCase()) {
						return '(' + suffix + ')';
					}
				}
				return '';
			},

			hasSubscribedUnreadMessagesSubfolders: () =>
				!!this.subFolders().find(
					folder => folder.unreadCount() | folder.hasSubscribedUnreadMessagesSubfolders()
				)
/*
				!!this.subFolders().filter(
					folder => folder.unreadCount() | folder.hasSubscribedUnreadMessagesSubfolders()
				).length
*/
//			,href: () => this.canBeSelected() && mailBox(this.fullNameHash)
		});
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
