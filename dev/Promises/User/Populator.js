
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

	FolderModel = require('Model/Folder').default,

	AbstractBasicPromises = require('Promises/AbstractBasic');

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
 * @param {Array?} expandedFolders
 * @returns {boolean}
 */
PromisesUserPopulator.prototype.isFolderExpanded = function(sFullNameHash, expandedFolders)
{
	return expandedFolders && Utils.isArray(expandedFolders) && -1 !== _.indexOf(expandedFolders, sFullNameHash);
};

/**
 * @param {string} sFolderFullNameRaw
 * @returns {string}
 */
PromisesUserPopulator.prototype.normalizeFolder = function(sFolderFullNameRaw)
{
	return ('' === sFolderFullNameRaw || Consts.UNUSED_OPTION_VALUE === sFolderFullNameRaw ||
		null !== Cache.getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';
};

/**
 * @param {string} sNamespace
 * @param {Array} aFolders
 * @param {Array?} expandedFolders
 * @returns {Array}
 */
PromisesUserPopulator.prototype.folderResponseParseRec = function(sNamespace, aFolders, expandedFolders)
{
	var
		self = this,
		bDisplaySpecSetting = FolderStore.displaySpecSetting(),
		aList = [];

	_.each(aFolders, function(oFolder) {
		if (oFolder)
		{
			var oCacheFolder = Cache.getFolderFromCacheList(oFolder.FullNameRaw);
			if (!oCacheFolder)
			{
				oCacheFolder = FolderModel.newInstanceFromJson(oFolder);
				if (oCacheFolder)
				{
					Cache.setFolderToCacheList(oFolder.FullNameRaw, oCacheFolder);
					Cache.setFolderFullNameRaw(oCacheFolder.fullNameHash, oFolder.FullNameRaw, oCacheFolder);
				}
			}

			if (oCacheFolder)
			{
				if (bDisplaySpecSetting)
				{
					oCacheFolder.checkable(!!oFolder.Checkable);
				}
				else
				{
					oCacheFolder.checkable(true);
				}

				oCacheFolder.collapsed(!self.isFolderExpanded(oCacheFolder.fullNameHash, expandedFolders));

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

				if (oFolder.SubFolders && 'Collection/FolderCollection' === oFolder.SubFolders['@Object'] &&
					oFolder.SubFolders['@Collection'] && Utils.isArray(oFolder.SubFolders['@Collection']))
				{
					oCacheFolder.subFolders(
						self.folderResponseParseRec(sNamespace, oFolder.SubFolders['@Collection'], expandedFolders));
				}

				aList.push(oCacheFolder);
			}
		}
	});

	return aList;
};

PromisesUserPopulator.prototype.foldersList = function(oData)
{
	if (oData && 'Collection/FolderCollection' === oData['@Object'] &&
		oData['@Collection'] && Utils.isArray(oData['@Collection']))
	{
		var
			expandedFolders = Local.get(Enums.ClientSideKeyName.ExpandedFolders),
			iLimit = Utils.pInt(Settings.appSettingsGet('folderSpecLimit')),
			iC = Utils.pInt(oData.CountRec);

		iLimit = 100 < iLimit ? 100 : (10 > iLimit ? 10 : iLimit);

		FolderStore.displaySpecSetting(0 >= iC || iLimit < iC);

		FolderStore.folderList(this.folderResponseParseRec(
			Utils.isUnd(oData.Namespace) ? '' : oData.Namespace, oData['@Collection'], expandedFolders)); // @todo optimization required
	}
};

PromisesUserPopulator.prototype.foldersAdditionalParameters = function(oData)
{
	if (oData && oData && 'Collection/FolderCollection' === oData['@Object'] &&
		oData['@Collection'] && Utils.isArray(oData['@Collection']))
	{
		if (!Utils.isUnd(oData.Namespace))
		{
			FolderStore.namespace = oData.Namespace;
		}

		AppStore.threadsAllowed(!!Settings.appSettingsGet('useImapThread') && oData.IsThreadsSupported && true);

		FolderStore.folderList.optimized(!!oData.Optimized);

		var bUpdate = false;

		if (oData.SystemFolders && '' === '' +
			Settings.settingsGet('SentFolder') +
			Settings.settingsGet('DraftFolder') +
			Settings.settingsGet('SpamFolder') +
			Settings.settingsGet('TrashFolder') +
			Settings.settingsGet('ArchiveFolder') +
			Settings.settingsGet('NullFolder'))
		{
			Settings.settingsSet('SentFolder', oData.SystemFolders[Enums.ServerFolderType.SENT] || null);
			Settings.settingsSet('DraftFolder', oData.SystemFolders[Enums.ServerFolderType.DRAFTS] || null);
			Settings.settingsSet('SpamFolder', oData.SystemFolders[Enums.ServerFolderType.JUNK] || null);
			Settings.settingsSet('TrashFolder', oData.SystemFolders[Enums.ServerFolderType.TRASH] || null);
			Settings.settingsSet('ArchiveFolder', oData.SystemFolders[Enums.ServerFolderType.ALL] || null);

			bUpdate = true;
		}

		FolderStore.sentFolder(this.normalizeFolder(Settings.settingsGet('SentFolder')));
		FolderStore.draftFolder(this.normalizeFolder(Settings.settingsGet('DraftFolder')));
		FolderStore.spamFolder(this.normalizeFolder(Settings.settingsGet('SpamFolder')));
		FolderStore.trashFolder(this.normalizeFolder(Settings.settingsGet('TrashFolder')));
		FolderStore.archiveFolder(this.normalizeFolder(Settings.settingsGet('ArchiveFolder')));

		if (bUpdate)
		{
			require('Remote/User/Ajax').saveSystemFolders(Utils.noop, {
				SentFolder: FolderStore.sentFolder(),
				DraftFolder: FolderStore.draftFolder(),
				SpamFolder: FolderStore.spamFolder(),
				TrashFolder: FolderStore.trashFolder(),
				ArchiveFolder: FolderStore.archiveFolder(),
				NullFolder: 'NullFolder'
			});
		}

		Local.set(Enums.ClientSideKeyName.FoldersLashHash, oData.FoldersHash);
	}
};

module.exports = new PromisesUserPopulator();
