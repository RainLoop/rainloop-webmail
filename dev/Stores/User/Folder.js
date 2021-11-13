import ko from 'ko';

import { FolderType, FolderSortMode } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { addObservablesTo, addSubscribablesTo, addComputablesTo } from 'Common/Utils';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';
import { Settings, SettingsGet } from 'Common/Globals';
//import Remote from 'Remote/User/Fetch'; Circular dependency

export const FolderUserStore = new class {
	constructor() {
		const self = this;
		addObservablesTo(self, {
			/**
			 * To use "checkable" option in /#/settings/folders
			 * When true, getNextFolderNames only lists system and "checkable" folders
			 * and affects the update of unseen count
			 * Auto set to true when amount of folders > folderSpecLimit to prevent requests overload,
			 * see application.ini [labs] folders_spec_limit
			 */
			displaySpecSetting: false,

//			sortMode: '',

			quotaLimit: 0,
			quotaUsage: 0,

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

		self.sortMode = ko.observable('').extend({ limitedList: Object.values(FolderSortMode) });

		self.namespace = '';

		self.folderList = ko.observableArray();

		self.capabilities = ko.observableArray();

		self.currentFolder = ko.observable(null).extend({ toggleSubscribeProperty: [self, 'selected'] });

		self.sieveAllowFileintoInbox = !!SettingsGet('SieveAllowFileintoInbox');

		addComputablesTo(self, {

			draftFolderNotEnabled: () => !self.draftFolder() || UNUSED_OPTION_VALUE === self.draftFolder(),

			currentFolderFullNameRaw: () => (self.currentFolder() ? self.currentFolder().fullNameRaw : ''),

			currentFolderFullName: () => (self.currentFolder() ? self.currentFolder().fullName : ''),
			currentFolderFullNameHash: () => (self.currentFolder() ? self.currentFolder().fullNameHash : ''),

			foldersChanging: () =>
				self.foldersLoading() | self.foldersCreating() | self.foldersDeleting() | self.foldersRenaming(),

			folderListSystemNames: () => {
				const list = [getFolderInboxName()],
				others = [self.sentFolder(), self.draftFolder(), self.spamFolder(), self.trashFolder(), self.archiveFolder()];

				self.folderList().length &&
					others.forEach(name => name && UNUSED_OPTION_VALUE !== name && list.push(name));

				return list;
			},

			folderListSystem: () =>
				self.folderListSystemNames().map(name => getFolderFromCacheList(name)).filter(v => v)
		});

		const
			fRemoveSystemFolderType = (observable) => () => {
				const folder = getFolderFromCacheList(observable());
				folder && folder.type(FolderType.User);
			},
			fSetSystemFolderType = type => value => {
				const folder = getFolderFromCacheList(value);
				folder && folder.type(type);
			};

		self.sentFolder.subscribe(fRemoveSystemFolderType(self.sentFolder), self, 'beforeChange');
		self.draftFolder.subscribe(fRemoveSystemFolderType(self.draftFolder), self, 'beforeChange');
		self.spamFolder.subscribe(fRemoveSystemFolderType(self.spamFolder), self, 'beforeChange');
		self.trashFolder.subscribe(fRemoveSystemFolderType(self.trashFolder), self, 'beforeChange');
		self.archiveFolder.subscribe(fRemoveSystemFolderType(self.archiveFolder), self, 'beforeChange');

		addSubscribablesTo(self, {
			sentFolder: fSetSystemFolderType(FolderType.Sent),
			draftFolder: fSetSystemFolderType(FolderType.Drafts),
			spamFolder: fSetSystemFolderType(FolderType.Spam),
			trashFolder: fSetSystemFolderType(FolderType.Trash),
			archiveFolder: fSetSystemFolderType(FolderType.Archive)
		});

		self.quotaPercentage = ko.computed(() => {
			const quota = self.quotaLimit(), usage = self.quotaUsage();
			return 0 < quota ? Math.ceil((usage / quota) * 100) : 0;
		});
	}

	/**
	 * If the IMAP server supports SORT, METADATA
	 */
	hasCapability(name) {
		return this.capabilities().includes(name);
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
						folder.selectable() &&
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

	saveSystemFolders(folders) {
		folders = folders || {
			SentFolder: FolderUserStore.sentFolder(),
			DraftFolder: FolderUserStore.draftFolder(),
			SpamFolder: FolderUserStore.spamFolder(),
			TrashFolder: FolderUserStore.trashFolder(),
			ArchiveFolder: FolderUserStore.archiveFolder()
		};
		Object.entries(folders).forEach(([k,v])=>Settings.set(k,v));
		rl.app.Remote.saveSystemFolders(null, folders);
	}
};
