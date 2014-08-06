/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFolderClearViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderClear');
	
	this.selectedFolder = ko.observable(null);
	this.clearingProcess = ko.observable(false);
	this.clearingError = ko.observable('');

	this.folderFullNameForClear = ko.computed(function () {
		var oFolder = this.selectedFolder();
		return oFolder ? oFolder.printableFullName() : '';
	}, this);

	this.folderNameForClear = ko.computed(function () {
		var oFolder = this.selectedFolder();
		return oFolder ? oFolder.localName() : '';
	}, this);
	
	this.dangerDescHtml = ko.computed(function () {
		return Utils.i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', {
			'FOLDER': this.folderNameForClear()
		});
	}, this);

	this.clearCommand = Utils.createCommand(this, function () {

		var
			self = this,
			oFolderToClear = this.selectedFolder()
		;

		if (oFolderToClear)
		{
			RL.data().message(null);
			RL.data().messageList([]);

			this.clearingProcess(true);

			RL.cache().setFolderHash(oFolderToClear.fullNameRaw, '');
			RL.remote().folderClear(function (sResult, oData) {
				
				self.clearingProcess(false);
				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					RL.reloadMessageList(true);
					self.cancelCommand();
				}
				else
				{
					if (oData && oData.ErrorCode)
					{
						self.clearingError(Utils.getNotification(oData.ErrorCode));
					}
					else
					{
						self.clearingError(Utils.getNotification(Enums.Notification.MailServerError));
					}
				}
			}, oFolderToClear.fullNameRaw);
		}

	}, function () {

		var
			oFolder = this.selectedFolder(),
			bIsClearing = this.clearingProcess()
		;

		return !bIsClearing && null !== oFolder;

	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFolderClearViewModel', PopupsFolderClearViewModel);

PopupsFolderClearViewModel.prototype.clearPopup = function ()
{
	this.clearingProcess(false);
	this.selectedFolder(null);
};

PopupsFolderClearViewModel.prototype.onShow = function (oFolder)
{
	this.clearPopup();
	if (oFolder)
	{
		this.selectedFolder(oFolder);
	}
};
