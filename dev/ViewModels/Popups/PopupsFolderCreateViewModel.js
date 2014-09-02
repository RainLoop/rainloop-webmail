
(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFolderCreateViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderCreate');

		Utils.initOnStartOrLangChange(function () {
			this.sNoParentText = Utils.i18n('POPUPS_CREATE_FOLDER/SELECT_NO_PARENT');
		}, this);

		this.folderName = ko.observable('');
		this.folderName.focused = ko.observable(false);

		this.selectedParentValue = ko.observable(Consts.Values.UnuseOptionValue);

		this.parentFolderSelectList = ko.computed(function () {

			var
				aTop = [],
				fDisableCallback = null,
				fVisibleCallback = null,
				aList = Data.folderList(),
				fRenameCallback = function (oItem) {
					return oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';
				}
			;

			aTop.push(['', this.sNoParentText]);

			if ('' !== Data.namespace)
			{
				fDisableCallback = function (oItem)
				{
					return Data.namespace !== oItem.fullNameRaw.substr(0, Data.namespace.length);
				};
			}

			return Utils.folderListOptionsBuilder([], aList, [], aTop, null, fDisableCallback, fVisibleCallback, fRenameCallback);

		}, this);

		// commands
		this.createFolder = Utils.createCommand(this, function () {

			var
				sParentFolderName = this.selectedParentValue()
			;

			if ('' === sParentFolderName && 1 < Data.namespace.length)
			{
				sParentFolderName = Data.namespace.substr(0, Data.namespace.length - 1);
			}

			Data.foldersCreating(true);
			Remote.folderCreate(function (sResult, oData) {

				Data.foldersCreating(false);
				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					require('App:RainLoop').folders();
				}
				else
				{
					Data.foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER'));
				}

			},	this.folderName(), sParentFolderName);

			this.cancelCommand();

		}, function () {
			return this.simpleFolderNameValidation(this.folderName());
		});

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:FolderCreate', 'PopupsFolderCreateViewModel'], PopupsFolderCreateViewModel);
	_.extend(PopupsFolderCreateViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsFolderCreateViewModel.prototype.sNoParentText = '';

	PopupsFolderCreateViewModel.prototype.simpleFolderNameValidation = function (sName)
	{
		return (/^[^\\\/]+$/g).test(Utils.trim(sName));
	};

	PopupsFolderCreateViewModel.prototype.clearPopup = function ()
	{
		this.folderName('');
		this.selectedParentValue('');
		this.folderName.focused(false);
	};

	PopupsFolderCreateViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsFolderCreateViewModel.prototype.onFocus = function ()
	{
		this.folderName.focused(true);
	};

	module.exports = PopupsFolderCreateViewModel;

}(module, require));