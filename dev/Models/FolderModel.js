/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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

	this.selectable = false;
	this.existen = true;

	this.isNamespaceFolder = false;
	this.isGmailFolder = false;
	this.isUnpaddigFolder = false;

	this.type = ko.observable(Enums.FolderType.User);

	this.selected = ko.observable(false);
	this.edited = ko.observable(false);
	this.collapsed = ko.observable(true);
	this.subScribed = ko.observable(true);
	this.subFolders = ko.observableArray([]);
	this.deleteAccess = ko.observable(false);
	this.actionBlink = ko.observable(false).extend({'falseTimeout': 1000});
	
	this.nameForEdit = ko.observable('');
	
	this.name.subscribe(function (sValue) {
		this.nameForEdit(sValue);
	}, this);
	
	this.edited.subscribe(function (bValue) {
		if (bValue)
		{
			this.nameForEdit(this.name());
		}
	}, this);
	
	this.canBeEdited = ko.computed(function () {
		return Enums.FolderType.User === this.type();
	}, this);

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
			return oFolder.subScribed();
		});
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

		return this.isGmailFolder || (bSystem && this.isNamespaceFolder) || (bSystem && !bSubFolders);
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
//		return 0 < iUnread ? '' + iUnread : '';
//		return 0 < iUnread && 'INBOX' === this.fullNameRaw ? '' + iUnread : '';
		return 0 < iUnread && (Enums.FolderType.Inbox === iType || Enums.FolderType.Spam === iType) ? '' + iUnread :
			(0 < iCount && Enums.FolderType.Draft === iType ? '' + iCount : '');
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

	this.visible.subscribe(function () {
		Utils.timeOutAction('folder-list-folder-visibility-change', function () {
			$window.trigger('folder-list-folder-visibility-change');
		}, 100);
	});

	this.localName = ko.computed(function () {

		Globals.langChangeTick();

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
			}
		}

		return sName;
		
	}, this);

	this.manageFolderSystemName = ko.computed(function () {

		Globals.langChangeTick();
		
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

	return this;
};

FolderModel.prototype.fullName = '';
FolderModel.prototype.fullNameRaw = '';
FolderModel.prototype.fullNameHash = '';
FolderModel.prototype.delimiter = '';
FolderModel.prototype.namespace = '';
FolderModel.prototype.deep = 0;

FolderModel.prototype.isNamespaceFolder = false;
FolderModel.prototype.isGmailFolder = false;
FolderModel.prototype.isUnpaddigFolder = false;

/**
 * @return {string}
 */
FolderModel.prototype.collapsedCss = function ()
{
	return this.hasSubScribedSubfolders() ? 
		(this.collapsed() ? 'icon-arrow-right-3 e-collapsed-sign' : 'icon-arrow-down-3 e-collapsed-sign') : 'icon-none e-collapsed-sign';
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
		this.existen = !!oJsonFolder.IsExisten;

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
