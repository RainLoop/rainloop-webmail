
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Data = require('Storage/App/Data'),
		Cache = require('Storage/App/Cache'),
		Remote = require('Storage/App/Remote'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function FolderClearPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsFolderClear');

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
						require('App/App').reloadMessageList(true);
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

	kn.extendAsViewModel(['View/Popup/FolderClear', 'PopupsFolderClearViewModel'], FolderClearPopupView);
	_.extend(FolderClearPopupView.prototype, AbstractView.prototype);

	FolderClearPopupView.prototype.clearPopup = function ()
	{
		this.clearingProcess(false);
		this.selectedFolder(null);
	};

	FolderClearPopupView.prototype.onShow = function (oFolder)
	{
		this.clearPopup();
		if (oFolder)
		{
			this.selectedFolder(oFolder);
		}
	};

	module.exports = FolderClearPopupView;

}());
