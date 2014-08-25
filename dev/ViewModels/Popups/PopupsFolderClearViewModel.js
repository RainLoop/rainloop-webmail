/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		ko = require('../../External/ko.js'),

		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),

		Data = require('../../Storages/WebMailDataStorage.js'),
		Cache = require('../../Storages/WebMailCacheStorage.js'),
		Remote = require('../../Storages/WebMailAjaxRemoteStorage.js'),

		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFolderClearViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderClear');

		var RL = require('../../Boots/RainLoopApp.js');

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

				Cache.setFolderHash(oFolderToClear.fullNameRaw, '');
				Remote.folderClear(function (sResult, oData) {

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

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsFolderClearViewModel', PopupsFolderClearViewModel);

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

}(module));
