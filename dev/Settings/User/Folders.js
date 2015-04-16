
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Cache = require('Common/Cache'),

		Settings = require('Storage/Settings'),
		Local = require('Storage/Client'),

		FolderStore = require('Stores/User/Folder'),

		Promises = require('Promises/User/Ajax'),
		Remote = require('Remote/User/Ajax')
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

			require('App/User').foldersPromisesActionHelper(
				Promises.folderRename(oFolder.fullNameRaw, sEditName, FolderStore.foldersRenaming),
				Enums.Notification.CantRenameFolder);

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

				require('App/User').foldersPromisesActionHelper(
					Promises.folderDelete(oFolderToRemove.fullNameRaw, FolderStore.foldersDeleting),
					Enums.Notification.CantDeleteFolder);

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