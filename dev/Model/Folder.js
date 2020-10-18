import ko from 'ko';

import { FolderType } from 'Common/Enums';
import { isPosNumeric } from 'Common/UtilsUser';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

class FolderModel extends AbstractModel {
	constructor() {
		super();

		this.name = ko.observable('');
		this.fullName = '';
		this.fullNameRaw = '';
		this.fullNameHash = '';
		this.delimiter = '';
		this.namespace = '';
		this.deep = 0;
		this.interval = 0;

		this.selectable = false;
		this.existen = true;

		this.type = ko.observable(FolderType.User);

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.edited = ko.observable(false);
		this.subScribed = ko.observable(true);
		this.checkable = ko.observable(false);
		this.subFolders = ko.observableArray([]);
		this.deleteAccess = ko.observable(false);
		this.actionBlink = ko.observable(false).extend({ falseTimeout: 1000 });

		this.nameForEdit = ko.observable('');

		this.privateMessageCountAll = ko.observable(0);
		this.privateMessageCountUnread = ko.observable(0);

		this.collapsedPrivate = ko.observable(true);
	}

	/**
	 * @static
	 * @param {FetchJsonFolder} json
	 * @returns {?FolderModel}
	 */
	static reviveFromJson(json) {
		const folder = super.reviveFromJson(json);
		if (folder) {
			folder.name(json.Name);
			folder.delimiter = json.Delimiter;
			folder.fullName = json.FullName;
			folder.fullNameRaw = json.FullNameRaw;
			folder.fullNameHash = json.FullNameHash;
			folder.deep = json.FullNameRaw.split(folder.delimiter).length - 1;
			folder.selectable = !!json.IsSelectable;
			folder.existen = !!json.IsExists;

			folder.subScribed(!!json.IsSubscribed);
			folder.checkable(!!json.Checkable);

			folder.isInbox = ko.computed(() => FolderType.Inbox === folder.type());

			folder.hasSubScribedSubfolders = ko.computed(
				() =>
					!!folder.subFolders().find(
						oFolder => (oFolder.subScribed() || oFolder.hasSubScribedSubfolders()) && !oFolder.isSystemFolder()
					)
			);

			folder.canBeEdited = ko.computed(() => FolderType.User === folder.type() && folder.existen && folder.selectable);

			folder.visible = ko.computed(() => {
				const isSubScribed = folder.subScribed(),
					isSubFolders = folder.hasSubScribedSubfolders();

				return isSubScribed || (isSubFolders && (!folder.existen || !folder.selectable));
			});

			folder.isSystemFolder = ko.computed(() => FolderType.User !== folder.type());

			folder.hidden = ko.computed(() => {
				const isSystem = folder.isSystemFolder(),
					isSubFolders = folder.hasSubScribedSubfolders();

				return (isSystem && !isSubFolders) || (!folder.selectable && !isSubFolders);
			});

			folder.selectableForFolderList = ko.computed(() => !folder.isSystemFolder() && folder.selectable);

			folder.messageCountAll = ko
				.computed({
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

			folder.messageCountUnread = ko
				.computed({
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

			folder.printableUnreadCount = ko.computed(() => {
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
			});

			folder.canBeDeleted = ko.computed(
				() => !folder.isSystemFolder() && !folder.subFolders().length
			);

			folder.canBeSubScribed = ko.computed(
				() => !folder.isSystemFolder() && folder.selectable
			);

			folder.canBeChecked = folder.canBeSubScribed;

			folder.localName = ko.computed(() => {
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
			});

			folder.manageFolderSystemName = ko.computed(() => {
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
			});

			folder.collapsed = ko.computed({
				read: () => !folder.hidden() && folder.collapsedPrivate(),
				write: (value) => {
					folder.collapsedPrivate(value);
				}
			});

			folder.hasUnreadMessages = ko.computed(() => 0 < folder.messageCountUnread() && folder.printableUnreadCount());

			folder.hasSubScribedUnreadMessagesSubfolders = ko.computed(
				() =>
					!!folder.subFolders().find(
						folder => folder.hasUnreadMessages() || folder.hasSubScribedUnreadMessagesSubfolders()
					)
			);

			// subscribe
			folder.name.subscribe(value => folder.nameForEdit(value));

			folder.edited.subscribe(value => value && folder.nameForEdit(folder.name()));

			folder.messageCountUnread.subscribe((unread) => {
				if (FolderType.Inbox === folder.type()) {
					dispatchEvent(new CustomEvent('mailbox.inbox-unread-count', {detail:unread}));
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
