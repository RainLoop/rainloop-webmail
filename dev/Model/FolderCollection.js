import { AbstractCollectionModel } from 'Model/AbstractCollection';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, getKeyByValue, forEachObjectEntry, b64EncodeJSONSafe } from 'Common/Utils';
import { ClientSideKeyNameExpandedFolders, FolderType, FolderMetadataKeys } from 'Common/EnumsUser';
import { clearCache, getFolderFromCacheList, setFolder, setFolderInboxName, removeFolderFromCacheList } from 'Common/Cache';
import { Settings, SettingsGet, fireEvent } from 'Common/Globals';
import { Notifications } from 'Common/Enums';

import * as Local from 'Storage/Client';

import { AppUserStore } from 'Stores/User/App';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { SettingsUserStore } from 'Stores/User/Settings';

import { sortFolders } from 'Common/Folders';
import { i18n, translateTrigger, getNotification } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

import { /*koComputable,*/ addObservablesTo } from 'External/ko';

import { mailBox } from 'Common/Links';

import Remote from 'Remote/User/Fetch';

import { FileInfo } from 'Common/File';

import { FolderPopupView } from 'View/Popup/Folder';
import { showScreenPopup } from 'Knoin/Knoin';

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
				clearCache();
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
		this.allow; // allow adding
