
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
	}

	_.extend(UserAjaxUserPromises.prototype, AbstractAjaxPromises.prototype);

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

	UserAjaxUserPromises.prototype.attachmentsActions = function (sAction, aHashes, fTrigger)
	{
		return this.postRequest('AttachmentsActions', fTrigger, {
			'Do': sAction,
			'Hashes': aHashes
		});
	};

	UserAjaxUserPromises.prototype.welcomeClose = function ()
	{
		return this.postRequest('WelcomeClose');
	};

//	UserAjaxUserPromises.prototype.messageList = function (sFolderFullNameRaw, iOffset, iLimit, sSearch, fTrigger)
//	{
//		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
//		sSearch = Utils.pString(sSearch);
//		iOffset = Utils.pInt(iOffset);
//		iLimit = Utils.pInt(iLimit);
//
//		var sFolderHash = Cache.getFolderHash(sFolderFullNameRaw);
//
//		if ('' !== sFolderHash && ('' === sSearch || -1 === sSearch.indexOf('is:')))
//		{
//			return this.abort('MessageList')
//				.getRequest('MessageList', fTrigger,
//					Links.subQueryPrefix() + '/' + Base64.urlsafe_encode([
//						sFolderFullNameRaw,
//						iOffset,
//						iLimit,
//						sSearch,
//						AppStore.projectHash(),
//						sFolderHash,
//						Cache.getFolderInboxName() === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
//						AppStore.threadsAllowed() && SettingsStore.useThreads() ? '1' : '0',
//						''
//					].join(String.fromCharCode(0))))
//				.then(PromisesPopulator.messageList);
//		}
//		else
//		{
//			return this.abort('MessageList')
//				.postRequest('MessageList', fTrigger,{
//					'Folder': sFolderFullNameRaw,
//					'Offset': iOffset,
//					'Limit': iLimit,
//					'Search': sSearch,
//					'UidNext': Cache.getFolderInboxName() === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
//					'UseThreads': AppStore.threadsAllowed() && SettingsStore.useThreads() ? '1' : '0'
//				})
//				.then(PromisesPopulator.messageList);
//		}
//
//		return this.fastReject(Enums.Notification.UnknownError);
//	};
//
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