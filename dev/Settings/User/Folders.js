
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		FolderStore = require('Stores/User/Folder'),

		Settings = require('Storage/Settings'),
		Cache = require('Storage/User/Cache'),
		Remote = require('Storage/User/Remote'),
		Local = require('Storage/Client')
	;

	/**
	 * @constructor
	 */
	function FoldersUserSettings()
	{
		this.folderList = FolderStore.folderList;

		this.loading = ko.computed(function () {

			var
				bLoading = FolderStore.foldersLoading(),
				bCreating = FolderStore.foldersCreating(),
				bDeleting = FolderStore.foldersDeleting(),
				bRenaming = FolderStore.foldersRenaming()
			;

			return bLoading || bCreating || bDeleting || bRenaming;

		}, this);

		this.folderForDeletion = ko.observable(null).deleteAccessHelper();

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

			FolderStore.foldersRenaming(true);
			Remote.folderRename(function (sResult, oData) {

				FolderStore.foldersRenaming(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					FolderStore.folderList.error(
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
		FolderStore.folderList.error('');
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

				FolderStore.folderList.remove(fRemoveFolder);

				FolderStore.foldersDeleting(true);
				Remote.folderDelete(function (sResult, oData) {

					FolderStore.foldersDeleting(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						FolderStore.folderList.error(
							oData && oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) : Translator.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
					}

					require('App/User').folders();

				}, oFolderToRemove.fullNameRaw);

				Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
			}
		}
		else if (0 < oFolderToRemove.privateMessageCountAll())
		{
			FolderStore.folderList.error(Translator.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
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