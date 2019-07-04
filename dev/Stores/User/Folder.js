import ko from 'ko';
import _ from '_';

import { settingsGet } from 'Storage/Settings';

import { FolderType } from 'Common/Enums';
import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { isArray, folderListOptionsBuilder } from 'Common/Utils';
import { getFolderInboxName, getFolderFromCacheList } from 'Common/Cache';

import { momentNowUnix } from 'Common/Momentor';

class FolderUserStore {
	constructor() {
		this.displaySpecSetting = ko.observable(true);

		this.sentFolder = ko.observable('');
		this.draftFolder = ko.observable('');
		this.spamFolder = ko.observable('');
		this.trashFolder = ko.observable('');
		this.archiveFolder = ko.observable('');

		this.namespace = '';

		this.folderList = ko.observableArray([]);
		this.folderList.optimized = ko.observable(false);
		this.folderList.error = ko.observable('');

		this.foldersLoading = ko.observable(false);
		this.foldersCreating = ko.observable(false);
		this.foldersDeleting = ko.observable(false);
		this.foldersRenaming = ko.observable(false);

		this.foldersInboxUnreadCount = ko.observable(0);

		this.currentFolder = ko.observable(null).extend({ toggleSubscribeProperty: [this, 'selected'] });

		this.sieveAllowFileintoInbox = !!settingsGet('SieveAllowFileintoInbox');

		this.computers();
		this.subscribers();
	}

	computers() {
		this.draftFolderNotEnabled = ko.computed(
			() => '' === this.draftFolder() || UNUSED_OPTION_VALUE === this.draftFolder()
		);

		this.foldersListWithSingleInboxRootFolder = ko.computed(
			() => !_.find(this.folderList(), (folder) => folder && !folder.isSystemFolder() && folder.visible())
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

			if (isArray(folders) && 0 < folders.length) {
				if ('' !== sentFolder && UNUSED_OPTION_VALUE !== sentFolder) {
					list.push(sentFolder);
				}
				if ('' !== draftFolder && UNUSED_OPTION_VALUE !== draftFolder) {
					list.push(draftFolder);
				}
				if ('' !== spamFolder && UNUSED_OPTION_VALUE !== spamFolder) {
					list.push(spamFolder);
				}
				if ('' !== trashFolder && UNUSED_OPTION_VALUE !== trashFolder) {
					list.push(trashFolder);
				}
				if ('' !== archiveFolder && UNUSED_OPTION_VALUE !== archiveFolder) {
					list.push(archiveFolder);
				}
			}

			return list;
		});

		this.folderListSystem = ko.computed(() =>
			_.compact(_.map(this.folderListSystemNames(), (name) => getFolderFromCacheList(name)))
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
			limit = 5,
			utc = momentNowUnix(),
			timeout = utc - 60 * 5,
			timeouts = [],
			inboxFolderName = getFolderInboxName(),
			fSearchFunction = (list) => {
				_.each(list, (folder) => {
					if (
						folder &&
						inboxFolderName !== folder.fullNameRaw &&
						folder.selectable &&
						folder.existen &&
						timeout > folder.interval &&
						(folder.isSystemFolder() || (folder.subScribed() && folder.checkable()))
					) {
						timeouts.push([folder.interval, folder.fullNameRaw]);
					}

					if (folder && 0 < folder.subFolders().length) {
						fSearchFunction(folder.subFolders());
					}
				});
			};

		fSearchFunction(this.folderList());

		timeouts.sort((a, b) => {
			if (a[0] < b[0]) {
				return -1;
			} else if (a[0] > b[0]) {
				return 1;
			}

			return 0;
		});

		_.find(timeouts, (aItem) => {
			const folder = getFolderFromCacheList(aItem[1]);
			if (folder) {
				folder.interval = utc;
				result.push(aItem[1]);
			}

			return limit <= result.length;
		});

		return _.uniq(result);
	}
}

export default new FolderUserStore();
