import _ from '_';
import ko from 'ko';

import { FolderType } from 'Common/Enums';
import { isPosNumeric } from 'Common/Utils';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';
import { getFolderInboxName } from 'Common/Cache';
import * as Events from 'Common/Events';

import { AbstractModel } from 'Knoin/AbstractModel';

class FolderModel extends AbstractModel {
	constructor() {
		super('FolderModel');

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
	 * @param {AjaxJsonFolder} json
	 * @returns {?FolderModel}
	 */
	static newInstanceFromJson(json) {
		const folder = new FolderModel();
		return folder.initByJson(json) ? folder.initComputed() : null;
	}

	/**
	 * @returns {FolderModel}
	 */
	initComputed() {
		const inboxFolderName = getFolderInboxName();

		this.isInbox = ko.computed(() => FolderType.Inbox === this.type());

		this.hasSubScribedSubfolders = ko.computed(
			() =>
				!!_.find(
					this.subFolders(),
					(oFolder) => (oFolder.subScribed() || oFolder.hasSubScribedSubfolders()) && !oFolder.isSystemFolder()
				)
		);

		this.canBeEdited = ko.computed(() => FolderType.User === this.type() && this.existen && this.selectable);

		this.visible = ko.computed(() => {
			const isSubScribed = this.subScribed(),
				isSubFolders = this.hasSubScribedSubfolders();

			return isSubScribed || (isSubFolders && (!this.existen || !this.selectable));
		});

		this.isSystemFolder = ko.computed(() => FolderType.User !== this.type());

		this.hidden = ko.computed(() => {
			const isSystem = this.isSystemFolder(),
				isSubFolders = this.hasSubScribedSubfolders();

			return (isSystem && !isSubFolders) || (!this.selectable && !isSubFolders);
		});

		this.selectableForFolderList = ko.computed(() => !this.isSystemFolder() && this.selectable);

		this.messageCountAll = ko
			.computed({
				read: this.privateMessageCountAll,
				write: (iValue) => {
					if (isPosNumeric(iValue, true)) {
						this.privateMessageCountAll(iValue);
					} else {
						this.privateMessageCountAll.valueHasMutated();
					}
				}
			})
			.extend({ notify: 'always' });

		this.messageCountUnread = ko
			.computed({
				read: this.privateMessageCountUnread,
				write: (value) => {
					if (isPosNumeric(value, true)) {
						this.privateMessageCountUnread(value);
					} else {
						this.privateMessageCountUnread.valueHasMutated();
					}
				}
			})
			.extend({ notify: 'always' });

		this.printableUnreadCount = ko.computed(() => {
			const count = this.messageCountAll(),
				unread = this.messageCountUnread(),
				type = this.type();

			if (0 < count) {
				if (FolderType.Draft === type) {
					return '' + count;
				} else if (
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

		this.canBeDeleted = ko.computed(() => {
			const bSystem = this.isSystemFolder();
			return !bSystem && 0 === this.subFolders().length && inboxFolderName !== this.fullNameRaw;
		});

		this.canBeSubScribed = ko.computed(
			() => !this.isSystemFolder() && this.selectable && inboxFolderName !== this.fullNameRaw
		);

		this.canBeChecked = this.canBeSubScribed;

		this.localName = ko.computed(() => {
			translatorTrigger();

			let name = this.name();
			const type = this.type();

			if (this.isSystemFolder()) {
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

		this.manageFolderSystemName = ko.computed(() => {
			translatorTrigger();

			let suffix = '';
			const type = this.type(),
				name = this.name();

			if (this.isSystemFolder()) {
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

			if (('' !== suffix && '(' + name + ')' === suffix) || '(inbox)' === suffix.toLowerCase()) {
				suffix = '';
			}

			return suffix;
		});

		this.collapsed = ko.computed({
			read: () => !this.hidden() && this.collapsedPrivate(),
			write: (value) => {
				this.collapsedPrivate(value);
			}
		});

		this.hasUnreadMessages = ko.computed(() => 0 < this.messageCountUnread() && '' !== this.printableUnreadCount());

		this.hasSubScribedUnreadMessagesSubfolders = ko.computed(
			() =>
				!!_.find(
					this.subFolders(),
					(folder) => folder.hasUnreadMessages() || folder.hasSubScribedUnreadMessagesSubfolders()
				)
		);

		// subscribe
		this.name.subscribe((value) => {
			this.nameForEdit(value);
		});

		this.edited.subscribe((value) => {
			if (value) {
				this.nameForEdit(this.name());
			}
		});

		this.messageCountUnread.subscribe((unread) => {
			if (FolderType.Inbox === this.type()) {
				Events.pub('mailbox.inbox-unread-count', [unread]);
			}
		});

		return this;
	}

	/**
	 * @returns {string}
	 */
	collapsedCss() {
		return this.hasSubScribedSubfolders()
			? this.collapsed()
				? 'icon-right-mini e-collapsed-sign'
				: 'icon-down-mini e-collapsed-sign'
			: 'icon-none e-collapsed-sign';
	}

	/**
	 * @param {AjaxJsonFolder} json
	 * @returns {boolean}
	 */
	initByJson(json) {
		let bResult = false;
		const sInboxFolderName = getFolderInboxName();

		if (json && 'Object/Folder' === json['@Object']) {
			this.name(json.Name);
			this.delimiter = json.Delimiter;
			this.fullName = json.FullName;
			this.fullNameRaw = json.FullNameRaw;
			this.fullNameHash = json.FullNameHash;
			this.deep = json.FullNameRaw.split(this.delimiter).length - 1;
			this.selectable = !!json.IsSelectable;
			this.existen = !!json.IsExists;

			this.subScribed(!!json.IsSubscribed);
			this.checkable(!!json.Checkable);

			this.type(sInboxFolderName === this.fullNameRaw ? FolderType.Inbox : FolderType.User);

			bResult = true;
		}

		return bResult;
	}

	/**
	 * @returns {string}
	 */
	printableFullName() {
		return this.fullName.split(this.delimiter).join(' / ');
	}
}

export { FolderModel, FolderModel as default };
