
(function () {

	'use strict';

	var
		_ = require('_'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Cache = require('Common/Cache'),

		AppStore = require('Stores/User/App'),
		FolderStore = require('Stores/User/Folder'),

		Settings = require('Storage/Settings'),
		Local = require('Storage/Client'),

		FolderModel = require('Model/Folder'),

		AbstractBasicPromises = require('Promises/AbstractBasic')
	;

	/**
	 * @constructor
	 */
	function PromisesUserPopulator()
	{
		AbstractBasicPromises.call(this);
	}

	_.extend(PromisesUserPopulator.prototype, AbstractBasicPromises.prototype);

	/**
	 * @param {string} sFullNameHash
	 * @return {boolean}
	 */
	PromisesUserPopulator.prototype.isFolderExpanded = function (sFullNameHash)
	{
		var aExpandedList = Local.get(Enums.ClientSideKeyName.ExpandedFolders);
		return Utils.isArray(aExpandedList) && -1 !== _.indexOf(aExpandedList, sFullNameHash);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	PromisesUserPopulator.prototype.normalizeFolder = function (sFolderFullNameRaw)
	{
		return ('' === sFolderFullNameRaw || Consts.Values.UnuseOptionValue === sFolderFullNameRaw ||
			null !== Cache.getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';
	};

	/**
	 * @param {string} sNamespace
	 * @param {Array} aFolders
	 * @return {Array}
	 */
	PromisesUserPopulator.prototype.folderResponseParseRec = function (sNamespace, aFolders)
	{
		var
			self = this,
			iIndex = 0,
			iLen = 0,
			oFolder = null,
			oCacheFolder = null,
			sFolderFullNameRaw = '',
			aSubFolders = [],
			aList = []
		;

		for (iIndex = 0, iLen = aFolders.length; iIndex < iLen; iIndex++)
		{
			oFolder = aFolders[iIndex];
			if (oFolder)
			{
				sFolderFullNameRaw = oFolder.FullNameRaw;

				oCacheFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
				if (!oCacheFolder)
				{
					oCacheFolder = FolderModel.newInstanceFromJson(oFolder);
					if (oCacheFolder)
					{
						Cache.setFolderToCacheList(sFolderFullNameRaw, oCacheFolder);
						Cache.setFolderFullNameRaw(oCacheFolder.fullNameHash, sFolderFullNameRaw, oCacheFolder);
					}
				}

				if (oCacheFolder)
				{
					if (!FolderStore.displaySpecSetting())
					{
						oCacheFolder.checkable(true);
					}
					else
					{
						oCacheFolder.checkable(!!oFolder.Checkable);
					}

					oCacheFolder.collapsed(!self.isFolderExpanded(oCacheFolder.fullNameHash));

					if (oFolder.Extended)
					{
						if (oFolder.Extended.Hash)
						{
							Cache.setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);
						}

						if (Utils.isNormal(oFolder.Extended.MessageCount))
						{
							oCacheFolder.messageCountAll(oFolder.Extended.MessageCount);
						}

						if (Utils.isNormal(oFolder.Extended.MessageUnseenCount))
						{
							oCacheFolder.messageCountUnread(oFolder.Extended.MessageUnseenCount);
						}
					}

					aSubFolders = oFolder['SubFolders'];
					if (aSubFolders && 'Collection/FolderCollection' === aSubFolders['@Object'] &&
						aSubFolders['@Collection'] && Utils.isArray(aSubFolders['@Collection']))
					{
						oCacheFolder.subFolders(
							this.folderResponseParseRec(sNamespace, aSubFolders['@Collection']));
					}

					aList.push(oCacheFolder);
				}
			}
		}

		return aList;
	};

	PromisesUserPopulator.prototype.foldersList = function (oData)
	{
		if (oData && 'Collection/FolderCollection' === oData['@Object'] &&
			oData['@Collection'] && Utils.isArray(oData['@Collection']))
		{
			var
				iLimit = Utils.pInt(Settings.settingsGet('FolderSpecLimit')),
				iC = Utils.pInt(oData['CountRec'])
			;

			iLimit = 100 < iLimit ? 100 : (10 > iLimit ? 10 : iLimit);

			FolderStore.displaySpecSetting(0 >= iC || iLimit < iC);
			FolderStore.folderList(this.folderResponseParseRec(
				Utils.isUnd(oData.Namespace) ? '' : oData.Namespace, oData['@Collection']));
		}
	};

	PromisesUserPopulator.prototype.foldersAdditionalParameters = function (oData)
	{
		if (oData && oData && 'Collection/FolderCollection' === oData['@Object'] &&
			oData['@Collection'] && Utils.isArray(oData['@Collection']))
		{
			if (!Utils.isUnd(oData.Namespace))
			{
				FolderStore.namespace = oData.Namespace;
			}

			AppStore.threadsAllowed(
				!!Settings.settingsGet('UseImapThread') &&
				oData.IsThreadsSupported && true);

			FolderStore.folderList.optimized(!!oData.Optimized);

			var bUpdate = false;

			if (oData['SystemFolders'] && '' === '' +
				Settings.settingsGet('SentFolder') +
				Settings.settingsGet('DraftFolder') +
				Settings.settingsGet('SpamFolder') +
				Settings.settingsGet('TrashFolder') +
				Settings.settingsGet('ArchiveFolder') +
				Settings.settingsGet('NullFolder'))
			{
				Settings.settingsSet('SentFolder', oData['SystemFolders'][Enums.ServerFolderType.SENT] || null);
				Settings.settingsSet('DraftFolder', oData['SystemFolders'][Enums.ServerFolderType.DRAFTS] || null);
				Settings.settingsSet('SpamFolder', oData['SystemFolders'][Enums.ServerFolderType.JUNK] || null);
				Settings.settingsSet('TrashFolder', oData['SystemFolders'][Enums.ServerFolderType.TRASH] || null);
				Settings.settingsSet('ArchiveFolder', oData['SystemFolders'][Enums.ServerFolderType.ALL] || null);

				bUpdate = true;
			}

			FolderStore.sentFolder(this.normalizeFolder(Settings.settingsGet('SentFolder')));
			FolderStore.draftFolder(this.normalizeFolder(Settings.settingsGet('DraftFolder')));
			FolderStore.spamFolder(this.normalizeFolder(Settings.settingsGet('SpamFolder')));
			FolderStore.trashFolder(this.normalizeFolder(Settings.settingsGet('TrashFolder')));
			FolderStore.archiveFolder(this.normalizeFolder(Settings.settingsGet('ArchiveFolder')));

			if (bUpdate)
			{
				require('Remote/User/Ajax').saveSystemFolders(Utils.emptyFunction, {
					'SentFolder': FolderStore.sentFolder(),
					'DraftFolder': FolderStore.draftFolder(),
					'SpamFolder': FolderStore.spamFolder(),
					'TrashFolder': FolderStore.trashFolder(),
					'ArchiveFolder': FolderStore.archiveFolder(),
					'NullFolder': 'NullFolder'
				});
			}

			Local.set(Enums.ClientSideKeyName.FoldersLashHash, oData.FoldersHash);
		}
	};

	module.exports = new PromisesUserPopulator();

}());