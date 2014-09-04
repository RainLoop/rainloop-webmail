
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Events = require('Common/Events')
	;

	/**
	 * @constructor
	 */
	function FolderModel()
	{
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

		this.type = ko.observable(Enums.FolderType.User);

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.edited = ko.observable(false);
		this.collapsed = ko.observable(true);
		this.subScribed = ko.observable(true);
		this.subFolders = ko.observableArray([]);
		this.deleteAccess = ko.observable(false);
		this.actionBlink = ko.observable(false).extend({'falseTimeout': 1000});

		this.nameForEdit = ko.observable('');

		this.privateMessageCountAll = ko.observable(0);
		this.privateMessageCountUnread = ko.observable(0);

		this.collapsedPrivate = ko.observable(true);
	}

	/**
	 * @static
	 * @param {AjaxJsonFolder} oJsonFolder
	 * @return {?FolderModel}
	 */
	FolderModel.newInstanceFromJson = function (oJsonFolder)
	{
		var oFolderModel = new FolderModel();
		return oFolderModel.initByJson(oJsonFolder) ? oFolderModel.initComputed() : null;
	};

	/**
	 * @return {FolderModel}
	 */
	FolderModel.prototype.initComputed = function ()
	{
		this.hasSubScribedSubfolders = ko.computed(function () {
			return !!_.find(this.subFolders(), function (oFolder) {
				return oFolder.subScribed() && !oFolder.isSystemFolder();
			});
		}, this);

		this.canBeEdited = ko.computed(function () {
			return Enums.FolderType.User === this.type() && this.existen && this.selectable;
		}, this);

		this.visible = ko.computed(function () {
			var
				bSubScribed = this.subScribed(),
				bSubFolders = this.hasSubScribedSubfolders()
			;

			return (bSubScribed || (bSubFolders && (!this.existen || !this.selectable)));
		}, this);

		this.isSystemFolder = ko.computed(function () {
			return Enums.FolderType.User !== this.type();
		}, this);

		this.hidden = ko.computed(function () {
			var
				bSystem = this.isSystemFolder(),
				bSubFolders = this.hasSubScribedSubfolders()
			;

			return (bSystem && !bSubFolders) || (!this.selectable && !bSubFolders);

		}, this);

		this.selectableForFolderList = ko.computed(function () {
			return !this.isSystemFolder() && this.selectable;
		}, this);

		this.messageCountAll = ko.computed({
			'read': this.privateMessageCountAll,
			'write': function (iValue) {
				if (Utils.isPosNumeric(iValue, true))
				{
					this.privateMessageCountAll(iValue);
				}
				else
				{
					this.privateMessageCountAll.valueHasMutated();
				}
			},
			'owner': this
		});

		this.messageCountUnread = ko.computed({
			'read': this.privateMessageCountUnread,
			'write': function (iValue) {
				if (Utils.isPosNumeric(iValue, true))
				{
					this.privateMessageCountUnread(iValue);
				}
				else
				{
					this.privateMessageCountUnread.valueHasMutated();
				}
			},
			'owner': this
		});

		this.printableUnreadCount = ko.computed(function () {
			var
				iCount = this.messageCountAll(),
				iUnread = this.messageCountUnread(),
				iType = this.type()
			;

			if (0 < iCount)
			{
				if (Enums.FolderType.Draft === iType)
				{
					return '' + iCount;
				}
				else if (0 < iUnread && Enums.FolderType.Trash !== iType && Enums.FolderType.Archive !== iType && Enums.FolderType.SentItems !== iType)
				{
					return '' + iUnread;
				}
			}

			return '';

		}, this);

		this.canBeDeleted = ko.computed(function () {
			var
				bSystem = this.isSystemFolder()
			;
			return !bSystem && 0 === this.subFolders().length && 'INBOX' !== this.fullNameRaw;
		}, this);

		this.canBeSubScribed = ko.computed(function () {
			return !this.isSystemFolder() && this.selectable && 'INBOX' !== this.fullNameRaw;
		}, this);

//		this.visible.subscribe(function () {
//			Utils.timeOutAction('folder-list-folder-visibility-change', function () {
//				Globals.$win.trigger('folder-list-folder-visibility-change');
//			}, 100);
//		});

		this.localName = ko.computed(function () {

			Globals.langChangeTrigger();

			var
				iType = this.type(),
				sName = this.name()
			;

			if (this.isSystemFolder())
			{
				switch (iType)
				{
					case Enums.FolderType.Inbox:
						sName = Utils.i18n('FOLDER_LIST/INBOX_NAME');
						break;
					case Enums.FolderType.SentItems:
						sName = Utils.i18n('FOLDER_LIST/SENT_NAME');
						break;
					case Enums.FolderType.Draft:
						sName = Utils.i18n('FOLDER_LIST/DRAFTS_NAME');
						break;
					case Enums.FolderType.Spam:
						sName = Utils.i18n('FOLDER_LIST/SPAM_NAME');
						break;
					case Enums.FolderType.Trash:
						sName = Utils.i18n('FOLDER_LIST/TRASH_NAME');
						break;
					case Enums.FolderType.Archive:
						sName = Utils.i18n('FOLDER_LIST/ARCHIVE_NAME');
						break;
				}
			}

			return sName;

		}, this);

		this.manageFolderSystemName = ko.computed(function () {

			Globals.langChangeTrigger();

			var
				sSuffix = '',
				iType = this.type(),
				sName = this.name()
			;

			if (this.isSystemFolder())
			{
				switch (iType)
				{
					case Enums.FolderType.Inbox:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/INBOX_NAME') + ')';
						break;
					case Enums.FolderType.SentItems:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/SENT_NAME') + ')';
						break;
					case Enums.FolderType.Draft:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/DRAFTS_NAME') + ')';
						break;
					case Enums.FolderType.Spam:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/SPAM_NAME') + ')';
						break;
					case Enums.FolderType.Trash:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/TRASH_NAME') + ')';
						break;
					case Enums.FolderType.Archive:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/ARCHIVE_NAME') + ')';
						break;
				}
			}

			if ('' !== sSuffix && '(' + sName + ')' === sSuffix || '(inbox)' === sSuffix.toLowerCase())
			{
				sSuffix = '';
			}

			return sSuffix;

		}, this);

		this.collapsed = ko.computed({
			'read': function () {
				return !this.hidden() && this.collapsedPrivate();
			},
			'write': function (mValue) {
				this.collapsedPrivate(mValue);
			},
			'owner': this
		});

		this.hasUnreadMessages = ko.computed(function () {
			return 0 < this.messageCountUnread();
		}, this);

		this.hasSubScribedUnreadMessagesSubfolders = ko.computed(function () {
			return !!_.find(this.subFolders(), function (oFolder) {
				return oFolder.hasUnreadMessages() || oFolder.hasSubScribedUnreadMessagesSubfolders();
			});
		}, this);

		// subscribe
		this.name.subscribe(function (sValue) {
			this.nameForEdit(sValue);
		}, this);

		this.edited.subscribe(function (bValue) {
			if (bValue)
			{
				this.nameForEdit(this.name());
			}
		}, this);

		this.messageCountUnread.subscribe(function (iUnread) {
			if (Enums.FolderType.Inbox === this.type())
			{
				Events.pub('mailbox.inbox-unread-count', [iUnread]);
			}
		}, this);

		return this;
	};

	FolderModel.prototype.fullName = '';
	FolderModel.prototype.fullNameRaw = '';
	FolderModel.prototype.fullNameHash = '';
	FolderModel.prototype.delimiter = '';
	FolderModel.prototype.namespace = '';
	FolderModel.prototype.deep = 0;
	FolderModel.prototype.interval = 0;

	/**
	 * @return {string}
	 */
	FolderModel.prototype.collapsedCss = function ()
	{
		return this.hasSubScribedSubfolders() ?
			(this.collapsed() ? 'icon-right-mini e-collapsed-sign' : 'icon-down-mini e-collapsed-sign') : 'icon-none e-collapsed-sign';
	};

	/**
	 * @param {AjaxJsonFolder} oJsonFolder
	 * @return {boolean}
	 */
	FolderModel.prototype.initByJson = function (oJsonFolder)
	{
		var bResult = false;
		if (oJsonFolder && 'Object/Folder' === oJsonFolder['@Object'])
		{
			this.name(oJsonFolder.Name);
			this.delimiter = oJsonFolder.Delimiter;
			this.fullName = oJsonFolder.FullName;
			this.fullNameRaw = oJsonFolder.FullNameRaw;
			this.fullNameHash = oJsonFolder.FullNameHash;
			this.deep = oJsonFolder.FullNameRaw.split(this.delimiter).length - 1;
			this.selectable = !!oJsonFolder.IsSelectable;
			this.existen = !!oJsonFolder.IsExists;

			this.subScribed(!!oJsonFolder.IsSubscribed);
			this.type('INBOX' === this.fullNameRaw ? Enums.FolderType.Inbox : Enums.FolderType.User);

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {string}
	 */
	FolderModel.prototype.printableFullName = function ()
	{
		return this.fullName.split(this.delimiter).join(' / ');
	};

	module.exports = FolderModel;

}());