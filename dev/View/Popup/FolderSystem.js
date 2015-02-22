
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		FolderStore = require('Stores/User/Folder'),

		Settings = require('Storage/Settings'),
		Remote = require('Remote/User/Ajax'),

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

		Translator.initOnStartOrLangChange(function () {
			this.sChooseOnText = Translator.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
			this.sUnuseText = Translator.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
		}, this);

		this.notification = ko.observable('');

		this.folderSelectList = ko.computed(function () {
			return Utils.folderListOptionsBuilder([], FolderStore.folderList(), FolderStore.folderListSystemNames(), [
				['', this.sChooseOnText],
				[Consts.Values.UnuseOptionValue, this.sUnuseText]
			], null, null, null, null, null, true);
		}, this);

		var
			fSaveSystemFolders = null,
			fCallback = null
		;

		this.sentFolder = FolderStore.sentFolder;
		this.draftFolder = FolderStore.draftFolder;
		this.spamFolder = FolderStore.spamFolder;
		this.trashFolder = FolderStore.trashFolder;
		this.archiveFolder = FolderStore.archiveFolder;

		fSaveSystemFolders = _.debounce(function () {

			Settings.settingsSet('SentFolder', FolderStore.sentFolder());
			Settings.settingsSet('DraftFolder', FolderStore.draftFolder());
			Settings.settingsSet('SpamFolder', FolderStore.spamFolder());
			Settings.settingsSet('TrashFolder', FolderStore.trashFolder());
			Settings.settingsSet('ArchiveFolder', FolderStore.archiveFolder());

			Remote.saveSystemFolders(Utils.emptyFunction, {
				'SentFolder': FolderStore.sentFolder(),
				'DraftFolder': FolderStore.draftFolder(),
				'SpamFolder': FolderStore.spamFolder(),
				'TrashFolder': FolderStore.trashFolder(),
				'ArchiveFolder': FolderStore.archiveFolder(),
				'NullFolder': 'NullFolder'
			});

		}, 1000);

		fCallback = function () {

			Settings.settingsSet('SentFolder', FolderStore.sentFolder());
			Settings.settingsSet('DraftFolder', FolderStore.draftFolder());
			Settings.settingsSet('SpamFolder', FolderStore.spamFolder());
			Settings.settingsSet('TrashFolder', FolderStore.trashFolder());
			Settings.settingsSet('ArchiveFolder', FolderStore.archiveFolder());

			fSaveSystemFolders();
		};

		FolderStore.sentFolder.subscribe(fCallback);
		FolderStore.draftFolder.subscribe(fCallback);
		FolderStore.spamFolder.subscribe(fCallback);
		FolderStore.trashFolder.subscribe(fCallback);
		FolderStore.archiveFolder.subscribe(fCallback);

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
				sNotification = Translator.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
				break;
			case Enums.SetSystemFoldersNotification.Draft:
				sNotification = Translator.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
				break;
			case Enums.SetSystemFoldersNotification.Spam:
				sNotification = Translator.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
				break;
			case Enums.SetSystemFoldersNotification.Trash:
				sNotification = Translator.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
				break;
			case Enums.SetSystemFoldersNotification.Archive:
				sNotification = Translator.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
				break;
		}

		this.notification(sNotification);
	};

	module.exports = FolderSystemPopupView;

}());