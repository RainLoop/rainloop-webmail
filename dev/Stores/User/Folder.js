
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),

		Cache = require('Common/Cache')
	;

	/**
	 * @constructor
	 */
	function FolderUserStore()
	{
		this.displaySpecSetting = ko.observable(true);

		this.sentFolder = ko.observable('');
		this.draftFolder = ko.observable('');
		this.spamFolder = ko.observable('');
		this.trashFolder = ko.observable('');
		this.archiveFolder = ko.observable('');

		this.namespace = '';

		this.folderList = ko.observableArray([]);
		this.folderList.optimized = ko.observable(false);
		this.folderList.error = ko.observable('');

		this.foldersLoading = ko.observable(false);
		this.foldersCreating = ko.observable(false);
		this.foldersDeleting = ko.observable(false);
		this.foldersRenaming = ko.observable(false);

		this.foldersInboxUnreadCount = ko.observable(0);

		this.currentFolder = ko.observable(null).extend({'toggleSubscribe': [null,
			function (oPrev) { if (oPrev) { oPrev.selected(false); }},
			function (oNext) { if (oNext) { oNext.selected(true); }}
		]});

		this.computers();
		this.subscribers();
	}

	FolderUserStore.prototype.computers = function ()
	{
		this.draftFolderNotEnabled = ko.computed(function () {
			return '' === this.draftFolder() || Consts.Values.UnuseOptionValue === this.draftFolder();
		}, this);

		this.foldersListWithSingleInboxRootFolder = ko.computed(function () {
			return !_.find(this.folderList(), function (oFolder) {
				return oFolder && !oFolder.isSystemFolder() && oFolder.visible();
			});
		}, this);

		this.currentFolderFullNameRaw = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().fullNameRaw : '';
		}, this);

		this.currentFolderFullName = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().fullName : '';
		}, this);

		this.currentFolderFullNameHash = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().fullNameHash : '';
		}, this);

		this.foldersChanging = ko.computed(function () {
			var
				bLoading = this.foldersLoading(),
				bCreating = this.foldersCreating(),
				bDeleting = this.foldersDeleting(),
				bRenaming = this.foldersRenaming()
			;
			return bLoading || bCreating || bDeleting || bRenaming;
		}, this);

		this.folderListSystemNames = ko.computed(function () {

			var
				aList = [Cache.getFolderInboxName()],
				aFolders = this.folderList(),
				sSentFolder = this.sentFolder(),
				sDraftFolder = this.draftFolder(),
				sSpamFolder = this.spamFolder(),
				sTrashFolder = this.trashFolder(),
				sArchiveFolder = this.archiveFolder()
			;

			if (Utils.isArray(aFolders) && 0 < aFolders.length)
			{
				if ('' !== sSentFolder && Consts.Values.UnuseOptionValue !== sSentFolder)
				{
					aList.push(sSentFolder);
				}
				if ('' !== sDraftFolder && Consts.Values.UnuseOptionValue !== sDraftFolder)
				{
					aList.push(sDraftFolder);
				}
				if ('' !== sSpamFolder && Consts.Values.UnuseOptionValue !== sSpamFolder)
				{
					aList.push(sSpamFolder);
				}
				if ('' !== sTrashFolder && Consts.Values.UnuseOptionValue !== sTrashFolder)
				{
					aList.push(sTrashFolder);
				}
				if ('' !== sArchiveFolder && Consts.Values.UnuseOptionValue !== sArchiveFolder)
				{
					aList.push(sArchiveFolder);
				}
			}

			return aList;

		}, this);

		this.folderListSystem = ko.computed(function () {
			return _.compact(_.map(this.folderListSystemNames(), function (sName) {
				return Cache.getFolderFromCacheList(sName);
			}));
		}, this);

		this.folderMenuForMove = ko.computed(function () {
			return Utils.folderListOptionsBuilder(this.folderListSystem(), this.folderList(), [
				this.currentFolderFullNameRaw()
			], null, null, null, null, function (oItem) {
				return oItem ? oItem.localName() : '';
			});
		}, this);

		this.folderMenuForFilters = ko.computed(function () {
			return Utils.folderListOptionsBuilder(this.folderListSystem(), this.folderList(),
				['INBOX'], [['', '']], null, null, null, function (oItem) {
					return oItem ? oItem.localName() : '';
				}
			);
		}, this);
	};

	FolderUserStore.prototype.subscribers = function ()
	{
		var
			fRemoveSystemFolderType = function (observable) {
				return function () {
					var oFolder = Cache.getFolderFromCacheList(observable());
					if (oFolder)
					{
						oFolder.type(Enums.FolderType.User);
					}
				};
			},
			fSetSystemFolderType = function (iType) {
				return function (sValue) {
					var oFolder = Cache.getFolderFromCacheList(sValue);
					if (oFolder)
					{
						oFolder.type(iType);
					}
				};
			}
		;

		this.sentFolder.subscribe(fRemoveSystemFolderType(this.sentFolder), this, 'beforeChange');
		this.draftFolder.subscribe(fRemoveSystemFolderType(this.draftFolder), this, 'beforeChange');
		this.spamFolder.subscribe(fRemoveSystemFolderType(this.spamFolder), this, 'beforeChange');
		this.trashFolder.subscribe(fRemoveSystemFolderType(this.trashFolder), this, 'beforeChange');
		this.archiveFolder.subscribe(fRemoveSystemFolderType(this.archiveFolder), this, 'beforeChange');

		this.sentFolder.subscribe(fSetSystemFolderType(Enums.FolderType.SentItems), this);
		this.draftFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Draft), this);
		this.spamFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Spam), this);
		this.trashFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Trash), this);
		this.archiveFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Archive), this);
	};

	/**
	 * @return {Array}
	 */
	FolderUserStore.prototype.getNextFolderNames = function ()
	{
		var
			aResult = [],
			iLimit = 5,
			iUtc = require('Common/Momentor').momentNowUnix(),
			iTimeout = iUtc - 60 * 5,
			aTimeouts = [],
			sInboxFolderName = Cache.getFolderInboxName(),
			fSearchFunction = function (aList) {
				_.each(aList, function (oFolder) {
					if (oFolder && sInboxFolderName !== oFolder.fullNameRaw &&
						oFolder.selectable && oFolder.existen &&
						iTimeout > oFolder.interval &&
						(oFolder.isSystemFolder() || (oFolder.subScribed() && oFolder.checkable()))
					)
					{
						aTimeouts.push([oFolder.interval, oFolder.fullNameRaw]);
					}

					if (oFolder && 0 < oFolder.subFolders().length)
					{
						fSearchFunction(oFolder.subFolders());
					}
				});
			}
		;

		fSearchFunction(this.folderList());

		aTimeouts.sort(function(a, b) {
			if (a[0] < b[0]) {
				return -1;
			} else if (a[0] > b[0]) {
				return 1;
			}

			return 0;
		});

		_.find(aTimeouts, function (aItem) {
			var oFolder = Cache.getFolderFromCacheList(aItem[1]);
			if (oFolder)
			{
				oFolder.interval = iUtc;
				aResult.push(aItem[1]);
			}

			return iLimit <= aResult.length;
		});

		aResult = _.uniq(aResult);

		return aResult;
	};

	module.exports = new FolderUserStore();

}());
