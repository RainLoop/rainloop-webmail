import ko from 'ko';

import { FolderType } from 'Common/Enums';
import { isPosNumeric } from 'Common/UtilsUser';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';
import { FolderCollectionModel } from 'Model/FolderCollection';

class FolderModel extends AbstractModel {
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
		this.existen = true;

		this.addObservables({
			name: '',
			type: FolderType.User,

			focused: false,
			selected: false,
			edited: false,
			subScribed: true,
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
			folder.selectable = !!json.IsSelectable;
			folder.existen = !!json.IsExists;

			folder.subScribed(!!json.IsSubscribed);

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

				hasSubScribedSubfolders:
					() =>
						!!folder.subFolders().find(
							oFolder => (oFolder.subScribed() || oFolder.hasSubScribedSubfolders()) && !oFolder.isSystemFolder()
						),

				canBeEdited: () => FolderType.User === folder.type() && folder.existen && folder.selectable,

				visible: () => {
					const isSubScribed = folder.subScribed(),
						isSubFolders = folder.hasSubScribedSubfolders();

					return isSubScribed || (isSubFolders && (!folder.existen || !folder.selectable));
				},

				isSystemFolder: () => FolderType.User !== folder.type(),

				hidden: () => {
					const isSystem = folder.isSystemFolder(),
						isSubFolders = folder.hasSubScribedSubfolders();

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

				canBeDeleted: () => !folder.isSystemFolder() && !folder.subFolders().length,

				selectableForFolderList: () => !folder.isSystemFolder() && folder.selectable,

				canBeSubScribed: () => !folder.isSystemFolder() && folder.selectable,

				canBeChecked: () => !folder.isSystemFolder() && folder.selectable,

				localName: () => {
					translatorTrigger();

					let name = folder.name();
					const type = folder.type();

					if (folder.isSystemFolder()) {
						switch (type) {
							case FolderType.Inbox:
								name = i18n('FOLDER_LIST/INBOX_NAME');
								break;
							case FolderType.SentItems:
								name = i18n('FOLDER_LIST/SENT_NAME');
								break;
							case FolderType.Draft:
								name = i18n('FOLDER_LIST/DRAFTS_NAME');
								break;
							case FolderType.Spam:
								name = i18n('FOLDER_LIST/SPAM_NAME');
								break;
							case FolderType.Trash:
								name = i18n('FOLDER_LIST/TRASH_NAME');
								break;
							case FolderType.Archive:
								name = i18n('FOLDER_LIST/ARCHIVE_NAME');
								break;
							// no default
						}
					}

					return name;
				},

				manageFolderSystemName: () => {
					translatorTrigger();

					let suffix = '';
					const type = folder.type(),
						name = folder.name();

					if (folder.isSystemFolder()) {
						switch (type) {
							case FolderType.Inbox:
								suffix = '(' + i18n('FOLDER_LIST/INBOX_NAME') + ')';
								break;
							case FolderType.SentItems:
								suffix = '(' + i18n('FOLDER_LIST/SENT_NAME') + ')';
								break;
							case FolderType.Draft:
								suffix = '(' + i18n('FOLDER_LIST/DRAFTS_NAME') + ')';
								break;
							case FolderType.Spam:
								suffix = '(' + i18n('FOLDER_LIST/SPAM_NAME') + ')';
								break;
							case FolderType.Trash:
								suffix = '(' + i18n('FOLDER_LIST/TRASH_NAME') + ')';
								break;
							case FolderType.Archive:
								suffix = '(' + i18n('FOLDER_LIST/ARCHIVE_NAME') + ')';
								break;
							// no default
						}
					}

					if ((suffix && '(' + name + ')' === suffix) || '(inbox)' === suffix.toLowerCase()) {
						suffix = '';
					}

					return suffix;
				},

				collapsed: {
					read: () => !folder.hidden() && folder.collapsedPrivate(),
					write: (value) => {
						folder.collapsedPrivate(value);
					}
				},

				hasUnreadMessages: () => 0 < folder.messageCountUnread() && folder.printableUnreadCount(),

				hasSubScribedUnreadMessagesSubfolders: () =>
						!!folder.subFolders().find(
							folder => folder.hasUnreadMessages() || folder.hasSubScribedUnreadMessagesSubfolders()
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
		return 'e-collapsed-sign ' + (this.hasSubScribedSubfolders()
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

export { FolderModel, FolderModel as default };
