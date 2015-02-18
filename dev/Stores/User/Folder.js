
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),

		Cache = require('Storage/User/Cache')
	;

	/**
	 * @constructor
	 */
	function FolderUserStore()
	{
		this.sentFolder = ko.observable('');
		this.draftFolder = ko.observable('');
		this.spamFolder = ko.observable('');
		this.trashFolder = ko.observable('');
		this.archiveFolder = ko.observable('');

		this.computers();
		this.subscribers();
	}

	FolderUserStore.prototype.computers = function ()
	{
		this.draftFolderNotEnabled = ko.computed(function () {
			return '' === this.draftFolder() || Consts.Values.UnuseOptionValue === this.draftFolder();
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

	module.exports = new FolderUserStore();

}());
