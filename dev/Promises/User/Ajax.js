
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),

//		Enums = require('Common/Enums'),
//		Utils = require('Common/Utils'),
//		Base64 = require('Common/Base64'),
//		Cache = require('Common/Cache'),
//		Links = require('Common/Links'),
//
//		AppStore = require('Stores/User/App'),
//		SettingsStore = require('Stores/User/Settings'),

		MessageSimpleModel = require('Model/MessageSimple'),

		PromisesPopulator = require('Promises/User/Populator'),
		AbstractAjaxPromises = require('Promises/AbstractAjax')
	;

	/**
	 * @constructor
	 * @extends AbstractAjaxPromises
	 */
	function UserAjaxUserPromises()
	{
		AbstractAjaxPromises.call(this);

		this.messageListSimpleHash = '';
		this.messageListSimpleCache = null;
	}

	_.extend(UserAjaxUserPromises.prototype, AbstractAjaxPromises.prototype);

	UserAjaxUserPromises.prototype.messageListSimple = function (sFolder, aUids, fTrigger)
	{
		var self = this, sHash = sFolder + '~' + aUids.join('/');
		if (sHash === this.messageListSimpleHash && this.messageListSimpleCache)
		{
			return this.fastResolve(this.messageListSimpleCache);
		}

		return this.abort('MessageListSimple')
			.postRequest('MessageListSimple', fTrigger, {
				'Folder': sFolder,
				'Uids': aUids
			}).then(function (oData) {

				self.messageListSimpleHash = sHash;
				self.messageListSimpleCache = _.compact(_.map(oData.Result, function (aItem) {
					return MessageSimpleModel.newInstanceFromJson(aItem);
				}));

				return self.messageListSimpleCache;

			}, function (iError) {

				self.messageListSimpleHash = '';
				self.messageListSimpleCache = null;

				return self.fastReject(iError);
			})
		;
	};

	UserAjaxUserPromises.prototype.foldersReload = function (fTrigger)
	{
		return this.abort('Folders')
			.postRequest('Folders', fTrigger).then(function (oData) {
				PromisesPopulator.foldersList(oData.Result);
				PromisesPopulator.foldersAdditionalParameters(oData.Result);
				return true;
			});
	};

	UserAjaxUserPromises.prototype._folders_timeout_ = 0;
	UserAjaxUserPromises.prototype.foldersReloadWithTimeout = function (fTrigger)
	{
		this.setTrigger(fTrigger, true);

		var self = this;
		window.clearTimeout(this._folders_timeout_);
		this._folders_timeout_ = window.setTimeout(function () {
			self.foldersReload(fTrigger);
		}, 500);
	};


	UserAjaxUserPromises.prototype.folderDelete = function (sFolderFullNameRaw, fTrigger)
	{
		return this.postRequest('FolderDelete', fTrigger, {
			'Folder': sFolderFullNameRaw
		});
	};

	UserAjaxUserPromises.prototype.folderCreate = function (sNewFolderName, sParentName, fTrigger)
	{
		return this.postRequest('FolderCreate', fTrigger, {
			'Folder': sNewFolderName,
			'Parent': sParentName
		});
	};

	UserAjaxUserPromises.prototype.folderRename = function (sPrevFolderFullNameRaw, sNewFolderName, fTrigger)
	{
		return this.postRequest('FolderRename', fTrigger, {
			'Folder': sPrevFolderFullNameRaw,
			'NewFolderName': sNewFolderName
		});
	};

//	UserAjaxUserPromises.prototype.message = function (sFolderFullNameRaw, iUid, fTrigger)
//	{
//		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
//		iUid = Utils.pInt(iUid);
//
//		if (Cache.getFolderFromCacheList(sFolderFullNameRaw) && 0 >= iUid)
//		{
//			return this.abort('Message')
//				.getRequest('Message', fTrigger,
//					Links.subQueryPrefix() + '/' + Base64.urlsafe_encode([
//						sFolderFullNameRaw, iUid,
//						AppStore.projectHash(),
//						AppStore.threadsAllowed() && SettingsStore.useThreads() ? '1' : '0'
//					].join(String.fromCharCode(0))))
//				.then(function (oData) {
//					return oData;
//				});
//		}
//
//		return this.fastReject(Enums.Notification.UnknownError);
//	};

	module.exports = new UserAjaxUserPromises();

}());