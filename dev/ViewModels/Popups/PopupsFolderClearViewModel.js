
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Data = require('Storage:RainLoop:Data'),
		Cache = require('Storage:RainLoop:Cache'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

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
				Data.message(null);
				Data.messageList([]);

				this.clearingProcess(true);

				oFolderToClear.messageCountAll(0);
				oFolderToClear.messageCountUnread(0);

				Cache.setFolderHash(oFolderToClear.fullNameRaw, '');

				Remote.folderClear(function (sResult, oData) {

					self.clearingProcess(false);
					if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
					{
						require('App:RainLoop').reloadMessageList(true);
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

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:FolderClear', 'PopupsFolderClearViewModel'], PopupsFolderClearViewModel);
	_.extend(PopupsFolderClearViewModel.prototype, KnoinAbstractViewModel.prototype);

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

	module.exports = PopupsFolderClearViewModel;

}());
