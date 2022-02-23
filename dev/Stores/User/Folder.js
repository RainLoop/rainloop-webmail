import ko from 'ko';
import { koComputable } from 'External/ko';

import { FolderType, FolderSortMode } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { forEachObjectEntry } from 'Common/Utils';
import { addObservablesTo, addSubscribablesTo, addComputablesTo } from 'External/ko';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';
import { Settings } from 'Common/Globals';
//import Remote from 'Remote/User/Fetch'; // Circular dependency

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
			draftsFolder: '',
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

		self.folderList = ko.observableArray(/*new FolderCollectionModel*/);

		self.capabilities = ko.observableArray();

		self.currentFolder = ko.observable(null).extend({ toggleSubscribeProperty: [self, 'selected'] });

		addComputablesTo(self, {

			draftsFolderNotEnabled: () => !self.draftsFolder() || UNUSED_OPTION_VALUE === self.draftsFolder(),

			currentFolderFullName: () => (self.currentFolder() ? self.currentFolder().fullName : ''),
			currentFolderFullNameHash: () => (self.currentFolder() ? self.currentFolder().fullNameHash : ''),

			foldersChanging: () =>
				self.foldersLoading() | self.foldersCreating() | self.foldersDeleting() | self.foldersRenaming(),

			folderListSystemNames: () => {
				const list = [getFolderInboxName()],
				others = [self.sentFolder(), self.draftsFolder(), self.spamFolder(), self.trashFolder(), self.archiveFolder()];

				self.folderList().length &&
					others.forEach(name => name && UNUSED_OPTION_VALUE !== name && list.push(name));

				return list;
			},

			folderListSystem: () =>
				self.folderListSystemNames().map(name => getFolderFromCacheList(name)).filter(v => v)
		});

		const
			subscribeRemoveSystemFolder = observable => {
				observable.subscribe(() => {
					const folder = getFolderFromCacheList(observable());
					folder && folder.type(FolderType.User);
				}, self, 'beforeChange');
			},
			fSetSystemFolderType = type => value => {
				const folder = getFolderFromCacheList(value);
				folder && folder.type(type);
			};

		subscribeRemoveSystemFolder(self.sentFolder);
		subscribeRemoveSystemFolder(self.draftsFolder);
		subscribeRemoveSystemFolder(self.spamFolder);
		subscribeRemoveSystemFolder(self.trashFolder);
		subscribeRemoveSystemFolder(self.archiveFolder);

		addSubscribablesTo(self, {
			sentFolder: fSetSystemFolderType(FolderType.Sent),
			draftsFolder: fSetSystemFolderType(FolderType.Drafts),
			spamFolder: fSetSystemFolderType(FolderType.Spam),
			trashFolder: fSetSystemFolderType(FolderType.Trash),
			archiveFolder: fSetSystemFolderType(FolderType.Archive)
		});

		self.quotaPercentage = koComputable(() => {
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
						timeouts.push([folder.expires, folder.fullName]);
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
			Sent: FolderUserStore.sentFolder(),
			Drafts: FolderUserStore.draftsFolder(),
			Spam: FolderUserStore.spamFolder(),
			Trash: FolderUserStore.trashFolder(),
			Archive: FolderUserStore.archiveFolder()
		};
		forEachObjectEntry(folders, (k,v)=>Settings.set(k+'Folder',v));
		rl.app.Remote.request('SystemFoldersUpdate', null, folders);
	}
};
