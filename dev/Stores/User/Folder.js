import ko from 'ko';

import { FolderType, FolderSortMode } from 'Common/EnumsUser';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { addObservablesTo, addSubscribablesTo, addComputablesTo } from 'Common/Utils';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';
import { Settings, SettingsGet } from 'Common/Globals';
//import Remote from 'Remote/User/Fetch'; Circular dependency

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
			 * If the IMAP server supports SORT, METADATA
			 */
			sortSupported: false,
			metadataSupported: false,
			listStatusSupported: false,
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

		addComputablesTo(this, {

			draftFolderNotEnabled: () => !this.draftFolder() || UNUSED_OPTION_VALUE === this.draftFolder(),

			currentFolderFullNameRaw: () => (this.currentFolder() ? this.currentFolder().fullNameRaw : ''),

			currentFolderFullName: () => (this.currentFolder() ? this.currentFolder().fullName : ''),
			currentFolderFullNameHash: () => (this.currentFolder() ? this.currentFolder().fullNameHash : ''),

			foldersChanging: () =>
				this.foldersLoading() | this.foldersCreating() | this.foldersDeleting() | this.foldersRenaming(),

			folderListSystemNames: () => {
				const list = [getFolderInboxName()],
				others = [this.sentFolder(), this.draftFolder(), this.spamFolder(), this.trashFolder(), this.archiveFolder()];

				this.folderList().length &&
					others.forEach(name => name && UNUSED_OPTION_VALUE !== name && list.push(name));

				return list;
			},

			folderListSystem: () =>
				this.folderListSystemNames().map(name => getFolderFromCacheList(name)).filter(v => v)
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

		this.sentFolder.subscribe(fRemoveSystemFolderType(this.sentFolder), this, 'beforeChange');
		this.draftFolder.subscribe(fRemoveSystemFolderType(this.draftFolder), this, 'beforeChange');
		this.spamFolder.subscribe(fRemoveSystemFolderType(this.spamFolder), this, 'beforeChange');
		this.trashFolder.subscribe(fRemoveSystemFolderType(this.trashFolder), this, 'beforeChange');
		this.archiveFolder.subscribe(fRemoveSystemFolderType(this.archiveFolder), this, 'beforeChange');

		addSubscribablesTo(this, {
			sentFolder: fSetSystemFolderType(FolderType.Sent),
			draftFolder: fSetSystemFolderType(FolderType.Drafts),
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
		rl.app.Remote.saveSystemFolders(()=>0, folders);
	}
};
