/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFolderSystemViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderSystem');

	Utils.initOnStartOrLangChange(function () {
		this.sChooseOnText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
		this.sUnuseText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
	}, this);

	this.notification = ko.observable('');

	this.folderSelectList = ko.computed(function () {
		return RL.folderListOptionsBuilder([], RL.data().folderList(), RL.data().folderListSystemNames(), [
			['', this.sChooseOnText],
			[Consts.Values.UnuseOptionValue, this.sUnuseText]
		]);
	}, this);
	
	var
		oData = RL.data(),
		self = this,
		fSaveSystemFolders = null,
		fCallback = null
	;
		
	this.sentFolder = oData.sentFolder;
	this.draftFolder = oData.draftFolder;
	this.spamFolder = oData.spamFolder;
	this.trashFolder = oData.trashFolder;
	
	fSaveSystemFolders = _.debounce(function () {

		RL.settingsSet('SentFolder', self.sentFolder());
		RL.settingsSet('DraftFolder', self.draftFolder());
		RL.settingsSet('SpamFolder', self.spamFolder());
		RL.settingsSet('TrashFolder', self.trashFolder());

		RL.remote().saveSystemFolders(Utils.emptyFunction, {
			'SentFolder': self.sentFolder(),
			'DraftFolder': self.draftFolder(),
			'SpamFolder': self.spamFolder(),
			'TrashFolder': self.trashFolder()
		});
		
	}, 1000);

	fCallback = function () {

		RL.settingsSet('SentFolder', self.sentFolder());
		RL.settingsSet('DraftFolder', self.draftFolder());
		RL.settingsSet('SpamFolder', self.spamFolder());
		RL.settingsSet('TrashFolder', self.trashFolder());

		fSaveSystemFolders();
	};

	this.sentFolder.subscribe(fCallback);
	this.draftFolder.subscribe(fCallback);
	this.spamFolder.subscribe(fCallback);
	this.trashFolder.subscribe(fCallback);

	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFolderSystemViewModel', PopupsFolderSystemViewModel);

PopupsFolderSystemViewModel.prototype.sChooseOnText = '';
PopupsFolderSystemViewModel.prototype.sUnuseText = '';

/**
 * @param {number=} iNotificationType = Enums.SetSystemFoldersNotification.None
 */
PopupsFolderSystemViewModel.prototype.onShow = function (iNotificationType)
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
	}

	this.notification(sNotification);
};

PopupsFolderSystemViewModel.prototype.onBuild = function ()
{
	var self = this;
	$window.on('keydown', function (oEvent) {
		var bResult = true;
		if (oEvent && Enums.EventKeyCode.Esc === oEvent.keyCode && self.modalVisibility())
		{
			kn.delegateRun(self, 'cancelCommand');
			bResult = false;
		}
		return bResult;
	});
};

