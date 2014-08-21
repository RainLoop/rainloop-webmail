/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),

		LocalStorage = require('../Storages/LocalStorage.js'),
		Cache = require('../Storages/WebMailCacheStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),
		
		PopupsFolderCreateViewModel = require('../ViewModels/Popups/PopupsFolderCreateViewModel.js'),
		PopupsFolderSystemViewModel = require('../ViewModels/Popups/PopupsFolderSystemViewModel.js')
	;

	/**
	 * @constructor
	 */
	function SettingsFolders()
	{
		var oData = RL.data();

		this.foldersListError = oData.foldersListError;
		this.folderList = oData.folderList;

		this.processText = ko.computed(function () {

			var
				oData = RL.data(),
				bLoading = oData.foldersLoading(),
				bCreating = oData.foldersCreating(),
				bDeleting = oData.foldersDeleting(),
				bRenaming = oData.foldersRenaming()
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

		this.useImapSubscribe = !!RL.settingsGet('UseImapSubscribe');
	}

	kn.addSettingsViewModel(SettingsFolders, 'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');

	SettingsFolders.prototype.folderEditOnEnter = function (oFolder)
	{
		var sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : '';
		if ('' !== sEditName && oFolder.name() !== sEditName)
		{
			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

			RL.data().foldersRenaming(true);
			Remote.folderRename(function (sResult, oData) {

				RL.data().foldersRenaming(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					RL.data().foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
				}

				RL.folders();

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
		RL.data().foldersListError('');
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

				RL.data().folderList.remove(fRemoveFolder);

				RL.data().foldersDeleting(true);
				Remote.folderDelete(function (sResult, oData) {

					RL.data().foldersDeleting(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						RL.data().foldersListError(
							oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
					}

					RL.folders();

				}, oFolderToRemove.fullNameRaw);

				Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
			}
		}
		else if (0 < oFolderToRemove.privateMessageCountAll())
		{
			RL.data().foldersListError(Utils.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
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

}(module));