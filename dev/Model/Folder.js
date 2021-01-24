import ko from 'ko';

import { FolderType } from 'Common/EnumsUser';
import { isPosNumeric } from 'Common/UtilsUser';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';
import { FolderCollectionModel } from 'Model/FolderCollection';

function getSystemFolderName(type, def)
{
	switch (type) {
		case FolderType.Inbox:
			return i18n('FOLDER_LIST/INBOX_NAME');
		case FolderType.SentItems:
			return i18n('FOLDER_LIST/SENT_NAME');
		case FolderType.Draft:
			return i18n('FOLDER_LIST/DRAFTS_NAME');
		case FolderType.Spam:
			return i18n('GLOBAL/SPAM');
		case FolderType.Trash:
			return i18n('FOLDER_LIST/TRASH_NAME');
		case FolderType.Archive:
			return i18n('FOLDER_LIST/ARCHIVE_NAME');
		// no default
	}
	return def;
}

export class FolderModel extends AbstractModel {
	constructor() {
		super();

		this.fullName = '';
		this.fullNameRaw = '';
		this.fullNameHash = '';
		this.delimiter = '';
		this.namespace = '';
		this.deep = 0;
		this.interval = 0;

		this.selectable = false;
		this.exists = true;

		this.addObservables({
			name: '',
			type: FolderType.User,

			focused: false,
			selected: false,
			edited: false,
			subscribed: true,
			checkable: false,
			deleteAccess: false,

			nameForEdit: '',

			privateMessageCountAll: 0,
			privateMessageCountUnread: 0,

			collapsedPrivate: true
		});

		this.subFolders = ko.observableArray(new FolderCollectionModel);
		this.actionBlink = ko.observable(false).extend({ falseTimeout: 1000 });
	}

	/**
	 * @static
	 * @param {FetchJsonFolder} json
	 * @returns {?FolderModel}
	 */
	static reviveFromJson(json) {
		const folder = super.reviveFromJson(json);
		if (folder) {
			folder.deep = json.FullNameRaw.split(folder.delimiter).length - 1;

			folder.messageCountAll = ko.computed({
					read: folder.privateMessageCountAll,
					write: (iValue) => {
						if (isPosNumeric(iValue, true)) {
							folder.privateMessageCountAll(iValue);
						} else {
							folder.privateMessageCountAll.valueHasMutated();
						}
					}
				})
				.extend({ notify: 'always' });

			folder.messageCountUnread = ko.computed({
					read: folder.privateMessageCountUnread,
					write: (value) => {
						if (isPosNumeric(value, true)) {
							folder.privateMessageCountUnread(value);
						} else {
							folder.privateMessageCountUnread.valueHasMutated();
						}
					}
				})
				.extend({ notify: 'always' });

			folder.addComputables({

				isInbox: () => FolderType.Inbox === folder.type(),

				hasSubscribedSubfolders:
					() =>
						!!folder.subFolders.find(
							oFolder => (oFolder.subscribed() || oFolder.hasSubscribedSubfolders()) && !oFolder.isSystemFolder()
						),

				canBeEdited: () => FolderType.User === folder.type() && folder.exists && folder.selectable,

				visible: () => {
					const isSubscribed = folder.subscribed(),
						isSubFolders = folder.hasSubscribedSubfolders();

					return isSubscribed || (isSubFolders && (!folder.exists || !folder.selectable));
				},

				isSystemFolder: () => FolderType.User !== folder.type(),

				hidden: () => {
					const isSystem = folder.isSystemFolder(),
						isSubFolders = folder.hasSubscribedSubfolders();

					return (isSystem && !isSubFolders) || (!folder.selectable && !isSubFolders);
				},

				printableUnreadCount: () => {
					const count = folder.messageCountAll(),
						unread = folder.messageCountUnread(),
						type = folder.type();

					if (0 < count) {
						if (FolderType.Draft === type) {
							return '' + count;
						}
						if (
							0 < unread &&
							FolderType.Trash !== type &&
							FolderType.Archive !== type &&
							FolderType.SentItems !== type
						) {
							return '' + unread;
						}
					}

					return '';
				},

				canBeDeleted: () => !folder.isSystemFolder() && !folder.subFolders.length,

				selectableForFolderList: () => !folder.isSystemFolder() && folder.selectable,

				canBeSubscribed: () => !folder.isSystemFolder() && folder.selectable,

				canBeChecked: () => !folder.isSystemFolder() && folder.selectable,

				localName: () => {
					let name = folder.name();
					if (folder.isSystemFolder()) {
						translatorTrigger();
						name = getSystemFolderName(folder.type(), name);
					}
					return name;
				},

				manageFolderSystemName: () => {
					if (folder.isSystemFolder()) {
						translatorTrigger();
						let suffix = getSystemFolderName(folder.type(), '');
						if (folder.name() !== suffix && 'inbox' !== suffix.toLowerCase()) {
							return '(' + suffix + ')';
						}
					}

					return '';
				},

				collapsed: {
					read: () => !folder.hidden() && folder.collapsedPrivate(),
					write: (value) => {
						folder.collapsedPrivate(value);
					}
				},

				hasUnreadMessages: () => 0 < folder.messageCountUnread() && folder.printableUnreadCount(),

				hasSubscribedUnreadMessagesSubfolders: () =>
						!!folder.subFolders.find(
							folder => folder.hasUnreadMessages() || folder.hasSubscribedUnreadMessagesSubfolders()
						)
			});

			folder.addSubscribables({
				name: value => folder.nameForEdit(value),

				edited: value => value && folder.nameForEdit(folder.name()),

				messageCountUnread: unread => {
					if (FolderType.Inbox === folder.type()) {
						dispatchEvent(new CustomEvent('mailbox.inbox-unread-count', {detail:unread}));
					}
				}
			});
		}
		return folder;
	}

	/**
	 * @returns {string}
	 */
	collapsedCss() {
		return 'e-collapsed-sign ' + (this.hasSubscribedSubfolders()
			? (this.collapsed() ? 'icon-right-mini' : 'icon-down-mini')
			: 'icon-none'
		);
	}

	/**
	 * @returns {string}
	 */
	printableFullName() {
		return this.fullName.split(this.delimiter).join(' / ');
	}
}
