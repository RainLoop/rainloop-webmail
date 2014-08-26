/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		kn = require('kn'),

		AppSettings = require('../../Storages/AppSettings.js'),
		LocalStorage = require('../../Storages/LocalStorage.js'),
		Data = require('../../Storages/WebMailDataStorage.js'),
		Cache = require('../../Storages/WebMailCacheStorage.js'),
		Remote = require('../../Storages/WebMailAjaxRemoteStorage.js'),

		PopupsFolderCreateViewModel = require('../../ViewModels/Popups/PopupsFolderCreateViewModel.js'),
		PopupsFolderSystemViewModel = require('../../ViewModels/Popups/PopupsFolderSystemViewModel.js')
	;

	/**
	 * @constructor
	 */
	function SettingsFolders()
	{
		this.foldersListError = Data.foldersListError;
		this.folderList = Data.folderList;

		this.processText = ko.computed(function () {

			var
				bLoading = Data.foldersLoading(),
				bCreating = Data.foldersCreating(),
				bDeleting = Data.foldersDeleting(),
				bRenaming = Data.foldersRenaming()
			;

			if (bCreating)
			{
				return Utils.i18n('SETTINGS_FOLDERS/CREATING_PROCESS');
			}
			else if (bDeleting)
			{
				return Utils.i18n('SETTINGS_FOLDERS/DELETING_PROCESS');
			}
			else if (bRenaming)
			{
				return Utils.i18n('SETTINGS_FOLDERS/RENAMING_PROCESS');
			}
			else if (bLoading)
			{
				return Utils.i18n('SETTINGS_FOLDERS/LOADING_PROCESS');
			}

			return '';

		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.folderForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
				}
			}
		]});

		this.folderForEdit = ko.observable(null).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.edited(false);
				}
			}, function (oNext) {
				if (oNext && oNext.canBeEdited())
				{
					oNext.edited(true);
				}
			}
		]});

		this.useImapSubscribe = !!AppSettings.settingsGet('UseImapSubscribe');
	}

	SettingsFolders.prototype.folderEditOnEnter = function (oFolder)
	{
		var
			App = require('../../Apps/RainLoopApp.js'),
			sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : ''
		;

		if ('' !== sEditName && oFolder.name() !== sEditName)
		{
			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

			Data.foldersRenaming(true);
			Remote.folderRename(function (sResult, oData) {

				Data.foldersRenaming(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					Data.foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
				}

				App.folders();

			}, oFolder.fullNameRaw, sEditName);

			Cache.removeFolderFromCacheList(oFolder.fullNameRaw);

			oFolder.name(sEditName);
		}

		oFolder.edited(false);
	};

	SettingsFolders.prototype.folderEditOnEsc = function (oFolder)
	{
		if (oFolder)
		{
			oFolder.edited(false);
		}
	};

	SettingsFolders.prototype.onShow = function ()
	{
		Data.foldersListError('');
	};

	SettingsFolders.prototype.createFolder = function ()
	{
		kn.showScreenPopup(PopupsFolderCreateViewModel);
	};

	SettingsFolders.prototype.systemFolder = function ()
	{
		kn.showScreenPopup(PopupsFolderSystemViewModel);
	};

	SettingsFolders.prototype.deleteFolder = function (oFolderToRemove)
	{
		if (oFolderToRemove && oFolderToRemove.canBeDeleted() && oFolderToRemove.deleteAccess() &&
			0 === oFolderToRemove.privateMessageCountAll())
		{
			this.folderForDeletion(null);

			var
				App = require('../../Apps/RainLoopApp.js'),
				fRemoveFolder = function (oFolder) {

					if (oFolderToRemove === oFolder)
					{
						return true;
					}

					oFolder.subFolders.remove(fRemoveFolder);
					return false;
				}
			;

			if (oFolderToRemove)
			{
				LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

				Data.folderList.remove(fRemoveFolder);

				Data.foldersDeleting(true);
				Remote.folderDelete(function (sResult, oData) {

					Data.foldersDeleting(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						Data.foldersListError(
							oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
					}

					App.folders();

				}, oFolderToRemove.fullNameRaw);

				Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
			}
		}
		else if (0 < oFolderToRemove.privateMessageCountAll())
		{
			Data.foldersListError(Utils.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
		}
	};

	SettingsFolders.prototype.subscribeFolder = function (oFolder)
	{
		LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, true);

		oFolder.subScribed(true);
	};

	SettingsFolders.prototype.unSubscribeFolder = function (oFolder)
	{
		LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, false);

		oFolder.subScribed(false);
	};

	module.exports = SettingsFolders;

}(module, require));