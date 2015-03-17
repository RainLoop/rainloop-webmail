
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		FolderStore = require('Stores/User/Folder'),

		Promises = require('Promises/User/Ajax'),

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
				aList = FolderStore.folderList(),
				fRenameCallback = function (oItem) {
					return oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';
				}
			;

			aTop.push(['', this.sNoParentText]);

			if ('' !== FolderStore.namespace)
			{
				fDisableCallback = function (oItem)
				{
					return FolderStore.namespace !== oItem.fullNameRaw.substr(0, FolderStore.namespace.length);
				};
			}

			return Utils.folderListOptionsBuilder([], aList, [], aTop, null, fDisableCallback, fVisibleCallback, fRenameCallback);

		}, this);

		// commands
		this.createFolder = Utils.createCommand(this, function () {

			var
				sParentFolderName = this.selectedParentValue()
			;

			if ('' === sParentFolderName && 1 < FolderStore.namespace.length)
			{
				sParentFolderName = FolderStore.namespace.substr(0, FolderStore.namespace.length - 1);
			}

			require('App/User').foldersPromisesActionHelper(
				Promises.folderCreate(this.folderName(), sParentFolderName, FolderStore.foldersCreating),
				Enums.Notification.CantCreateFolder);

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
		if (!Globals.bMobile)
		{
			this.folderName.focused(true);
		}
	};

	module.exports = FolderCreateView;

}());