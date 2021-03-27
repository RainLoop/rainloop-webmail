import ko from 'ko';

import { FolderType, FolderSortMode } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { addObservablesTo, addSubscribablesTo } from 'Common/Utils';
import { folderListOptionsBuilder } from 'Common/UtilsUser';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';
import { SettingsGet } from 'Common/Globals';

export const FolderUserStore = new class {
	constructor() {
		addObservablesTo(this, {
			/**
			 * To use "checkable" option in /#/settings/folders
			 * When true, getNextFolderNames only lists system and "checkable" folders
			 * and affects the update of unseen count
			 * Auto set to true when amount of folders > folderSpecLimit to prevent requests overload,
			 * see application.ini [labs] folders_spec_limit
			 */
			displaySpecSetting: false,

			/**
			 * If the IMAP server supports SORT
			 */
			sortSupported: false,
//			sortMode: '',

			sentFolder: '',
			draftFolder: '',
			spamFolder: '',
			trashFolder: '',
			archiveFolder: '',

			folderListOptimized: false,
			folderListError: '',

			foldersLoading: false,
			foldersCreating: false,
			foldersDeleting: false,
			foldersRenaming: false,

			foldersInboxUnreadCount: 0
		});

		this.sortMode = ko.observable('').extend({ limitedList: Object.values(FolderSortMode) });

		this.namespace = '';

		this.folderList = ko.observableArray();

		this.currentFolder = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'selected'] });

		this.sieveAllowFileintoInbox = !!SettingsGet('SieveAllowFileintoInbox');

		this.draftFolderNotEnabled = ko.computed(
			() => !this.draftFolder() || UNUSED_OPTION_VALUE === this.draftFolder()
		);

		this.foldersListWithSingleInboxRootFolder = ko.computed(
			() => !this.folderList.find(folder => folder && !folder.isSystemFolder() && folder.visible())
		);

		this.currentFolderFullNameRaw = ko.computed(() => (this.currentFolder() ? this.currentFolder().fullNameRaw : ''));

		this.currentFolderFullName = ko.computed(() => (this.currentFolder() ? this.currentFolder().fullName : ''));
		this.currentFolderFullNameHash = ko.computed(() => (this.currentFolder() ? this.currentFolder().fullNameHash : ''));

		this.foldersChanging = ko.computed(() => {
			const loading = this.foldersLoading(),
				creating = this.foldersCreating(),
				deleting = this.foldersDeleting(),
				renaming = this.foldersRenaming();

			return loading || creating || deleting || renaming;
		});

		this.folderListSystemNames = ko.computed(() => {
			const list = [getFolderInboxName()],
				sentFolder = this.sentFolder(),
				draftFolder = this.draftFolder(),
				spamFolder = this.spamFolder(),
				trashFolder = this.trashFolder(),
				archiveFolder = this.archiveFolder();

			if (this.folderList.length) {
				if (sentFolder && UNUSED_OPTION_VALUE !== sentFolder) {
					list.push(sentFolder);
				}
				if (draftFolder && UNUSED_OPTION_VALUE !== draftFolder) {
					list.push(draftFolder);
				}
				if (spamFolder && UNUSED_OPTION_VALUE !== spamFolder) {
					list.push(spamFolder);
				}
				if (trashFolder && UNUSED_OPTION_VALUE !== trashFolder) {
					list.push(trashFolder);
				}
				if (archiveFolder && UNUSED_OPTION_VALUE !== archiveFolder) {
					list.push(archiveFolder);
				}
			}

			return list;
		});

		this.folderListSystem = ko.computed(() =>
			this.folderListSystemNames().map(name => getFolderFromCacheList(name)).filter(v => v)
		);

		this.folderMenuForMove = ko.computed(() =>
			folderListOptionsBuilder(
				this.folderListSystem(),
				this.folderList(),
				[this.currentFolderFullNameRaw()],
				[],
				null,
				(item) => (item ? item.localName() : '')
			)
		);

		this.folderMenuForFilters = ko.computed(() =>
			folderListOptionsBuilder(
				this.folderListSystem(),
				this.folderList(),
				[this.sieveAllowFileintoInbox ? '' : 'INBOX'],
				[['', '']],
				null,
				(item) => (item ? item.localName() : '')
			)
		);

		const
			fRemoveSystemFolderType = (observable) => () => {
				const folder = getFolderFromCacheList(observable());
				if (folder) {
					folder.type(FolderType.User);
				}
			},
			fSetSystemFolderType = type => value => {
				const folder = getFolderFromCacheList(value);
				if (folder) {
					folder.type(type);
				}
			};

		this.sentFolder.subscribe(fRemoveSystemFolderType(this.sentFolder), this, 'beforeChange');
		this.draftFolder.subscribe(fRemoveSystemFolderType(this.draftFolder), this, 'beforeChange');
		this.spamFolder.subscribe(fRemoveSystemFolderType(this.spamFolder), this, 'beforeChange');
		this.trashFolder.subscribe(fRemoveSystemFolderType(this.trashFolder), this, 'beforeChange');
		this.archiveFolder.subscribe(fRemoveSystemFolderType(this.archiveFolder), this, 'beforeChange');

		addSubscribablesTo(this, {
			sentFolder: fSetSystemFolderType(FolderType.SentItems),
			draftFolder: fSetSystemFolderType(FolderType.Draft),
			spamFolder: fSetSystemFolderType(FolderType.Spam),
			trashFolder: fSetSystemFolderType(FolderType.Trash),
			archiveFolder: fSetSystemFolderType(FolderType.Archive)
		});
	}

	/**
	 * @returns {Array}
	 */
	getNextFolderNames(ttl) {
		const result = [],
			limit = 10,
			utc = Date.now(),
			timeout = utc - ttl,
			timeouts = [],
			bDisplaySpecSetting = this.displaySpecSetting(),
			fSearchFunction = (list) => {
				list.forEach(folder => {
					if (
						folder &&
						folder.selectable &&
						folder.exists &&
						timeout > folder.expires &&
						(folder.isSystemFolder() || (folder.subscribed() && (folder.checkable() || !bDisplaySpecSetting)))
					) {
						timeouts.push([folder.expires, folder.fullNameRaw]);
					}

					if (folder && folder.subFolders.length) {
						fSearchFunction(folder.subFolders());
					}
				});
			};

		fSearchFunction(this.folderList());

		timeouts.sort((a, b) => (a[0] < b[0]) ? -1 : (a[0] > b[0] ? 1 : 0));

		timeouts.find(aItem => {
			const folder = getFolderFromCacheList(aItem[1]);
			if (folder) {
				folder.expires = utc;
				result.push(aItem[1]);
			}

			return limit <= result.length;
		});

		return result.filter((value, index, self) => self.indexOf(value) == index);
	}
};
