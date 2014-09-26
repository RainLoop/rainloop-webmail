
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/App/Data'),
		Remote = require('Storage/App/Remote'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function FolderSystemPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsFolderSystem');

		Utils.initOnStartOrLangChange(function () {
			this.sChooseOnText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
			this.sUnuseText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
		}, this);

		this.notification = ko.observable('');

		this.folderSelectList = ko.computed(function () {
			return Utils.folderListOptionsBuilder([], Data.folderList(), Data.folderListSystemNames(), [
				['', this.sChooseOnText],
				[Consts.Values.UnuseOptionValue, this.sUnuseText]
			], null, null, null, null, null, true);
		}, this);

		var
			self = this,
			fSaveSystemFolders = null,
			fCallback = null
		;

		this.sentFolder = Data.sentFolder;
		this.draftFolder = Data.draftFolder;
		this.spamFolder = Data.spamFolder;
		this.trashFolder = Data.trashFolder;
		this.archiveFolder = Data.archiveFolder;

		fSaveSystemFolders = _.debounce(function () {

			Settings.settingsSet('SentFolder', self.sentFolder());
			Settings.settingsSet('DraftFolder', self.draftFolder());
			Settings.settingsSet('SpamFolder', self.spamFolder());
			Settings.settingsSet('TrashFolder', self.trashFolder());
			Settings.settingsSet('ArchiveFolder', self.archiveFolder());

			Remote.saveSystemFolders(Utils.emptyFunction, {
				'SentFolder': self.sentFolder(),
				'DraftFolder': self.draftFolder(),
				'SpamFolder': self.spamFolder(),
				'TrashFolder': self.trashFolder(),
				'ArchiveFolder': self.archiveFolder(),
				'NullFolder': 'NullFolder'
			});

		}, 1000);

		fCallback = function () {

			Settings.settingsSet('SentFolder', self.sentFolder());
			Settings.settingsSet('DraftFolder', self.draftFolder());
			Settings.settingsSet('SpamFolder', self.spamFolder());
			Settings.settingsSet('TrashFolder', self.trashFolder());
			Settings.settingsSet('ArchiveFolder', self.archiveFolder());

			fSaveSystemFolders();
		};

		this.sentFolder.subscribe(fCallback);
		this.draftFolder.subscribe(fCallback);
		this.spamFolder.subscribe(fCallback);
		this.trashFolder.subscribe(fCallback);
		this.archiveFolder.subscribe(fCallback);

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/FolderSystem', 'PopupsFolderSystemViewModel'], FolderSystemPopupView);
	_.extend(FolderSystemPopupView.prototype, AbstractView.prototype);

	FolderSystemPopupView.prototype.sChooseOnText = '';
	FolderSystemPopupView.prototype.sUnuseText = '';

	/**
	 * @param {number=} iNotificationType = Enums.SetSystemFoldersNotification.None
	 */
	FolderSystemPopupView.prototype.onShow = function (iNotificationType)
	{
		var sNotification = '';

		iNotificationType = Utils.isUnd(iNotificationType) ? Enums.SetSystemFoldersNotification.None : iNotificationType;

		switch (iNotificationType)
		{
			case Enums.SetSystemFoldersNotification.Sent:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
				break;
			case Enums.SetSystemFoldersNotification.Draft:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
				break;
			case Enums.SetSystemFoldersNotification.Spam:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
				break;
			case Enums.SetSystemFoldersNotification.Trash:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
				break;
			case Enums.SetSystemFoldersNotification.Archive:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
				break;
		}

		this.notification(sNotification);
	};

	module.exports = FolderSystemPopupView;

}());