import ko from 'ko';

import { FolderType } from 'Common/Enums';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { folderListOptionsBuilder } from 'Common/UtilsUser';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';

class FolderUserStore {
	constructor() {
		ko.addObservablesTo(this, {
			// To use "checkable" option in /#/settings/folders
			// When true, getNextFolderNames only lists system and "checkable" folders
			// and affects the update of unseen count
			// Auto set to true when amount of folders > folderSpecLimit to prevent requests overload
			displaySpecSetting: false,

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

		this.namespace = '';

		this.folderList = ko.observableArray([]);

		this.currentFolder = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'selected'] });

		this.sieveAllowFileintoInbox = !!rl.settings.get('SieveAllowFileintoInbox');

		this.draftFolderNotEnabled = ko.computed(
			() => !this.draftFolder() || UNUSED_OPTION_VALUE === this.draftFolder()
		);

		this.foldersListWithSingleInboxRootFolder = ko.computed(
			() => !this.folderList().find(folder => folder && !folder.isSystemFolder() && folder.visible())
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
				folders = this.folderList(),
				sentFolder = this.sentFolder(),
				draftFolder = this.draftFolder(),
				spamFolder = this.spamFolder(),
				trashFolder = this.trashFolder(),
				archiveFolder = this.archiveFolder();

			if (Array.isNotEmpty(folders)) {
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
				null,
				null,
				null,
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
				null,
				null,
				(item) => (item ? item.localName() : '')
			)
		);

		this.subscribers();
	}

	subscribers() {
		const fRemoveSystemFolderType = (observable) => () => {
			const folder = getFolderFromCacheList(observable());
			if (folder) {
				folder.type(FolderType.User);
			}
		};
		const fSetSystemFolderType = (type) => (value) => {
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

		this.sentFolder.subscribe(fSetSystemFolderType(FolderType.SentItems), this);
		this.draftFolder.subscribe(fSetSystemFolderType(FolderType.Draft), this);
		this.spamFolder.subscribe(fSetSystemFolderType(FolderType.Spam), this);
		this.trashFolder.subscribe(fSetSystemFolderType(FolderType.Trash), this);
		this.archiveFolder.subscribe(fSetSystemFolderType(FolderType.Archive), this);
	}

	/**
	 * @returns {Array}
	 */
	getNextFolderNames() {
		const result = [],
			limit = 10,
			utc = Date.now(),
			timeout = utc - 60000 * 5,
			timeouts = [],
			inboxFolderName = getFolderInboxName(),
			bDisplaySpecSetting = this.displaySpecSetting(),
			fSearchFunction = (list) => {
				list.forEach(folder => {
					if (
						folder &&
						inboxFolderName !== folder.fullNameRaw &&
						folder.selectable &&
						folder.exists &&
						timeout > folder.interval &&
						(folder.isSystemFolder() || (folder.subscribed() && (folder.checkable() || !bDisplaySpecSetting)))
					) {
						timeouts.push([folder.interval, folder.fullNameRaw]);
					}

					if (folder && folder.subFolders().length) {
						fSearchFunction(folder.subFolders());
					}
				});
			};

		fSearchFunction(this.folderList());

		timeouts.sort((a, b) => (a[0] < b[0]) ? -1 : (a[0] > b[0] ? 1 : 0));

		timeouts.find(aItem => {
			const folder = getFolderFromCacheList(aItem[1]);
			if (folder) {
				folder.interval = utc;
				result.push(aItem[1]);
			}

			return limit <= result.length;
		});

		return result.filter((value, index, self) => self.indexOf(value) == index);
	}
}

export default new FolderUserStore();
