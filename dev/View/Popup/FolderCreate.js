
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Data = require('Storage/User/Data'),
		Remote = require('Storage/User/Remote'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function FolderCreateView()
	{
		AbstractView.call(this, 'Popups', 'PopupsFolderCreate');

		Translator.initOnStartOrLangChange(function () {
			this.sNoParentText = Translator.i18n('POPUPS_CREATE_FOLDER/SELECT_NO_PARENT');
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
					require('App/User').folders();
				}
				else
				{
					Data.folderList.error(
						oData && oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) : Translator.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER'));
				}

			},	this.folderName(), sParentFolderName);

			this.cancelCommand();

		}, function () {
			return this.simpleFolderNameValidation(this.folderName());
		});

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/FolderCreate', 'PopupsFolderCreateViewModel'], FolderCreateView);
	_.extend(FolderCreateView.prototype, AbstractView.prototype);

	FolderCreateView.prototype.sNoParentText = '';

	FolderCreateView.prototype.simpleFolderNameValidation = function (sName)
	{
		return (/^[^\\\/]+$/g).test(Utils.trim(sName));
	};

	FolderCreateView.prototype.clearPopup = function ()
	{
		this.folderName('');
		this.selectedParentValue('');
		this.folderName.focused(false);
	};

	FolderCreateView.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	FolderCreateView.prototype.onShowWithDelay = function ()
	{
		this.folderName.focused(true);
	};

	module.exports = FolderCreateView;

}());