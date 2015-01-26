
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/User/Data'),
		Cache = require('Storage/User/Cache'),
		Remote = require('Storage/User/Remote'),
		Local = require('Storage/Client')
	;

	/**
	 * @constructor
	 */
	function FoldersUserSettings()
	{
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
				return Translator.i18n('SETTINGS_FOLDERS/CREATING_PROCESS');
			}
			else if (bDeleting)
			{
				return Translator.i18n('SETTINGS_FOLDERS/DELETING_PROCESS');
			}
			else if (bRenaming)
			{
				return Translator.i18n('SETTINGS_FOLDERS/RENAMING_PROCESS');
			}
			else if (bLoading)
			{
				return Translator.i18n('SETTINGS_FOLDERS/LOADING_PROCESS');
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

		this.useImapSubscribe = !!Settings.settingsGet('UseImapSubscribe');
	}

	FoldersUserSettings.prototype.folderEditOnEnter = function (oFolder)
	{
		var
			sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : ''
		;

		if ('' !== sEditName && oFolder.name() !== sEditName)
		{
			Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');

			Data.foldersRenaming(true);
			Remote.folderRename(function (sResult, oData) {

				Data.foldersRenaming(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					Data.folderList.error(
						oData && oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) : Translator.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
				}

				require('App/User').folders();

			}, oFolder.fullNameRaw, sEditName);

			Cache.removeFolderFromCacheList(oFolder.fullNameRaw);

			oFolder.name(sEditName);
		}

		oFolder.edited(false);
	};

	FoldersUserSettings.prototype.folderEditOnEsc = function (oFolder)
	{
		if (oFolder)
		{
			oFolder.edited(false);
		}
	};

	FoldersUserSettings.prototype.onShow = function ()
	{
		Data.folderList.error('');
	};

	FoldersUserSettings.prototype.createFolder = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/FolderCreate'));
	};

	FoldersUserSettings.prototype.systemFolder = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/FolderSystem'));
	};

	FoldersUserSettings.prototype.deleteFolder = function (oFolderToRemove)
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
				Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');

				Data.folderList.remove(fRemoveFolder);

				Data.foldersDeleting(true);
				Remote.folderDelete(function (sResult, oData) {

					Data.foldersDeleting(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						Data.folderList.error(
							oData && oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) : Translator.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
					}

					require('App/User').folders();

				}, oFolderToRemove.fullNameRaw);

				Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
			}
		}
		else if (0 < oFolderToRemove.privateMessageCountAll())
		{
			Data.folderList.error(Translator.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
		}
	};

	FoldersUserSettings.prototype.subscribeFolder = function (oFolder)
	{
		Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, true);

		oFolder.subScribed(true);
	};

	FoldersUserSettings.prototype.unSubscribeFolder = function (oFolder)
	{
		Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, false);

		oFolder.subScribed(false);
	};

	module.exports = FoldersUserSettings;

}());