//		this.exist;
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
			let oCacheFolder = getFolderFromCacheList(oFolder.fullName);
			if (oCacheFolder) {
//				oCacheFolder.revivePropertiesFromJson(oFolder);
				if (oFolder.etag) {
					oCacheFolder.etag = oFolder.etag;
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
				if (oFolder.attributes.includes('\\sentmail')) {
					role = 'sent';
				}
				if (oFolder.attributes.includes('\\spam')) {
					role = 'junk';
				}
				if (oFolder.attributes.includes('\\bin')) {
					role = 'trash';
				}
				if (oFolder.attributes.includes('\\important')) {
					role = 'important';
				}
				if (oFolder.attributes.includes('\\starred')) {
					role = 'flagged';
				}
				if (oFolder.attributes.includes('\\all') || oFolder.flags.includes('\\allmail')) {
					role = 'all';
				}
			}
*/
			if (role) {
				role = role[0].toUpperCase() + role.slice(1);
				SystemFolders[role] || (SystemFolders[role] = oFolder.fullName);
			}

			oCacheFolder.type(FolderType[getKeyByValue(SystemFolders, oFolder.fullName)] || 0);

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
									console.log('Create nonexistent folder ' + parentName);
									pfolder = FolderModel.reviveFromJson({
										'@Object': 'Object/Folder',
										name: name,
										fullName: parentName,
										delimiter: delimiter,
										attributes: ['\\nonexistent']
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

	visible() {
		return this.filter(folder => folder.visible());
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
		AppUserStore.threadsAllowed(!!this.capabilities.some(capa => capa.startsWith('THREAD=')));

//		FolderUserStore.optimized(!!this.optimized);
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
		this.parentName = '';
		this.delimiter = '';
		this.deep = 0;
		this.expires = 0;
		this.metadata = {};

		this.exists = true;

		this.etag = '';
		this.id = 0;
		this.uidNext = 0;
		this.size = 0;

		addObservablesTo(this, {
			name: '',
			type: 0,
			role: null,
			selectable: false,

			focused: false,
			selected: false,
			isSubscribed: true,
			checkable: false, // Check for new messages
			askDelete: false,

			errorMsg: '',

			totalEmails: 0,
			unreadEmails: 0,

			kolabType: null,

			collapsed: true,

			tagsAllowed: false
		});

		this.attributes = ko.observableArray();
		// For messages
		this.permanentFlags = ko.observableArray();

		this.addSubscribables({
			kolabType: sValue => this.metadata[FolderMetadataKeys.KolabFolderType] = sValue,
			permanentFlags: aValue => this.tagsAllowed(aValue.includes('\\*')),
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
		// https://www.rfc-editor.org/rfc/rfc8621.html#section-2
		this.myRights = {
			'mayAddItems': true,
			'mayCreateChild': true,
			'mayDelete': true,
			'mayReadItems': true,
			'mayRemoveItems': true,
			'mayRename': true,
			'maySetKeywords': true,
			'maySetSeen': true,
			'maySubmit': true
		};
*/
		this.addComputables({

			isInbox: () => FolderType.Inbox === this.type(),

			isFlagged: () => FolderUserStore.currentFolder() === this
				&& MessagelistUserStore.listSearch().includes('flagged'),

//			isSubscribed: () => this.attributes().includes('\\subscribed'),

			hasVisibleSubfolders: () => !!this.subFolders().find(folder => folder.visible()),
			visibleSubfolders: () => this.subFolders().visible(),

			hasSubscriptions: () => this.isSubscribed() | !!this.subFolders().find(
					oFolder => {
						const subscribed = oFolder.hasSubscriptions();
						return !oFolder.isSystemFolder() && subscribed;
					}
				),

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

			nameInfo: () => {
				if (this.isSystemFolder()) {
					translateTrigger();
					let suffix = getSystemFolderName(this.type(), getKolabFolderName(this.kolabType()));
					if (this.name() !== suffix && 'inbox' !== suffix.toLowerCase()) {
						return ' (' + suffix + ')';
					}
				}
				return '';
			},

			friendlySize: () => FileInfo.friendlySize(this.size),

			detailedName: () => this.name() + ' ' + this.nameInfo(),

			hasSubscribedUnreadMessagesSubfolders: () =>
				!!this.subFolders().find(
					folder => folder.unreadEmails() | folder.hasSubscribedUnreadMessagesSubfolders()
				)
/*
				!!this.subFolders().filter(
					folder => folder.unreadEmails() | folder.hasSubscribedUnreadMessagesSubfolders()
				).length
*/
			,href: () => this.canBeSelected() && mailBox(this.fullNameHash)
		});
	}

	edit() {
		showScreenPopup(FolderPopupView, [this]);
	}

	rename(nameToEdit, parentName) {
		nameToEdit = nameToEdit.trim();
		const folder = this,
			parentFolder = getFolderFromCacheList(parentName),
			oldFullname = folder.fullName,
			newFullname = (parentFolder ? (parentName + parentFolder.delimiter) : '') + nameToEdit;
		if (nameToEdit && newFullname != oldFullname) {
			Remote.abort('Folders').post('FolderRename', FolderUserStore.foldersRenaming, {
					oldName: oldFullname,
					newName: newFullname,
					subscribe: folder.isSubscribed() ? 1 : 0
				})
				.then(() => {
					folder.fullName = newFullname;
					folder.name(nameToEdit);
					if (folder.subFolders.length || folder.parentName != parentName) {
						Remote.setTrigger(FolderUserStore.foldersLoading, true);
//						clearTimeout(Remote.foldersTimeout);
//						Remote.foldersTimeout = setTimeout(loadFolders, 500);
						setTimeout(loadFolders, 500);
						// TODO: rename all subfolders with folder.delimiter to prevent reload?
					} else {
						removeFolderFromCacheList(oldFullname);
						setFolder(folder);
						sortFolders(parentFolder ? parentFolder.subFolders : FolderUserStore.folderList);
					}
				})
				.catch(error => {
					FolderUserStore.error(
						getNotification(error.code, '', Notifications.CantRenameFolder)
						+ '.\n' + error.message);
				});
		}
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
				attr = name => folder.attributes.includes(name),
				type = (folder.metadata[FolderMetadataKeys.KolabFolderType]
					|| folder.metadata[FolderMetadataKeys.KolabFolderTypeShared]
					|| ''
				).split('.')[0];

			folder.deep = path.length - 1;
			path.pop();
			folder.parentName = path.join(folder.delimiter);

			folder.isSubscribed(attr('\\subscribed'));
			folder.exists = !attr('\\nonexistent');
			folder.subFolders.allow = !attr('\\noinferiors');
//			folder.subFolders.exist = attr('\\haschildren') || !attr('\\hasnochildren');
			folder.selectable(folder.exists && !attr('\\noselect'));

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
