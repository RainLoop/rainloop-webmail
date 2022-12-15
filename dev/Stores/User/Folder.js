import ko from 'ko';
import { koComputable, addObservablesTo, addSubscribablesTo, addComputablesTo } from 'External/ko';

import { FolderType } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { forEachObjectEntry } from 'Common/Utils';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';
import { Settings, SettingsCapa } from 'Common/Globals';
//import Remote from 'Remote/User/Fetch'; // Circular dependency

export const

ignoredKeywords = [
	// rfc5788
	'$forwarded',
	'$mdnsent',
	'$submitpending',
	'$submitted',
	// rfc9051
	'$junk',
	'$notjunk',
	'$phishing',
	// Mailo
	'sent',
	// KMail
	'$encrypted',
	'$error',
	'$ignored',
	'$invitation',
	'$queued',
	'$sent',
	'$signed',
	'$todo',
	'$watched',
	// GMail
	'$notphishing',
	'junk',
	'nonjunk',
	// KMail & GMail
	'$attachment',
	'$replied',
	// Others
	'$readreceipt',
	'$notdelivered'
],

isAllowedKeyword = value => '\\' != value[0] && !ignoredKeywords.includes(value.toLowerCase()),

FolderUserStore = new class {
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

		self.sortMode = ko.observable('');

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

			systemFoldersNames: () => {
				const list = [getFolderInboxName()],
				others = [self.sentFolder(), self.draftsFolder(), self.spamFolder(), self.trashFolder(), self.archiveFolder()];

				self.folderList().length &&
					others.forEach(name => name && UNUSED_OPTION_VALUE !== name && list.push(name));

				return list;
			},

			systemFolders: () =>
				self.systemFoldersNames().map(name => getFolderFromCacheList(name)).filter(v => v)
		});

		const
			subscribeRemoveSystemFolder = observable => {
				observable.subscribe(() => getFolderFromCacheList(observable())?.type(0), self, 'beforeChange');
			},
			fSetSystemFolderType = type => value => getFolderFromCacheList(value)?.type(type);

		subscribeRemoveSystemFolder(self.sentFolder);
		subscribeRemoveSystemFolder(self.draftsFolder);
		subscribeRemoveSystemFolder(self.spamFolder);
		subscribeRemoveSystemFolder(self.trashFolder);
		subscribeRemoveSystemFolder(self.archiveFolder);

		addSubscribablesTo(self, {
			sentFolder: fSetSystemFolderType(FolderType.Sent),
			draftsFolder: fSetSystemFolderType(FolderType.Drafts),
			spamFolder: fSetSystemFolderType(FolderType.Junk),
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

	allowKolab() {
		return FolderUserStore.hasCapability('METADATA') && SettingsCapa('Kolab');
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
						folder?.selectable() &&
						folder.exists &&
						timeout > folder.expires &&
						(folder.isSystemFolder() || (folder.isSubscribed() && (folder.checkable() || !bDisplaySpecSetting)))
					) {
						timeouts.push([folder.expires, folder.fullName]);
					}

					if (folder?.subFolders.length) {
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
//				result.indexOf(aItem[1]) ||
				result.push(aItem[1]);
			}

			return limit <= result.length;
		});

		return result;
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
