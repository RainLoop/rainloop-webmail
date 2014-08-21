(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

var
	kn = require('./Knoin/Knoin.js'),
	RL = require('./Boots/RainLoopApp.js'),
	Remote = require('./Storages/WebMailAjaxRemoteStorage.js')
;

kn.bootstart(RL, Remote);
},{"./Boots/RainLoopApp.js":3,"./Knoin/Knoin.js":26,"./Storages/WebMailAjaxRemoteStorage.js":39}],2:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		window = require('../External/window.js'),
		$html = require('../External/$html.js'),
		$window = require('../External/$window.js'),
		$doc = require('../External/$doc.js'),
		AppData = require('../External/AppData.js'),

		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		Plugins = require('../Common/Plugins.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		Remote = require('../Remote.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractBoot = require('../Knoin/KnoinAbstractBoot.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractBoot
	 */
	function AbstractApp()
	{
		KnoinAbstractBoot.call(this);

		this.oSettings = null;
		this.oPlugins = null;
		this.oLocal = null;
		this.oLink = null;
		this.oSubs = {};

		this.isLocalAutocomplete = true;

		this.popupVisibilityNames = ko.observableArray([]);

		this.popupVisibility = ko.computed(function () {
			return 0 < this.popupVisibilityNames().length;
		}, this);

		this.iframe = $('<iframe style="display:none" src="javascript:;" />').appendTo('body');

		$window.on('error', function (oEvent) {
			if (oEvent && oEvent.originalEvent && oEvent.originalEvent.message &&
				-1 === Utils.inArray(oEvent.originalEvent.message, [
					'Script error.', 'Uncaught Error: Error calling method on NPObject.'
				]))
			{
				Remote().jsError(
					Utils.emptyFunction,
					oEvent.originalEvent.message,
					oEvent.originalEvent.filename,
					oEvent.originalEvent.lineno,
					window.location && window.location.toString ? window.location.toString() : '',
					$html.attr('class'),
					Utils.microtime() - Globals.now
				);
			}
		});

		$doc.on('keydown', function (oEvent) {
			if (oEvent && oEvent.ctrlKey)
			{
				$html.addClass('rl-ctrl-key-pressed');
			}
		}).on('keyup', function (oEvent) {
			if (oEvent && !oEvent.ctrlKey)
			{
				$html.removeClass('rl-ctrl-key-pressed');
			}
		});
	}

	_.extend(AbstractApp.prototype, KnoinAbstractBoot.prototype);

	AbstractApp.prototype.oSettings = null;
	AbstractApp.prototype.oPlugins = null;
	AbstractApp.prototype.oLocal = null;
	AbstractApp.prototype.oLink = null;
	AbstractApp.prototype.oSubs = {};

	/**
	 * @param {string} sLink
	 * @return {boolean}
	 */
	AbstractApp.prototype.download = function (sLink)
	{
		var
			oE = null,
			oLink = null,
			sUserAgent = window.navigator.userAgent.toLowerCase()
		;

		if (sUserAgent && (sUserAgent.indexOf('chrome') > -1 || sUserAgent.indexOf('chrome') > -1))
		{
			oLink = window.document.createElement('a');
			oLink['href'] = sLink;

			if (window.document['createEvent'])
			{
				oE = window.document['createEvent']('MouseEvents');
				if (oE && oE['initEvent'] && oLink['dispatchEvent'])
				{
					oE['initEvent']('click', true, true);
					oLink['dispatchEvent'](oE);
					return true;
				}
			}
		}

		if (Globals.bMobileDevice)
		{
			window.open(sLink, '_self');
			window.focus();
		}
		else
		{
			this.iframe.attr('src', sLink);
	//		window.document.location.href = sLink;
		}

		return true;
	};

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	AbstractApp.prototype.settingsGet = function (sName)
	{
		if (null === this.oSettings)
		{
			this.oSettings = Utils.isNormal(AppData) ? AppData : {};
		}

		return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
	};

	/**
	 * @param {string} sName
	 * @param {?} mValue
	 */
	AbstractApp.prototype.settingsSet = function (sName, mValue)
	{
		if (null === this.oSettings)
		{
			this.oSettings = Utils.isNormal(AppData) ? AppData : {};
		}

		this.oSettings[sName] = mValue;
	};

	AbstractApp.prototype.setTitle = function (sTitle)
	{
		sTitle = ((Utils.isNormal(sTitle) && 0 < sTitle.length) ? sTitle + ' - ' : '') +
			this.settingsGet('Title') || '';

		window.document.title = '_';
		window.document.title = sTitle;
	};

	/**
	 * @param {boolean=} bLogout = false
	 * @param {boolean=} bClose = false
	 */
	AbstractApp.prototype.loginAndLogoutReload = function (bLogout, bClose)
	{
		var
			sCustomLogoutLink = Utils.pString(this.settingsGet('CustomLogoutLink')),
			bInIframe = !!this.settingsGet('InIframe')
		;

		bLogout = Utils.isUnd(bLogout) ? false : !!bLogout;
		bClose = Utils.isUnd(bClose) ? false : !!bClose;

		if (bLogout && bClose && window.close)
		{
			window.close();
		}

		if (bLogout && '' !== sCustomLogoutLink && window.location.href !== sCustomLogoutLink)
		{
			_.delay(function () {
				if (bInIframe && window.parent)
				{
					window.parent.location.href = sCustomLogoutLink;
				}
				else
				{
					window.location.href = sCustomLogoutLink;
				}
			}, 100);
		}
		else
		{
			kn.routeOff();
			kn.setHash(LinkBuilder.root(), true);
			kn.routeOff();

			_.delay(function () {
				if (bInIframe && window.parent)
				{
					window.parent.location.reload();
				}
				else
				{
					window.location.reload();
				}
			}, 100);
		}
	};

	AbstractApp.prototype.historyBack = function ()
	{
		window.history.back();
	};

	/**
	 * @param {string} sQuery
	 * @param {Function} fCallback
	 */
	AbstractApp.prototype.getAutocomplete = function (sQuery, fCallback)
	{
		fCallback([], sQuery);
	};

	/**
	 * @param {string} sName
	 * @param {Function} fFunc
	 * @param {Object=} oContext
	 * @return {AbstractApp}
	 */
	AbstractApp.prototype.sub = function (sName, fFunc, oContext)
	{
		if (Utils.isUnd(this.oSubs[sName]))
		{
			this.oSubs[sName] = [];
		}

		this.oSubs[sName].push([fFunc, oContext]);

		return this;
	};

	/**
	 * @param {string} sName
	 * @param {Array=} aArgs
	 * @return {AbstractApp}
	 */
	AbstractApp.prototype.pub = function (sName, aArgs)
	{
		Plugins.runHook('rl-pub', [sName, aArgs]);
		if (!Utils.isUnd(this.oSubs[sName]))
		{
			_.each(this.oSubs[sName], function (aItem) {
				if (aItem[0])
				{
					aItem[0].apply(aItem[1] || null, aArgs || []);
				}
			});
		}

		return this;
	};

	/**
	 * @param {string} sName
	 * @return {boolean}
	 */
	AbstractApp.prototype.capa = function (sName)
	{
		var mCapa = this.settingsGet('Capa');
		return Utils.isArray(mCapa) && Utils.isNormal(sName) && -1 < Utils.inArray(sName, mCapa);
	};

	AbstractApp.prototype.bootstart = function ()
	{
		var
			self = this,
			ssm = require('../External/ssm.js')
		;

		Utils.initOnStartOrLangChange(function () {
			Utils.initNotificationLanguage();
		}, null);

		_.delay(function () {
			Utils.windowResize();
		}, 1000);

		ssm.addState({
			'id': 'mobile',
			'maxWidth': 767,
			'onEnter': function() {
				$html.addClass('ssm-state-mobile');
				self.pub('ssm.mobile-enter');
			},
			'onLeave': function() {
				$html.removeClass('ssm-state-mobile');
				self.pub('ssm.mobile-leave');
			}
		});

		ssm.addState({
			'id': 'tablet',
			'minWidth': 768,
			'maxWidth': 999,
			'onEnter': function() {
				$html.addClass('ssm-state-tablet');
			},
			'onLeave': function() {
				$html.removeClass('ssm-state-tablet');
			}
		});

		ssm.addState({
			'id': 'desktop',
			'minWidth': 1000,
			'maxWidth': 1400,
			'onEnter': function() {
				$html.addClass('ssm-state-desktop');
			},
			'onLeave': function() {
				$html.removeClass('ssm-state-desktop');
			}
		});

		ssm.addState({
			'id': 'desktop-large',
			'minWidth': 1400,
			'onEnter': function() {
				$html.addClass('ssm-state-desktop-large');
			},
			'onLeave': function() {
				$html.removeClass('ssm-state-desktop-large');
			}
		});

		this.sub('ssm.mobile-enter', function () {
			RL.data().leftPanelDisabled(true); // TODO cjs
		});

		this.sub('ssm.mobile-leave', function () {
			RL.data().leftPanelDisabled(false); // TODO cjs
		});

		RL.data().leftPanelDisabled.subscribe(function (bValue) { // TODO cjs
			$html.toggleClass('rl-left-panel-disabled', bValue);
		});

		ssm.ready();
	};

	module.exports = AbstractApp;

}(module));
},{"../Common/Globals.js":6,"../Common/LinkBuilder.js":7,"../Common/Plugins.js":8,"../Common/Utils.js":9,"../External/$doc.js":11,"../External/$html.js":12,"../External/$window.js":13,"../External/AppData.js":14,"../External/jquery.js":19,"../External/ko.js":21,"../External/ssm.js":23,"../External/underscore.js":24,"../External/window.js":25,"../Knoin/Knoin.js":26,"../Knoin/KnoinAbstractBoot.js":27,"../Remote.js":33}],3:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		moment = require('../External/moment.js'),
		
		Enums = require('../Common/Enums.js'),
		Globals = require('../Common/Globals.js'),
		Consts = require('../Common/Consts.js'),
		Plugins = require('../Common/Plugins.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		kn = require('../Knoin/Knoin.js'),

		Data = require('../Storages/WebMailDataStorage.js'),
		Cache = require('../Storages/WebMailCacheStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),
		
		PopupsFolderSystemViewModel = require('../ViewModels/Popups/PopupsAskViewModel.js'),
		PopupsAskViewModel = require('../ViewModels/Popups/PopupsAskViewModel.js'),
		
		AbstractApp = require('./AbstractApp.js')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function RainLoopApp()
	{
		AbstractApp.call(this);

		this.oData = null;
		this.oRemote = null;
		this.oCache = null;
		this.oMoveCache = {};

		this.quotaDebounce = _.debounce(this.quota, 1000 * 30);
		this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

		this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

		window.setInterval(function () {
			RL.pub('interval.30s');
		}, 30000);

		window.setInterval(function () {
			RL.pub('interval.1m');
		}, 60000);

		window.setInterval(function () {
			RL.pub('interval.2m');
		}, 60000 * 2);

		window.setInterval(function () {
			RL.pub('interval.3m');
		}, 60000 * 3);

		window.setInterval(function () {
			RL.pub('interval.5m');
		}, 60000 * 5);

		window.setInterval(function () {
			RL.pub('interval.10m');
		}, 60000 * 10);

		window.setTimeout(function () {
			window.setInterval(function () {
				RL.pub('interval.10m-after5m');
			}, 60000 * 10);
		}, 60000 * 5);

		$.wakeUp(function () {
			Remote.jsVersion(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult && oData && !oData.Result)
				{
					if (window.parent && !!RL.settingsGet('InIframe'))
					{
						window.parent.location.reload();
					}
					else
					{
						window.location.reload();
					}
				}
			}, RL.settingsGet('Version'));
		}, {}, 60 * 60 * 1000);
	}

	_.extend(RainLoopApp.prototype, AbstractApp.prototype);

	RainLoopApp.prototype.oData = null;
	RainLoopApp.prototype.oRemote = null;
	RainLoopApp.prototype.oCache = null;

	/**
	 * @return {WebMailDataStorage}
	 */
	RainLoopApp.prototype.data = function ()
	{
		if (null === this.oData)
		{
			this.oData = new WebMailDataStorage();
		}

		return this.oData;
	};

	/**
	 * @return {WebMailAjaxRemoteStorage}
	 */
	RainLoopApp.prototype.remote = function ()
	{
		if (null === this.oRemote)
		{
			this.oRemote = new WebMailAjaxRemoteStorage();
		}

		return this.oRemote;
	};

	RainLoopApp.prototype.reloadFlagsCurrentMessageListAndMessageFromCache = function ()
	{
		_.each(Data.messageList(), function (oMessage) {
			Cache.initMessageFlagsFromCache(oMessage);
		});

		Cache.initMessageFlagsFromCache(Data.message());
	};

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	RainLoopApp.prototype.reloadMessageList = function (bDropPagePosition, bDropCurrenFolderCache)
	{
		var
			iOffset = (Data.messageListPage() - 1) * Data.messagesPerPage()
		;

		if (Utils.isUnd(bDropCurrenFolderCache) ? false : !!bDropCurrenFolderCache)
		{
			Cache.setFolderHash(Data.currentFolderFullNameRaw(), '');
		}

		if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
		{
			Data.messageListPage(1);
			iOffset = 0;
		}

		Data.messageListLoading(true);
		Remote.messageList(function (sResult, oData, bCached) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.messageListError('');
				Data.messageListLoading(false);
				Data.setMessageList(oData, bCached);
			}
			else if (Enums.StorageResultType.Unload === sResult)
			{
				Data.messageListError('');
				Data.messageListLoading(false);
			}
			else if (Enums.StorageResultType.Abort !== sResult)
			{
				Data.messageList([]);
				Data.messageListLoading(false);
				Data.messageListError(oData && oData.ErrorCode ?
					Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
				);
			}

		}, Data.currentFolderFullNameRaw(), iOffset, Data.messagesPerPage(), Data.messageListSearch());
	};

	RainLoopApp.prototype.recacheInboxMessageList = function ()
	{
		Remote.messageList(Utils.emptyFunction, 'INBOX', 0, Data.messagesPerPage(), '', true);
	};

	RainLoopApp.prototype.reloadMessageListHelper = function (bEmptyList)
	{
		RL.reloadMessageList(bEmptyList);
	};

	/**
	 * @param {Function} fResultFunc
	 * @returns {boolean}
	 */
	RainLoopApp.prototype.contactsSync = function (fResultFunc)
	{
		var oContacts = Data.contacts;
		if (oContacts.importing() || oContacts.syncing() || !Data.enableContactsSync() || !Data.allowContactsSync())
		{
			return false;
		}

		oContacts.syncing(true);

		Remote.contactsSync(function (sResult, oData) {

			oContacts.syncing(false);

			if (fResultFunc)
			{
				fResultFunc(sResult, oData);
			}
		});

		return true;
	};

	RainLoopApp.prototype.messagesMoveTrigger = function ()
	{
		var
			self = this,
			sSpamFolder = Data.spamFolder()
		;

		_.each(this.oMoveCache, function (oItem) {

			var
				bSpam = sSpamFolder === oItem['To'],
				bHam = !bSpam && sSpamFolder === oItem['From'] && 'INBOX' === oItem['To']
			;

			Remote.messagesMove(self.moveOrDeleteResponseHelper, oItem['From'], oItem['To'], oItem['Uid'],
				bSpam ? 'SPAM' : (bHam ? 'HAM' : ''));
		});

		this.oMoveCache = {};
	};

	RainLoopApp.prototype.messagesMoveHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForMove)
	{
		var sH = '$$' + sFromFolderFullNameRaw + '$$' + sToFolderFullNameRaw + '$$';
		if (!this.oMoveCache[sH])
		{
			this.oMoveCache[sH] = {
				'From': sFromFolderFullNameRaw,
				'To': sToFolderFullNameRaw,
				'Uid': []
			};
		}

		this.oMoveCache[sH]['Uid'] = _.union(this.oMoveCache[sH]['Uid'], aUidForMove);
		this.messagesMoveTrigger();
	};

	RainLoopApp.prototype.messagesCopyHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy)
	{
		Remote.messagesCopy(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			sToFolderFullNameRaw,
			aUidForCopy
		);
	};

	RainLoopApp.prototype.messagesDeleteHelper = function (sFromFolderFullNameRaw, aUidForRemove)
	{
		Remote.messagesDelete(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			aUidForRemove
		);
	};

	RainLoopApp.prototype.moveOrDeleteResponseHelper = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && Data.currentFolder())
		{
			if (oData && Utils.isArray(oData.Result) && 2 === oData.Result.length)
			{
				Cache.setFolderHash(oData.Result[0], oData.Result[1]);
			}
			else
			{
				Cache.setFolderHash(Data.currentFolderFullNameRaw(), '');

				if (oData && -1 < Utils.inArray(oData.ErrorCode,
					[Enums.Notification.CantMoveMessage, Enums.Notification.CantCopyMessage]))
				{
					window.alert(Utils.getNotification(oData.ErrorCode));
				}
			}

			RL.reloadMessageListHelper(0 === Data.messageList().length);
			RL.quotaDebounce();
		}
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 */
	RainLoopApp.prototype.deleteMessagesFromFolderWithoutCheck = function (sFromFolderFullNameRaw, aUidForRemove)
	{
		this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
		Data.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
	};

	/**
	 * @param {number} iDeleteType
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 * @param {boolean=} bUseFolder = true
	 */
	RainLoopApp.prototype.deleteMessagesFromFolder = function (iDeleteType, sFromFolderFullNameRaw, aUidForRemove, bUseFolder)
	{
		var
			self = this,
			oMoveFolder = null,
			nSetSystemFoldersNotification = null
		;

		switch (iDeleteType)
		{
			case Enums.FolderType.Spam:
				oMoveFolder = Cache.getFolderFromCacheList(Data.spamFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Spam;
				break;
			case Enums.FolderType.NotSpam:
				oMoveFolder = Cache.getFolderFromCacheList('INBOX');
				break;
			case Enums.FolderType.Trash:
				oMoveFolder = Cache.getFolderFromCacheList(Data.trashFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Trash;
				break;
			case Enums.FolderType.Archive:
				oMoveFolder = Cache.getFolderFromCacheList(Data.archiveFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Archive;
				break;
		}

		bUseFolder = Utils.isUnd(bUseFolder) ? true : !!bUseFolder;
		if (bUseFolder)
		{
			if ((Enums.FolderType.Spam === iDeleteType && Consts.Values.UnuseOptionValue === Data.spamFolder()) ||
				(Enums.FolderType.Trash === iDeleteType && Consts.Values.UnuseOptionValue === Data.trashFolder()) ||
				(Enums.FolderType.Archive === iDeleteType && Consts.Values.UnuseOptionValue === Data.archiveFolder()))
			{
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder)
		{
			kn.showScreenPopup(PopupsFolderSystemViewModel, [nSetSystemFoldersNotification]);
		}
		else if (!bUseFolder || (Enums.FolderType.Trash === iDeleteType &&
			(sFromFolderFullNameRaw === Data.spamFolder() || sFromFolderFullNameRaw === Data.trashFolder())))
		{
			kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), function () {

				self.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
				Data.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);

			}]);
		}
		else if (oMoveFolder)
		{
			this.messagesMoveHelper(sFromFolderFullNameRaw, oMoveFolder.fullNameRaw, aUidForRemove);
			Data.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, oMoveFolder.fullNameRaw);
		}
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForMove
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean=} bCopy = false
	 */
	RainLoopApp.prototype.moveMessagesToFolder = function (sFromFolderFullNameRaw, aUidForMove, sToFolderFullNameRaw, bCopy)
	{
		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && Utils.isArray(aUidForMove) && 0 < aUidForMove.length)
		{
			var
				oFromFolder = Cache.getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = Cache.getFolderFromCacheList(sToFolderFullNameRaw)
			;

			if (oFromFolder && oToFolder)
			{
				if (Utils.isUnd(bCopy) ? false : !!bCopy)
				{
					this.messagesCopyHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				}
				else
				{
					this.messagesMoveHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				}

				Data.removeMessagesFromList(oFromFolder.fullNameRaw, aUidForMove, oToFolder.fullNameRaw, bCopy);
				return true;
			}
		}

		return false;
	};

	/**
	 * @param {Function=} fCallback
	 */
	RainLoopApp.prototype.folders = function (fCallback)
	{
		this.data().foldersLoading(true);
		this.remote().folders(_.bind(function (sResult, oData) {

			Data.foldersLoading(false);
			if (Enums.StorageResultType.Success === sResult)
			{
				this.data().setFolders(oData);
				if (fCallback)
				{
					fCallback(true);
				}
			}
			else
			{
				if (fCallback)
				{
					fCallback(false);
				}
			}
		}, this));
	};

	RainLoopApp.prototype.reloadOpenPgpKeys = function ()
	{
		if (Data.capaOpenPGP())
		{
			var
				aKeys = [],
				oEmail = new EmailModel(),
				oOpenpgpKeyring = Data.openpgpKeyring,
				oOpenpgpKeys = oOpenpgpKeyring ? oOpenpgpKeyring.getAllKeys() : []
			;

			_.each(oOpenpgpKeys, function (oItem, iIndex) {
				if (oItem && oItem.primaryKey)
				{
					var

						oPrimaryUser = oItem.getPrimaryUser(),
						sUser = (oPrimaryUser && oPrimaryUser.user) ? oPrimaryUser.user.userId.userid
							: (oItem.users && oItem.users[0] ? oItem.users[0].userId.userid : '')
					;

					oEmail.clear();
					oEmail.mailsoParse(sUser);

					if (oEmail.validate())
					{
						aKeys.push(new OpenPgpKeyModel(
							iIndex,
							oItem.primaryKey.getFingerprint(),
							oItem.primaryKey.getKeyId().toHex().toLowerCase(),
							sUser,
							oEmail.email,
							oItem.isPrivate(),
							oItem.armor())
						);
					}
				}
			});

			Data.openpgpkeys(aKeys);
		}
	};

	RainLoopApp.prototype.accountsAndIdentities = function ()
	{
		Data.accountsLoading(true);
		Data.identitiesLoading(true);

		Remote.accountsAndIdentities(function (sResult, oData) {

			Data.accountsLoading(false);
			Data.identitiesLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData.Result)
			{
				var
					sParentEmail = RL.settingsGet('ParentEmail'),
					sAccountEmail = Data.accountEmail()
				;

				sParentEmail = '' === sParentEmail ? sAccountEmail : sParentEmail;

				if (Utils.isArray(oData.Result['Accounts']))
				{
					Data.accounts(_.map(oData.Result['Accounts'], function (sValue) {
						return new AccountModel(sValue, sValue !== sParentEmail);
					}));
				}

				if (Utils.isArray(oData.Result['Identities']))
				{
					Data.identities(_.map(oData.Result['Identities'], function (oIdentityData) {

						var
							sId = Utils.pString(oIdentityData['Id']),
							sEmail = Utils.pString(oIdentityData['Email']),
							oIdentity = new IdentityModel(sId, sEmail, sId !== sAccountEmail)
						;

						oIdentity.name(Utils.pString(oIdentityData['Name']));
						oIdentity.replyTo(Utils.pString(oIdentityData['ReplyTo']));
						oIdentity.bcc(Utils.pString(oIdentityData['Bcc']));

						return oIdentity;
					}));
				}
			}
		});
	};

	RainLoopApp.prototype.quota = function ()
	{
		this.remote().quota(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult &&	oData && oData.Result &&
				Utils.isArray(oData.Result) && 1 < oData.Result.length &&
				Utils.isPosNumeric(oData.Result[0], true) && Utils.isPosNumeric(oData.Result[1], true))
			{
				Data.userQuota(Utils.pInt(oData.Result[1]) * 1024);
				Data.userUsageSize(Utils.pInt(oData.Result[0]) * 1024);
			}
		});
	};

	/**
	 * @param {string} sFolder
	 * @param {Array=} aList = []
	 */
	RainLoopApp.prototype.folderInformation = function (sFolder, aList)
	{
		if ('' !== Utils.trim(sFolder))
		{
			this.remote().folderInformation(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.Hash && oData.Result.Folder)
					{
						var
							iUtc = moment().unix(),
							sHash = Cache.getFolderHash(oData.Result.Folder),
							oFolder = Cache.getFolderFromCacheList(oData.Result.Folder),
							bCheck = false,
							sUid = '',
							aList = [],
							bUnreadCountChange = false,
							oFlags = null
						;

						if (oFolder)
						{
							oFolder.interval = iUtc;

							if (oData.Result.Hash)
							{
								Cache.setFolderHash(oData.Result.Folder, oData.Result.Hash);
							}

							if (Utils.isNormal(oData.Result.MessageCount))
							{
								oFolder.messageCountAll(oData.Result.MessageCount);
							}

							if (Utils.isNormal(oData.Result.MessageUnseenCount))
							{
								if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oData.Result.MessageUnseenCount))
								{
									bUnreadCountChange = true;
								}

								oFolder.messageCountUnread(oData.Result.MessageUnseenCount);
							}

							if (bUnreadCountChange)
							{
								Cache.clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
							}

							if (oData.Result.Flags)
							{
								for (sUid in oData.Result.Flags)
								{
									if (oData.Result.Flags.hasOwnProperty(sUid))
									{
										bCheck = true;
										oFlags = oData.Result.Flags[sUid];
										Cache.storeMessageFlagsToCacheByFolderAndUid(oFolder.fullNameRaw, sUid.toString(), [
											!oFlags['IsSeen'], !!oFlags['IsFlagged'], !!oFlags['IsAnswered'], !!oFlags['IsForwarded'], !!oFlags['IsReadReceipt']
										]);
									}
								}

								if (bCheck)
								{
									RL.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							Data.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

							if (oData.Result.Hash !== sHash || '' === sHash)
							{
								if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
								{
									RL.reloadMessageList();
								}
								else if ('INBOX' === oFolder.fullNameRaw)
								{
									RL.recacheInboxMessageList();
								}
							}
							else if (bUnreadCountChange)
							{
								if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
								{
									aList = Data.messageList();
									if (Utils.isNonEmptyArray(aList))
									{
										RL.folderInformation(oFolder.fullNameRaw, aList);
									}
								}
							}
						}
					}
				}
			}, sFolder, aList);
		}
	};

	/**
	 * @param {boolean=} bBoot = false
	 */
	RainLoopApp.prototype.folderInformationMultiply = function (bBoot)
	{
		bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

		var
			iUtc = moment().unix(),
			aFolders = Data.getNextFolderNames(bBoot)
		;

		if (Utils.isNonEmptyArray(aFolders))
		{
			this.remote().folderInformationMultiply(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.List && Utils.isNonEmptyArray(oData.Result.List))
					{
						_.each(oData.Result.List, function (oItem) {

							var
								aList = [],
								sHash = Cache.getFolderHash(oItem.Folder),
								oFolder = Cache.getFolderFromCacheList(oItem.Folder),
								bUnreadCountChange = false
							;

							if (oFolder)
							{
								oFolder.interval = iUtc;

								if (oItem.Hash)
								{
									Cache.setFolderHash(oItem.Folder, oItem.Hash);
								}

								if (Utils.isNormal(oItem.MessageCount))
								{
									oFolder.messageCountAll(oItem.MessageCount);
								}

								if (Utils.isNormal(oItem.MessageUnseenCount))
								{
									if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oItem.MessageUnseenCount))
									{
										bUnreadCountChange = true;
									}

									oFolder.messageCountUnread(oItem.MessageUnseenCount);
								}

								if (bUnreadCountChange)
								{
									Cache.clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
								}

								if (oItem.Hash !== sHash || '' === sHash)
								{
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										RL.reloadMessageList();
									}
								}
								else if (bUnreadCountChange)
								{
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										aList = Data.messageList();
										if (Utils.isNonEmptyArray(aList))
										{
											RL.folderInformation(oFolder.fullNameRaw, aList);
										}
									}
								}
							}
						});

						if (bBoot)
						{
							RL.folderInformationMultiply(true);
						}
					}
				}
			}, aFolders);
		}
	};

	RainLoopApp.prototype.setMessageSeen = function (oMessage)
	{
		if (oMessage.unseen())
		{
			oMessage.unseen(false);

			var oFolder = Cache.getFolderFromCacheList(oMessage.folderFullNameRaw);
			if (oFolder)
			{
				oFolder.messageCountUnread(0 <= oFolder.messageCountUnread() - 1 ?
					oFolder.messageCountUnread() - 1 : 0);
			}

			Cache.storeMessageFlagsToCache(oMessage);
			RL.reloadFlagsCurrentMessageListAndMessageFromCache();
		}

		Remote.messageSetSeen(Utils.emptyFunction, oMessage.folderFullNameRaw, [oMessage.uid], true);
	};

	RainLoopApp.prototype.googleConnect = function ()
	{
		window.open(LinkBuilder.socialGoogle(), 'Google', 'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	RainLoopApp.prototype.twitterConnect = function ()
	{
		window.open(LinkBuilder.socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	RainLoopApp.prototype.facebookConnect = function ()
	{
		window.open(LinkBuilder.socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	/**
	 * @param {boolean=} bFireAllActions
	 */
	RainLoopApp.prototype.socialUsers = function (bFireAllActions)
	{
		if (bFireAllActions)
		{
			Data.googleActions(true);
			Data.facebookActions(true);
			Data.twitterActions(true);
		}

		Remote.socialUsers(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.googleUserName(oData.Result['Google'] || '');
				Data.facebookUserName(oData.Result['Facebook'] || '');
				Data.twitterUserName(oData.Result['Twitter'] || '');
			}
			else
			{
				Data.googleUserName('');
				Data.facebookUserName('');
				Data.twitterUserName('');
			}

			Data.googleLoggined('' !== Data.googleUserName());
			Data.facebookLoggined('' !== Data.facebookUserName());
			Data.twitterLoggined('' !== Data.twitterUserName());

			Data.googleActions(false);
			Data.facebookActions(false);
			Data.twitterActions(false);
		});
	};

	RainLoopApp.prototype.googleDisconnect = function ()
	{
		Data.googleActions(true);
		Remote.googleDisconnect(function () {
			RL.socialUsers();
		});
	};

	RainLoopApp.prototype.facebookDisconnect = function ()
	{
		Data.facebookActions(true);
		Remote.facebookDisconnect(function () {
			RL.socialUsers();
		});
	};

	RainLoopApp.prototype.twitterDisconnect = function ()
	{
		Data.twitterActions(true);
		Remote.twitterDisconnect(function () {
			RL.socialUsers();
		});
	};

	/**
	 * @param {Array} aSystem
	 * @param {Array} aList
	 * @param {Array=} aDisabled
	 * @param {Array=} aHeaderLines
	 * @param {?number=} iUnDeep
	 * @param {Function=} fDisableCallback
	 * @param {Function=} fVisibleCallback
	 * @param {Function=} fRenameCallback
	 * @param {boolean=} bSystem
	 * @param {boolean=} bBuildUnvisible
	 * @return {Array}
	 */
	RainLoopApp.prototype.folderListOptionsBuilder = function (aSystem, aList, aDisabled, aHeaderLines, iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
	{
		var
			iIndex = 0,
			iLen = 0,
			/**
			 * @type {?FolderModel}
			 */
			oItem = null,
			bSep = false,
			sDeepPrefix = '\u00A0\u00A0\u00A0',
			aResult = []
		;

		bSystem = !Utils.isNormal(bSystem) ? 0 < aSystem.length : bSystem;
		bBuildUnvisible = Utils.isUnd(bBuildUnvisible) ? false : !!bBuildUnvisible;
		iUnDeep = !Utils.isNormal(iUnDeep) ? 0 : iUnDeep;
		fDisableCallback = Utils.isNormal(fDisableCallback) ? fDisableCallback : null;
		fVisibleCallback = Utils.isNormal(fVisibleCallback) ? fVisibleCallback : null;
		fRenameCallback = Utils.isNormal(fRenameCallback) ? fRenameCallback : null;

		if (!Utils.isArray(aDisabled))
		{
			aDisabled = [];
		}

		if (!Utils.isArray(aHeaderLines))
		{
			aHeaderLines = [];
		}

		for (iIndex = 0, iLen = aHeaderLines.length; iIndex < iLen; iIndex++)
		{
			aResult.push({
				'id': aHeaderLines[iIndex][0],
				'name': aHeaderLines[iIndex][1],
				'system': false,
				'seporator': false,
				'disabled': false
			});
		}

		bSep = true;
		for (iIndex = 0, iLen = aSystem.length; iIndex < iLen; iIndex++)
		{
			oItem = aSystem[iIndex];
			if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
			{
				if (bSep && 0 < aResult.length)
				{
					aResult.push({
						'id': '---',
						'name': '---',
						'system': false,
						'seporator': true,
						'disabled': true
					});
				}

				bSep = false;
				aResult.push({
					'id': oItem.fullNameRaw,
					'name': fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name(),
					'system': true,
					'seporator': false,
					'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
						(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
				});
			}
		}

		bSep = true;
		for (iIndex = 0, iLen = aList.length; iIndex < iLen; iIndex++)
		{
			oItem = aList[iIndex];
			if (oItem.subScribed() || !oItem.existen)
			{
				if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
				{
					if (Enums.FolderType.User === oItem.type() || !bSystem || 0 < oItem.subFolders().length)
					{
						if (bSep && 0 < aResult.length)
						{
							aResult.push({
								'id': '---',
								'name': '---',
								'system': false,
								'seporator': true,
								'disabled': true
							});
						}

						bSep = false;
						aResult.push({
							'id': oItem.fullNameRaw,
							'name': (new window.Array(oItem.deep + 1 - iUnDeep)).join(sDeepPrefix) +
								(fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name()),
							'system': false,
							'seporator': false,
							'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
								(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
						});
					}
				}
			}

			if (oItem.subScribed() && 0 < oItem.subFolders().length)
			{
				aResult = aResult.concat(RL.folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
					iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
			}
		}

		return aResult;
	};

	/**
	 * @param {string} sQuery
	 * @param {Function} fCallback
	 */
	RainLoopApp.prototype.getAutocomplete = function (sQuery, fCallback)
	{
		var
			aData = []
		;

		Remote.suggestions(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult && oData && Utils.isArray(oData.Result))
			{
				aData = _.map(oData.Result, function (aItem) {
					return aItem && aItem[0] ? new EmailModel(aItem[0], aItem[1]) : null;
				});

				fCallback(_.compact(aData));
			}
			else if (Enums.StorageResultType.Abort !== sResult)
			{
				fCallback([]);
			}

		}, sQuery);
	};

	/**
	 * @param {string} sQuery
	 * @param {Function} fCallback
	 */
	RainLoopApp.prototype.getContactTagsAutocomplete = function (sQuery, fCallback)
	{
		fCallback(_.filter(Data.contactTags(), function (oContactTag) {
			return oContactTag && oContactTag.filterHelper(sQuery);
		}));
	};

	/**
	 * @param {string} sMailToUrl
	 * @returns {boolean}
	 */
	RainLoopApp.prototype.mailToHelper = function (sMailToUrl)
	{
		if (sMailToUrl && 'mailto:' === sMailToUrl.toString().substr(0, 7).toLowerCase())
		{
			sMailToUrl = sMailToUrl.toString().substr(7);

			var
				oParams = {},
				oEmailModel = null,
				sEmail = sMailToUrl.replace(/\?.+$/, ''),
				sQueryString = sMailToUrl.replace(/^[^\?]*\?/, '')
			;

			oEmailModel = new EmailModel();
			oEmailModel.parse(window.decodeURIComponent(sEmail));

			if (oEmailModel && oEmailModel.email)
			{
				oParams = Utils.simpleQueryParser(sQueryString);
				kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Empty, null, [oEmailModel],
					Utils.isUnd(oParams.subject) ? null : Utils.pString(oParams.subject),
					Utils.isUnd(oParams.body) ? null : Utils.plainToHtml(Utils.pString(oParams.body))
				]);
			}

			return true;
		}

		return false;
	};

	RainLoopApp.prototype.bootstart = function ()
	{
		RL.pub('rl.bootstart');
		AbstractApp.prototype.bootstart.call(this);

		Data.populateDataOnStart();

		var
			sCustomLoginLink = '',
			sJsHash = RL.settingsGet('JsHash'),
			iContactsSyncInterval = Utils.pInt(RL.settingsGet('ContactsSyncInterval')),
			bGoogle = RL.settingsGet('AllowGoogleSocial'),
			bFacebook = RL.settingsGet('AllowFacebookSocial'),
			bTwitter = RL.settingsGet('AllowTwitterSocial')
		;

		if (!RL.settingsGet('ChangePasswordIsAllowed'))
		{
			kn.removeSettingsViewModel(SettingsChangePasswordScreen);
		}

		if (!RL.settingsGet('ContactsIsAllowed'))
		{
			kn.removeSettingsViewModel(SettingsContacts);
		}

		if (!RL.capa(Enums.Capa.AdditionalAccounts))
		{
			kn.removeSettingsViewModel(SettingsAccounts);
		}

		if (RL.capa(Enums.Capa.AdditionalIdentities))
		{
			kn.removeSettingsViewModel(SettingsIdentity);
		}
		else
		{
			kn.removeSettingsViewModel(SettingsIdentities);
		}

		if (!RL.capa(Enums.Capa.OpenPGP))
		{
			kn.removeSettingsViewModel(SettingsOpenPGP);
		}

		if (!RL.capa(Enums.Capa.TwoFactor))
		{
			kn.removeSettingsViewModel(SettingsSecurity);
		}

		if (!RL.capa(Enums.Capa.Themes))
		{
			kn.removeSettingsViewModel(SettingsThemes);
		}

		if (!RL.capa(Enums.Capa.Filters))
		{
			kn.removeSettingsViewModel(SettingsFilters);
		}

		if (!bGoogle && !bFacebook && !bTwitter)
		{
			kn.removeSettingsViewModel(SettingsSocialScreen);
		}

		Utils.initOnStartOrLangChange(function () {

			$.extend(true, $.magnificPopup.defaults, {
				'tClose': Utils.i18n('MAGNIFIC_POPUP/CLOSE'),
				'tLoading': Utils.i18n('MAGNIFIC_POPUP/LOADING'),
				'gallery': {
					'tPrev': Utils.i18n('MAGNIFIC_POPUP/GALLERY_PREV'),
					'tNext': Utils.i18n('MAGNIFIC_POPUP/GALLERY_NEXT'),
					'tCounter': Utils.i18n('MAGNIFIC_POPUP/GALLERY_COUNTER')
				},
				'image': {
					'tError': Utils.i18n('MAGNIFIC_POPUP/IMAGE_ERROR')
				},
				'ajax': {
					'tError': Utils.i18n('MAGNIFIC_POPUP/AJAX_ERROR')
				}
			});

		}, this);

		if (window.SimplePace)
		{
			window.SimplePace.set(70);
			window.SimplePace.sleep();
		}

		if (!!RL.settingsGet('Auth'))
		{
			this.setTitle(Utils.i18n('TITLES/LOADING'));

			this.folders(_.bind(function (bValue) {

				kn.hideLoading();

				if (bValue)
				{
					if (window.$LAB && window.crypto && window.crypto.getRandomValues && RL.capa(Enums.Capa.OpenPGP))
					{
						window.$LAB.script(window.openpgp ? '' : LinkBuilder.openPgpJs()).wait(function () {
							if (window.openpgp)
							{
								Data.openpgpKeyring = new window.openpgp.Keyring();
								Data.capaOpenPGP(true);

								RL.pub('openpgp.init');

								RL.reloadOpenPgpKeys();
							}
						});
					}
					else
					{
						Data.capaOpenPGP(false);
					}

					kn.startScreens([MailBoxScreen, SettingsScreen]);

					if (bGoogle || bFacebook || bTwitter)
					{
						RL.socialUsers(true);
					}

					RL.sub('interval.2m', function () {
						RL.folderInformation('INBOX');
					});

					RL.sub('interval.2m', function () {
						var sF = Data.currentFolderFullNameRaw();
						if ('INBOX' !== sF)
						{
							RL.folderInformation(sF);
						}
					});

					RL.sub('interval.3m', function () {
						RL.folderInformationMultiply();
					});

					RL.sub('interval.5m', function () {
						RL.quota();
					});

					RL.sub('interval.10m', function () {
						RL.folders();
					});

					iContactsSyncInterval = 5 <= iContactsSyncInterval ? iContactsSyncInterval : 20;
					iContactsSyncInterval = 320 >= iContactsSyncInterval ? iContactsSyncInterval : 320;

					window.setInterval(function () {
						RL.contactsSync();
					}, iContactsSyncInterval * 60000 + 5000);

					_.delay(function () {
						RL.contactsSync();
					}, 5000);

					_.delay(function () {
						RL.folderInformationMultiply(true);
					}, 500);

					Plugins.runHook('rl-start-user-screens');
					RL.pub('rl.bootstart-user-screens');

					if (!!RL.settingsGet('AccountSignMe') && window.navigator.registerProtocolHandler)
					{
						_.delay(function () {
							try {
								window.navigator.registerProtocolHandler('mailto',
									window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
									'' + (RL.settingsGet('Title') || 'RainLoop'));
							} catch(e) {}

							if (RL.settingsGet('MailToEmail'))
							{
								RL.mailToHelper(RL.settingsGet('MailToEmail'));
							}
						}, 500);
					}
				}
				else
				{
					kn.startScreens([LoginScreen]);

					Plugins.runHook('rl-start-login-screens');
					RL.pub('rl.bootstart-login-screens');
				}

				if (window.SimplePace)
				{
					window.SimplePace.set(100);
				}

				if (!Globals.bMobileDevice)
				{
					_.defer(function () {
						Utils.initLayoutResizer('#rl-left', '#rl-right', Enums.ClientSideKeyName.FolderListSize);
					});
				}

			}, this));
		}
		else
		{
			sCustomLoginLink = Utils.pString(RL.settingsGet('CustomLoginLink'));
			if (!sCustomLoginLink)
			{
				kn.hideLoading();
				kn.startScreens([LoginScreen]);

				Plugins.runHook('rl-start-login-screens');
				RL.pub('rl.bootstart-login-screens');

				if (window.SimplePace)
				{
					window.SimplePace.set(100);
				}
			}
			else
			{
				kn.routeOff();
				kn.setHash(LinkBuilder.root(), true);
				kn.routeOff();

				_.defer(function () {
					window.location.href = sCustomLoginLink;
				});
			}
		}

		if (bGoogle)
		{
			window['rl_' + sJsHash + '_google_service'] = function () {
				Data.googleActions(true);
				RL.socialUsers();
			};
		}

		if (bFacebook)
		{
			window['rl_' + sJsHash + '_facebook_service'] = function () {
				Data.facebookActions(true);
				RL.socialUsers();
			};
		}

		if (bTwitter)
		{
			window['rl_' + sJsHash + '_twitter_service'] = function () {
				Data.twitterActions(true);
				RL.socialUsers();
			};
		}

		RL.sub('interval.1m', function () {
			Globals.momentTrigger(!Globals.momentTrigger());
		});

		Plugins.runHook('rl-start-screens');
		RL.pub('rl.bootstart-end');
	};

	module.exports = new RainLoopApp();

}(module));
},{"../Common/Consts.js":4,"../Common/Enums.js":5,"../Common/Globals.js":6,"../Common/LinkBuilder.js":7,"../Common/Plugins.js":8,"../Common/Utils.js":9,"../External/jquery.js":19,"../External/moment.js":22,"../External/underscore.js":24,"../External/window.js":25,"../Knoin/Knoin.js":26,"../Storages/WebMailAjaxRemoteStorage.js":39,"../Storages/WebMailCacheStorage.js":40,"../Storages/WebMailDataStorage.js":41,"../ViewModels/Popups/PopupsAskViewModel.js":42,"./AbstractApp.js":2}],4:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var Consts = {};

	Consts.Values = {};
	Consts.DataImages = {};
	Consts.Defaults = {};

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.MessagesPerPage = 20;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.ContactsPerPage = 50;

	/**
	 * @const
	 * @type {Array}
	 */
	Consts.Defaults.MessagesPerPageArray = [10, 20, 30, 50, 100/*, 150, 200, 300*/];

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.DefaultAjaxTimeout = 30000;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.SearchAjaxTimeout = 300000;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.SendMessageAjaxTimeout = 300000;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.SaveMessageAjaxTimeout = 200000;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Defaults.ContactsSyncAjaxTimeout = 200000;

	/**
	 * @const
	 * @type {string}
	 */
	Consts.Values.UnuseOptionValue = '__UNUSE__';

	/**
	 * @const
	 * @type {string}
	 */
	Consts.Values.ClientSideCookieIndexName = 'rlcsc';

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.ImapDefaulPort = 143;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.ImapDefaulSecurePort = 993;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.SmtpDefaulPort = 25;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.SmtpDefaulSecurePort = 465;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.MessageBodyCacheLimit = 15;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.AjaxErrorLimit = 7;

	/**
	 * @const
	 * @type {number}
	 */
	Consts.Values.TokenErrorLimit = 10;

	/**
	 * @const
	 * @type {string}
	 */
	Consts.DataImages.UserDotPic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2P8DwQACgAD/il4QJ8AAAAASUVORK5CYII=';

	/**
	 * @const
	 * @type {string}
	 */
	Consts.DataImages.TranspPic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=';

	module.exports = Consts;

}(module));
},{}],5:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var Enums = {};

	/**
	 * @enum {string}
	 */
	Enums.StorageResultType = {
		'Success': 'success',
		'Abort': 'abort',
		'Error': 'error',
		'Unload': 'unload'
	};

	/**
	 * @enum {number}
	 */
	Enums.State = {
		'Empty': 10,
		'Login': 20,
		'Auth': 30
	};

	/**
	 * @enum {number}
	 */
	Enums.StateType = {
		'Webmail': 0,
		'Admin': 1
	};

	/**
	 * @enum {string}
	 */
	Enums.Capa = {
		'Prem': 'PREM',
		'TwoFactor': 'TWO_FACTOR',
		'OpenPGP': 'OPEN_PGP',
		'Prefetch': 'PREFETCH',
		'Gravatar': 'GRAVATAR',
		'Themes': 'THEMES',
		'Filters': 'FILTERS',
		'AdditionalAccounts': 'ADDITIONAL_ACCOUNTS',
		'AdditionalIdentities': 'ADDITIONAL_IDENTITIES'
	};

	/**
	 * @enum {string}
	 */
	Enums.KeyState = {
		'All': 'all',
		'None': 'none',
		'ContactList': 'contact-list',
		'MessageList': 'message-list',
		'FolderList': 'folder-list',
		'MessageView': 'message-view',
		'Compose': 'compose',
		'Settings': 'settings',
		'Menu': 'menu',
		'PopupComposeOpenPGP': 'compose-open-pgp',
		'PopupKeyboardShortcutsHelp': 'popup-keyboard-shortcuts-help',
		'PopupAsk': 'popup-ask'
	};

	/**
	 * @enum {number}
	 */
	Enums.FolderType = {
		'Inbox': 10,
		'SentItems': 11,
		'Draft': 12,
		'Trash': 13,
		'Spam': 14,
		'Archive': 15,
		'NotSpam': 80,
		'User': 99
	};

	/**
	 * @enum {string}
	 */
	Enums.LoginSignMeTypeAsString = {
		'DefaultOff': 'defaultoff',
		'DefaultOn': 'defaulton',
		'Unused': 'unused'
	};

	/**
	 * @enum {number}
	 */
	Enums.LoginSignMeType = {
		'DefaultOff': 0,
		'DefaultOn': 1,
		'Unused': 2
	};

	/**
	 * @enum {string}
	 */
	Enums.ComposeType = {
		'Empty': 'empty',
		'Reply': 'reply',
		'ReplyAll': 'replyall',
		'Forward': 'forward',
		'ForwardAsAttachment': 'forward-as-attachment',
		'Draft': 'draft',
		'EditAsNew': 'editasnew'
	};

	/**
	 * @enum {number}
	 */
	Enums.UploadErrorCode = {
		'Normal': 0,
		'FileIsTooBig': 1,
		'FilePartiallyUploaded': 2,
		'FileNoUploaded': 3,
		'MissingTempFolder': 4,
		'FileOnSaveingError': 5,
		'FileType': 98,
		'Unknown': 99
	};

	/**
	 * @enum {number}
	 */
	Enums.SetSystemFoldersNotification = {
		'None': 0,
		'Sent': 1,
		'Draft': 2,
		'Spam': 3,
		'Trash': 4,
		'Archive': 5
	};

	/**
	 * @enum {number}
	 */
	Enums.ClientSideKeyName = {
		'FoldersLashHash': 0,
		'MessagesInboxLastHash': 1,
		'MailBoxListSize': 2,
		'ExpandedFolders': 3,
		'FolderListSize': 4
	};

	/**
	 * @enum {number}
	 */
	Enums.EventKeyCode = {
		'Backspace': 8,
		'Tab': 9,
		'Enter': 13,
		'Esc': 27,
		'PageUp': 33,
		'PageDown': 34,
		'Left': 37,
		'Right': 39,
		'Up': 38,
		'Down': 40,
		'End': 35,
		'Home': 36,
		'Space': 32,
		'Insert': 45,
		'Delete': 46,
		'A': 65,
		'S': 83
	};

	/**
	 * @enum {number}
	 */
	Enums.MessageSetAction = {
		'SetSeen': 0,
		'UnsetSeen': 1,
		'SetFlag': 2,
		'UnsetFlag': 3
	};

	/**
	 * @enum {number}
	 */
	Enums.MessageSelectAction = {
		'All': 0,
		'None': 1,
		'Invert': 2,
		'Unseen': 3,
		'Seen': 4,
		'Flagged': 5,
		'Unflagged': 6
	};

	/**
	 * @enum {number}
	 */
	Enums.DesktopNotifications = {
		'Allowed': 0,
		'NotAllowed': 1,
		'Denied': 2,
		'NotSupported': 9
	};

	/**
	 * @enum {number}
	 */
	Enums.MessagePriority = {
		'Low': 5,
		'Normal': 3,
		'High': 1
	};

	/**
	 * @enum {string}
	 */
	Enums.EditorDefaultType = {
		'Html': 'Html',
		'Plain': 'Plain'
	};

	/**
	 * @enum {string}
	 */
	Enums.CustomThemeType = {
		'Light': 'Light',
		'Dark': 'Dark'
	};

	/**
	 * @enum {number}
	 */
	Enums.ServerSecure = {
		'None': 0,
		'SSL': 1,
		'TLS': 2
	};

	/**
	 * @enum {number}
	 */
	Enums.SearchDateType = {
		'All': -1,
		'Days3': 3,
		'Days7': 7,
		'Month': 30
	};

	/**
	 * @enum {number}
	 */
	Enums.EmailType = {
		'Defailt': 0,
		'Facebook': 1,
		'Google': 2
	};

	/**
	 * @enum {number}
	 */
	Enums.SaveSettingsStep = {
		'Animate': -2,
		'Idle': -1,
		'TrueResult': 1,
		'FalseResult': 0
	};

	/**
	 * @enum {string}
	 */
	Enums.InterfaceAnimation = {
		'None': 'None',
		'Normal': 'Normal',
		'Full': 'Full'
	};

	/**
	 * @enum {number}
	 */
	Enums.Layout = {
		'NoPreview': 0,
		'SidePreview': 1,
		'BottomPreview': 2
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterConditionField = {
		'From': 'From',
		'To': 'To',
		'Recipient': 'Recipient',
		'Subject': 'Subject'
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterConditionType = {
		'Contains': 'Contains',
		'NotContains': 'NotContains',
		'EqualTo': 'EqualTo',
		'NotEqualTo': 'NotEqualTo'
	};

	/**
	 * @enum {string}
	 */
	Enums.FiltersAction = {
		'None': 'None',
		'Move': 'Move',
		'Discard': 'Discard',
		'Forward': 'Forward',
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterRulesType = {
		'And': 'And',
		'Or': 'Or'
	};

	/**
	 * @enum {number}
	 */
	Enums.SignedVerifyStatus = {
		'UnknownPublicKeys': -4,
		'UnknownPrivateKey': -3,
		'Unverified': -2,
		'Error': -1,
		'None': 0,
		'Success': 1
	};

	/**
	 * @enum {number}
	 */
	Enums.ContactPropertyType = {

		'Unknown': 0,

		'FullName': 10,

		'FirstName': 15,
		'LastName': 16,
		'MiddleName': 16,
		'Nick': 18,

		'NamePrefix': 20,
		'NameSuffix': 21,

		'Email': 30,
		'Phone': 31,
		'Web': 32,

		'Birthday': 40,

		'Facebook': 90,
		'Skype': 91,
		'GitHub': 92,

		'Note': 110,

		'Custom': 250
	};

	/**
	 * @enum {number}
	 */
	Enums.Notification = {
		'InvalidToken': 101,
		'AuthError': 102,
		'AccessError': 103,
		'ConnectionError': 104,
		'CaptchaError': 105,
		'SocialFacebookLoginAccessDisable': 106,
		'SocialTwitterLoginAccessDisable': 107,
		'SocialGoogleLoginAccessDisable': 108,
		'DomainNotAllowed': 109,
		'AccountNotAllowed': 110,

		'AccountTwoFactorAuthRequired': 120,
		'AccountTwoFactorAuthError': 121,

		'CouldNotSaveNewPassword': 130,
		'CurrentPasswordIncorrect': 131,
		'NewPasswordShort': 132,
		'NewPasswordWeak': 133,
		'NewPasswordForbidden': 134,

		'ContactsSyncError': 140,

		'CantGetMessageList': 201,
		'CantGetMessage': 202,
		'CantDeleteMessage': 203,
		'CantMoveMessage': 204,
		'CantCopyMessage': 205,

		'CantSaveMessage': 301,
		'CantSendMessage': 302,
		'InvalidRecipients': 303,

		'CantCreateFolder': 400,
		'CantRenameFolder': 401,
		'CantDeleteFolder': 402,
		'CantSubscribeFolder': 403,
		'CantUnsubscribeFolder': 404,
		'CantDeleteNonEmptyFolder': 405,

		'CantSaveSettings': 501,
		'CantSavePluginSettings': 502,

		'DomainAlreadyExists': 601,

		'CantInstallPackage': 701,
		'CantDeletePackage': 702,
		'InvalidPluginPackage': 703,
		'UnsupportedPluginPackage': 704,

		'LicensingServerIsUnavailable': 710,
		'LicensingExpired': 711,
		'LicensingBanned': 712,

		'DemoSendMessageError': 750,

		'AccountAlreadyExists': 801,

		'MailServerError': 901,
		'ClientViewError': 902,
		'InvalidInputArgument': 903,
		'UnknownNotification': 999,
		'UnknownError': 999
	};

	module.exports = Enums;

}(module));
},{}],6:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Globals = {},
		window = require('../External/window.js'),
		ko = require('../External/ko.js'),
		$html = require('../External/$html.js')
	;

	/**
	 * @type {?}
	 */
	Globals.now = (new window.Date()).getTime();

	/**
	 * @type {?}
	 */
	Globals.momentTrigger = ko.observable(true);

	/**
	 * @type {?}
	 */
	Globals.dropdownVisibility = ko.observable(false).extend({'rateLimit': 0});

	/**
	 * @type {?}
	 */
	Globals.tooltipTrigger = ko.observable(false).extend({'rateLimit': 0});

	/**
	 * @type {?}
	 */
	Globals.langChangeTrigger = ko.observable(true);

	/**
	 * @type {number}
	 */
	Globals.iAjaxErrorCount = 0;

	/**
	 * @type {number}
	 */
	Globals.iTokenErrorCount = 0;

	/**
	 * @type {number}
	 */
	Globals.iMessageBodyCacheCount = 0;

	/**
	 * @type {boolean}
	 */
	Globals.bUnload = false;

	/**
	 * @type {string}
	 */
	Globals.sUserAgent = (window.navigator.userAgent || '').toLowerCase();

	/**
	 * @type {boolean}
	 */
	Globals.bIsiOSDevice = -1 < Globals.sUserAgent.indexOf('iphone') || -1 < Globals.sUserAgent.indexOf('ipod') || -1 < Globals.sUserAgent.indexOf('ipad');

	/**
	 * @type {boolean}
	 */
	Globals.bIsAndroidDevice = -1 < Globals.sUserAgent.indexOf('android');

	/**
	 * @type {boolean}
	 */
	Globals.bMobileDevice = Globals.bIsiOSDevice || Globals.bIsAndroidDevice;

	/**
	 * @type {boolean}
	 */
	Globals.bDisableNanoScroll = Globals.bMobileDevice;

	/**
	 * @type {boolean}
	 */
	Globals.bAllowPdfPreview = !Globals.bMobileDevice;

	/**
	 * @type {boolean}
	 */
	Globals.bAnimationSupported = !Globals.bMobileDevice && $html.hasClass('csstransitions');

	/**
	 * @type {boolean}
	 */
	Globals.bXMLHttpRequestSupported = !!window.XMLHttpRequest;

	/**
	 * @type {string}
	 */
	Globals.sAnimationType = '';

	/**
	 * @type {Object}
	 */
	Globals.oHtmlEditorDefaultConfig = {
		'title': false,
		'stylesSet': false,
		'customConfig': '',
		'contentsCss': '',
		'toolbarGroups': [
			{name: 'spec'},
			{name: 'styles'},
			{name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
			{name: 'colors'},
			{name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align']},
			{name: 'links'},
			{name: 'insert'},
			{name: 'others'}
	//		{name: 'document', groups: ['mode', 'document', 'doctools']}
		],

		'removePlugins': 'contextmenu', //blockquote
		'removeButtons': 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll',
		'removeDialogTabs': 'link:advanced;link:target;image:advanced;images:advanced',

		'extraPlugins': 'plain',

		'allowedContent': true,
		'autoParagraph': false,

		'font_defaultLabel': 'Arial',
		'fontSize_defaultLabel': '13',
		'fontSize_sizes': '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px'
	};

	/**
	 * @type {Object}
	 */
	Globals.oHtmlEditorLangsMap = {
		'de': 'de',
		'es': 'es',
		'fr': 'fr',
		'hu': 'hu',
		'is': 'is',
		'it': 'it',
		'ko': 'ko',
		'ko-kr': 'ko',
		'lv': 'lv',
		'nl': 'nl',
		'no': 'no',
		'pl': 'pl',
		'pt': 'pt',
		'pt-pt': 'pt',
		'pt-br': 'pt-br',
		'ru': 'ru',
		'ro': 'ro',
		'zh': 'zh',
		'zh-cn': 'zh-cn'
	};

	if (Globals.bAllowPdfPreview && window.navigator && window.navigator.mimeTypes)
	{
		Globals.bAllowPdfPreview = !!_.find(window.navigator.mimeTypes, function (oType) {
			return oType && 'application/pdf' === oType.type;
		});
	}

	Globals.oI18N = {},
	
	Globals.oNotificationI18N = {},
	
	Globals.aBootstrapDropdowns = [],
	
	Globals.aViewModels = {
		'settings': [],
		'settings-removed': [],
		'settings-disabled': []
	};
	
	module.exports = Globals;

}(module));
},{"../External/$html.js":12,"../External/ko.js":21,"../External/window.js":25}],7:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		Utils = require('./Utils.js')
	;
	
	/**
	 * @constructor
	 */
	function LinkBuilder()
	{
		this.sBase = '#/';
		this.sServer = './?';
		this.sVersion = RL.settingsGet('Version');
		this.sSpecSuffix = RL.settingsGet('AuthAccountHash') || '0';
		this.sStaticPrefix = RL.settingsGet('StaticPrefix') || 'rainloop/v/' + this.sVersion + '/static/';
	}

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.root = function ()
	{
		return this.sBase;
	};

	/**
	 * @param {string} sDownload
	 * @return {string}
	 */
	LinkBuilder.prototype.attachmentDownload = function (sDownload)
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/Download/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @return {string}
	 */
	LinkBuilder.prototype.attachmentPreview = function (sDownload)
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/View/' + sDownload;
	};

	/**
	 * @param {string} sDownload
	 * @return {string}
	 */
	LinkBuilder.prototype.attachmentPreviewAsPlain = function (sDownload)
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/ViewAsPlain/' + sDownload;
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.upload = function ()
	{
		return this.sServer + '/Upload/' + this.sSpecSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.uploadContacts = function ()
	{
		return this.sServer + '/UploadContacts/' + this.sSpecSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.uploadBackground = function ()
	{
		return this.sServer + '/UploadBackground/' + this.sSpecSuffix + '/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.append = function ()
	{
		return this.sServer + '/Append/' + this.sSpecSuffix + '/';
	};

	/**
	 * @param {string} sEmail
	 * @return {string}
	 */
	LinkBuilder.prototype.change = function (sEmail)
	{
		return this.sServer + '/Change/' + this.sSpecSuffix + '/' + window.encodeURIComponent(sEmail) + '/';
	};

	/**
	 * @param {string=} sAdd
	 * @return {string}
	 */
	LinkBuilder.prototype.ajax = function (sAdd)
	{
		return this.sServer + '/Ajax/' + this.sSpecSuffix + '/' + sAdd;
	};

	/**
	 * @param {string} sRequestHash
	 * @return {string}
	 */
	LinkBuilder.prototype.messageViewLink = function (sRequestHash)
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/ViewAsPlain/' + sRequestHash;
	};

	/**
	 * @param {string} sRequestHash
	 * @return {string}
	 */
	LinkBuilder.prototype.messageDownloadLink = function (sRequestHash)
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/Download/' + sRequestHash;
	};

	/**
	 * @param {string} sEmail
	 * @return {string}
	 */
	LinkBuilder.prototype.avatarLink = function (sEmail)
	{
		return this.sServer + '/Raw/0/Avatar/' + window.encodeURIComponent(sEmail) + '/';
	//	return '//secure.gravatar.com/avatar/' + Utils.md5(sEmail.toLowerCase()) + '.jpg?s=80&d=mm';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.inbox = function ()
	{
		return this.sBase + 'mailbox/Inbox';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.messagePreview = function ()
	{
		return this.sBase + 'mailbox/message-preview';
	};

	/**
	 * @param {string=} sScreenName
	 * @return {string}
	 */
	LinkBuilder.prototype.settings = function (sScreenName)
	{
		var sResult = this.sBase + 'settings';
		if (!Utils.isUnd(sScreenName) && '' !== sScreenName)
		{
			sResult += '/' + sScreenName;
		}

		return sResult;
	};

	/**
	 * @param {string} sScreenName
	 * @return {string}
	 */
	LinkBuilder.prototype.admin = function (sScreenName)
	{
		var sResult = this.sBase;
		switch (sScreenName) {
		case 'AdminDomains':
			sResult += 'domains';
			break;
		case 'AdminSecurity':
			sResult += 'security';
			break;
		case 'AdminLicensing':
			sResult += 'licensing';
			break;
		}

		return sResult;
	};

	/**
	 * @param {string} sFolder
	 * @param {number=} iPage = 1
	 * @param {string=} sSearch = ''
	 * @return {string}
	 */
	LinkBuilder.prototype.mailBox = function (sFolder, iPage, sSearch)
	{
		iPage = Utils.isNormal(iPage) ? Utils.pInt(iPage) : 1;
		sSearch = Utils.pString(sSearch);

		var sResult = this.sBase + 'mailbox/';
		if ('' !== sFolder)
		{
			sResult += encodeURI(sFolder);
		}
		if (1 < iPage)
		{
			sResult = sResult.replace(/[\/]+$/, '');
			sResult += '/p' + iPage;
		}
		if ('' !== sSearch)
		{
			sResult = sResult.replace(/[\/]+$/, '');
			sResult += '/' + encodeURI(sSearch);
		}

		return sResult;
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.phpInfo = function ()
	{
		return this.sServer + 'Info';
	};

	/**
	 * @param {string} sLang
	 * @return {string}
	 */
	LinkBuilder.prototype.langLink = function (sLang)
	{
		return this.sServer + '/Lang/0/' + encodeURI(sLang) + '/' + this.sVersion + '/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.exportContactsVcf = function ()
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/ContactsVcf/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.exportContactsCsv = function ()
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/ContactsCsv/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.emptyContactPic = function ()
	{
		return this.sStaticPrefix + 'css/images/empty-contact.png';
	};

	/**
	 * @param {string} sFileName
	 * @return {string}
	 */
	LinkBuilder.prototype.sound = function (sFileName)
	{
		return  this.sStaticPrefix + 'sounds/' + sFileName;
	};

	/**
	 * @param {string} sTheme
	 * @return {string}
	 */
	LinkBuilder.prototype.themePreviewLink = function (sTheme)
	{
		var sPrefix = 'rainloop/v/' + this.sVersion + '/';
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
			sPrefix  = '';
		}

		return sPrefix + 'themes/' + encodeURI(sTheme) + '/images/preview.png';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.notificationMailIcon = function ()
	{
		return  this.sStaticPrefix + 'css/images/icom-message-notification.png';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.openPgpJs = function ()
	{
		return  this.sStaticPrefix + 'js/openpgp.min.js';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.socialGoogle = function ()
	{
		return this.sServer + 'SocialGoogle' + ('' !== this.sSpecSuffix ? '/' + this.sSpecSuffix + '/' : '');
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.socialTwitter = function ()
	{
		return this.sServer + 'SocialTwitter' + ('' !== this.sSpecSuffix ? '/' + this.sSpecSuffix + '/' : '');
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.socialFacebook = function ()
	{
		return this.sServer + 'SocialFacebook' + ('' !== this.sSpecSuffix ? '/' + this.sSpecSuffix + '/' : '');
	};

	module.exports = new LinkBuilder();

}(module));
},{"../External/window.js":25,"./Utils.js":9}],8:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Plugins = {},
		Utils = require('./Utils.js'),
		Remote = require('../Remote.js'),
		RL = require('../RL.js')
	;

	/**
	 * @type {Object}
	 */
	Plugins.oViewModelsHooks = {};

	/**
	 * @type {Object}
	 */
	Plugins.oSimpleHooks = {};

	/**
	 * @param {string} sName
	 * @param {Function} ViewModel
	 */
	Plugins.regViewModelHook = function (sName, ViewModel)
	{
		if (ViewModel)
		{
			ViewModel.__hookName = sName;
		}
	};

	/**
	 * @param {string} sName
	 * @param {Function} fCallback
	 */
	Plugins.addHook = function (sName, fCallback)
	{
		if (Utils.isFunc(fCallback))
		{
			if (!Utils.isArray(Plugins.oSimpleHooks[sName]))
			{
				Plugins.oSimpleHooks[sName] = [];
			}

			Plugins.oSimpleHooks[sName].push(fCallback);
		}
	};

	/**
	 * @param {string} sName
	 * @param {Array=} aArguments
	 */
	Plugins.runHook = function (sName, aArguments)
	{
		if (Utils.isArray(Plugins.oSimpleHooks[sName]))
		{
			aArguments = aArguments || [];

			_.each(Plugins.oSimpleHooks[sName], function (fCallback) {
				fCallback.apply(null, aArguments);
			});
		}
	};

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.mainSettingsGet = function (sName)
	{
		return RL ? RL().settingsGet(sName) : null;
	};

	/**
	 * @param {Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	Plugins.remoteRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
	{
		if (Remote)
		{
			Remote().defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
		}
	};

	/**
	 * @param {string} sPluginSection
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.settingsGet = function (sPluginSection, sName)
	{
		var oPlugin = Plugins.mainSettingsGet('Plugins');
		oPlugin = oPlugin && Utils.isUnd(oPlugin[sPluginSection]) ? null : oPlugin[sPluginSection];
		return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
	};

	module.exports = Plugins;

}(module));
},{"../RL.js":32,"../Remote.js":33,"./Utils.js":9}],9:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {
	
	'use strict';

	var
		Utils = {},
		
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		key = require('../External/key.js'),
		window = require('../External/window.js'),
		$window = require('../External/$window.js'),
		$doc = require('../External/$doc.js'),
		NotificationClass = require('../External/NotificationClass.js'),

		LocalStorage = require('../Storages/LocalStorage.js'),

		kn = require('../Knoin/Knoin.js'),
		
		Enums = require('./Enums.js'),
		Globals = require('./Globals.js')
	;

	Utils.trim = $.trim;
	Utils.inArray = $.inArray;
	Utils.isArray = _.isArray;
	Utils.isFunc = _.isFunction;
	Utils.isUnd = _.isUndefined;
	Utils.isNull = _.isNull;
	Utils.emptyFunction = function () {};

	/**
	 * @param {*} oValue
	 * @return {boolean}
	 */
	Utils.isNormal = function (oValue)
	{
		return !Utils.isUnd(oValue) && !Utils.isNull(oValue);
	};

	Utils.windowResize = _.debounce(function (iTimeout) {
		if (Utils.isUnd(iTimeout))
		{
			$window.resize();
		}
		else
		{
			window.setTimeout(function () {
				$window.resize();
			}, iTimeout);
		}
	}, 50);

	/**
	 * @param {(string|number)} mValue
	 * @param {boolean=} bIncludeZero
	 * @return {boolean}
	 */
	Utils.isPosNumeric = function (mValue, bIncludeZero)
	{
		return Utils.isNormal(mValue) ?
			((Utils.isUnd(bIncludeZero) ? true : !!bIncludeZero) ?
				(/^[0-9]*$/).test(mValue.toString()) :
				(/^[1-9]+[0-9]*$/).test(mValue.toString())) :
			false;
	};

	/**
	 * @param {*} iValue
	 * @param {number=} iDefault = 0
	 * @return {number}
	 */
	Utils.pInt = function (iValue, iDefault)
	{
		var iResult = Utils.isNormal(iValue) && '' !== iValue ? window.parseInt(iValue, 10) : (iDefault || 0);
		return window.isNaN(iResult) ? (iDefault || 0) : iResult;
	};

	/**
	 * @param {*} mValue
	 * @return {string}
	 */
	Utils.pString = function (mValue)
	{
		return Utils.isNormal(mValue) ? '' + mValue : '';
	};

	/**
	 * @param {*} aValue
	 * @return {boolean}
	 */
	Utils.isNonEmptyArray = function (aValue)
	{
		return Utils.isArray(aValue) && 0 < aValue.length;
	};

	/**
	 * @param {string} sQueryString
	 * @return {Object}
	 */
	Utils.simpleQueryParser = function (sQueryString)
	{
		var
			oParams = {},
			aQueries = [],
			aTemp = [],
			iIndex = 0,
			iLen = 0
		;

		aQueries = sQueryString.split('&');
		for (iIndex = 0, iLen = aQueries.length; iIndex < iLen; iIndex++)
		{
			aTemp = aQueries[iIndex].split('=');
			oParams[window.decodeURIComponent(aTemp[0])] = window.decodeURIComponent(aTemp[1]);
		}

		return oParams;
	};

	/**
	 * @param {string} aValue
	 * @param {string} sKey
	 * @param {string} sLongKey
	 * @return {string|boolean}
	 */
	Utils.rsaEncode = function (sValue, sHash, sKey, sLongKey)
	{
		if (window.crypto && window.crypto.getRandomValues && window.RSAKey && sHash && sKey && sLongKey)
		{
			var oRsa = new window.RSAKey();
			oRsa.setPublic(sLongKey, sKey);

			sValue = oRsa.encrypt(Utils.fakeMd5() + ':' + sValue + ':' + Utils.fakeMd5());
			if (false !== sValue)
			{
				return 'rsa:' + sHash + ':' + sValue;
			}
		}

		return false;
	};

	Utils.rsaEncode.supported = !!(window.crypto && window.crypto.getRandomValues && window.RSAKey);

	/**
	 * @param {string} sPath
	 * @param {*=} oObject
	 * @param {Object=} oObjectToExportTo
	 */
	Utils.exportPath = function (sPath, oObject, oObjectToExportTo)
	{
		var
			part = null,
			parts = sPath.split('.'),
			cur = oObjectToExportTo || window
		;

		for (; parts.length && (part = parts.shift());)
		{
			if (!parts.length && !Utils.isUnd(oObject))
			{
				cur[part] = oObject;
			}
			else if (cur[part])
			{
				cur = cur[part];
			}
			else
			{
				cur = cur[part] = {};
			}
		}
	};

	/**
	 * @param {Object} oObject
	 * @param {string} sName
	 * @param {*} mValue
	 */
	Utils.pImport = function (oObject, sName, mValue)
	{
		oObject[sName] = mValue;
	};

	/**
	 * @param {Object} oObject
	 * @param {string} sName
	 * @param {*} mDefault
	 * @return {*}
	 */
	Utils.pExport = function (oObject, sName, mDefault)
	{
		return Utils.isUnd(oObject[sName]) ? mDefault : oObject[sName];
	};

	/**
	 * @param {string} sText
	 * @return {string}
	 */
	Utils.encodeHtml = function (sText)
	{
		return Utils.isNormal(sText) ? sText.toString()
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
	};

	/**
	 * @param {string} sText
	 * @param {number=} iLen
	 * @return {string}
	 */
	Utils.splitPlainText = function (sText, iLen)
	{
		var
			sPrefix = '',
			sSubText = '',
			sResult = sText,
			iSpacePos = 0,
			iNewLinePos = 0
		;

		iLen = Utils.isUnd(iLen) ? 100 : iLen;

		while (sResult.length > iLen)
		{
			sSubText = sResult.substring(0, iLen);
			iSpacePos = sSubText.lastIndexOf(' ');
			iNewLinePos = sSubText.lastIndexOf('\n');

			if (-1 !== iNewLinePos)
			{
				iSpacePos = iNewLinePos;
			}

			if (-1 === iSpacePos)
			{
				iSpacePos = iLen;
			}

			sPrefix += sSubText.substring(0, iSpacePos) + '\n';
			sResult = sResult.substring(iSpacePos + 1);
		}

		return sPrefix + sResult;
	};

	Utils.timeOutAction = (function () {

		var
			oTimeOuts = {}
		;

		return function (sAction, fFunction, iTimeOut)
		{
			if (Utils.isUnd(oTimeOuts[sAction]))
			{
				oTimeOuts[sAction] = 0;
			}

			window.clearTimeout(oTimeOuts[sAction]);
			oTimeOuts[sAction] = window.setTimeout(fFunction, iTimeOut);
		};
	}());

	Utils.timeOutActionSecond = (function () {

		var
			oTimeOuts = {}
		;

		return function (sAction, fFunction, iTimeOut)
		{
			if (!oTimeOuts[sAction])
			{
				oTimeOuts[sAction] = window.setTimeout(function () {
					fFunction();
					oTimeOuts[sAction] = 0;
				}, iTimeOut);
			}
		};
	}());

	Utils.audio = (function () {

		var
			oAudio = false
		;

		return function (sMp3File, sOggFile) {

			if (false === oAudio)
			{
				if (Globals.bIsiOSDevice)
				{
					oAudio = null;
				}
				else
				{
					var
						bCanPlayMp3	= false,
						bCanPlayOgg	= false,
						oAudioLocal = window.Audio ? new window.Audio() : null
					;

					if (oAudioLocal && oAudioLocal.canPlayType && oAudioLocal.play)
					{
						bCanPlayMp3 = '' !== oAudioLocal.canPlayType('audio/mpeg; codecs="mp3"');
						if (!bCanPlayMp3)
						{
							bCanPlayOgg = '' !== oAudioLocal.canPlayType('audio/ogg; codecs="vorbis"');
						}

						if (bCanPlayMp3 || bCanPlayOgg)
						{
							oAudio = oAudioLocal;
							oAudio.preload = 'none';
							oAudio.loop = false;
							oAudio.autoplay = false;
							oAudio.muted = false;
							oAudio.src = bCanPlayMp3 ? sMp3File : sOggFile;
						}
						else
						{
							oAudio = null;
						}
					}
					else
					{
						oAudio = null;
					}
				}
			}

			return oAudio;
		};
	}());

	/**
	 * @param {(Object|null|undefined)} oObject
	 * @param {string} sProp
	 * @return {boolean}
	 */
	Utils.hos = function (oObject, sProp)
	{
		return oObject && window.Object && window.Object.hasOwnProperty ? window.Object.hasOwnProperty.call(oObject, sProp) : false;
	};

	/**
	 * @param {string} sKey
	 * @param {Object=} oValueList
	 * @param {string=} sDefaulValue
	 * @return {string}
	 */
	Utils.i18n = function (sKey, oValueList, sDefaulValue)
	{
		var
			sValueName = '',
			sResult = Utils.isUnd(Globals.oI18N[sKey]) ? (Utils.isUnd(sDefaulValue) ? sKey : sDefaulValue) : Globals.oI18N[sKey]
		;

		if (!Utils.isUnd(oValueList) && !Utils.isNull(oValueList))
		{
			for (sValueName in oValueList)
			{
				if (Utils.hos(oValueList, sValueName))
				{
					sResult = sResult.replace('%' + sValueName + '%', oValueList[sValueName]);
				}
			}
		}

		return sResult;
	};

	/**
	 * @param {Object} oElement
	 */
	Utils.i18nToNode = function (oElement)
	{
		_.defer(function () {
			$('.i18n', oElement).each(function () {
				var
					jqThis = $(this),
					sKey = ''
				;

				sKey = jqThis.data('i18n-text');
				if (sKey)
				{
					jqThis.text(Utils.i18n(sKey));
				}
				else
				{
					sKey = jqThis.data('i18n-html');
					if (sKey)
					{
						jqThis.html(Utils.i18n(sKey));
					}

					sKey = jqThis.data('i18n-placeholder');
					if (sKey)
					{
						jqThis.attr('placeholder', Utils.i18n(sKey));
					}

					sKey = jqThis.data('i18n-title');
					if (sKey)
					{
						jqThis.attr('title', Utils.i18n(sKey));
					}
				}
			});
		});
	};

	Utils.i18nReload = function ()
	{
		if (window['rainloopI18N'])
		{
			Globals.oI18N = window['rainloopI18N'] || {};
			
			Utils.i18nToNode($doc);
			
			Globals.langChangeTrigger(!Globals.langChangeTrigger());
		}

		window['rainloopI18N'] = null;
	};
	
	/**
	 * @param {Function} fCallback
	 * @param {Object} oScope
	 * @param {Function=} fLangCallback
	 */
	Utils.initOnStartOrLangChange = function (fCallback, oScope, fLangCallback)
	{
		if (fCallback)
		{
			fCallback.call(oScope);
		}

		if (fLangCallback)
		{
			Globals.langChangeTrigger.subscribe(function () {
				if (fCallback)
				{
					fCallback.call(oScope);
				}

				fLangCallback.call(oScope);
			});
		}
		else if (fCallback)
		{
			Globals.langChangeTrigger.subscribe(fCallback, oScope);
		}
	};

	/**
	 * @return {boolean}
	 */
	Utils.inFocus = function ()
	{
		if (document.activeElement)
		{
			if (Utils.isUnd(document.activeElement.__inFocusCache))
			{
				document.activeElement.__inFocusCache = $(document.activeElement).is('input,textarea,iframe,.cke_editable');
			}

			return !!document.activeElement.__inFocusCache;
		}

		return false;
	};

	Utils.removeInFocus = function ()
	{
		if (document && document.activeElement && document.activeElement.blur)
		{
			var oA = $(document.activeElement);
			if (oA.is('input,textarea'))
			{
				document.activeElement.blur();
			}
		}
	};

	Utils.removeSelection = function ()
	{
		if (window && window.getSelection)
		{
			var oSel = window.getSelection();
			if (oSel && oSel.removeAllRanges)
			{
				oSel.removeAllRanges();
			}
		}
		else if (document && document.selection && document.selection.empty)
		{
			document.selection.empty();
		}
	};

	/**
	 * @param {string} sPrefix
	 * @param {string} sSubject
	 * @return {string}
	 */
	Utils.replySubjectAdd = function (sPrefix, sSubject)
	{
		sPrefix = Utils.trim(sPrefix.toUpperCase());
		sSubject = Utils.trim(sSubject.replace(/[\s]+/, ' '));

		var
			iIndex = 0,
			sResult = '',
			bDrop = false,
			sTrimmedPart = '',
			aSubject = [],
			aParts = [],
			bRe = 'RE' === sPrefix,
			bFwd = 'FWD' === sPrefix,
			bPrefixIsRe = !bFwd
		;

		if ('' !== sSubject)
		{
			bDrop = false;

			aParts = sSubject.split(':');
			for (iIndex = 0; iIndex < aParts.length; iIndex++)
			{
				sTrimmedPart = Utils.trim(aParts[iIndex]);
				if (!bDrop &&
						(/^(RE|FWD)$/i.test(sTrimmedPart) || /^(RE|FWD)[\[\(][\d]+[\]\)]$/i.test(sTrimmedPart))
					)
				{
					if (!bRe)
					{
						bRe = !!(/^RE/i.test(sTrimmedPart));
					}

					if (!bFwd)
					{
						bFwd = !!(/^FWD/i.test(sTrimmedPart));
					}
				}
				else
				{
					aSubject.push(aParts[iIndex]);
					bDrop = true;
				}
			}

			if (0 < aSubject.length)
			{
				sResult = Utils.trim(aSubject.join(':'));
			}
		}

		if (bPrefixIsRe)
		{
			bRe = false;
		}
		else
		{
			bFwd = false;
		}

		return Utils.trim(
			(bPrefixIsRe ? 'Re: ' : 'Fwd: ') +
			(bRe ? 'Re: ' : '') +
			(bFwd ? 'Fwd: ' : '') +
			sResult
		);
	};


	/**
	 * @param {string} sSubject
	 * @return {string}
	 */
	Utils.fixLongSubject = function (sSubject)
	{
		var
			iLimit = 30,
			mReg = /^Re([\[\(]([\d]+)[\]\)]|):[\s]{0,3}Re([\[\(]([\d]+)[\]\)]|):/ig,
			oMatch = null
		;

		sSubject = Utils.trim(sSubject.replace(/[\s]+/, ' '));

		do
		{
			iLimit--;

			oMatch = mReg.exec(sSubject);
			if (!oMatch || Utils.isUnd(oMatch[0]))
			{
				oMatch = null;
			}

			if (oMatch)
			{
				sSubject = sSubject.replace(mReg, 'Re:');
			}
		}
		while (oMatch || 0 < iLimit);

		return sSubject.replace(/[\s]+/, ' ');
	};

	/**
	 * @deprecated
	 * @param {string} sPrefix
	 * @param {string} sSubject
	 * @param {boolean=} bFixLongSubject = true
	 * @return {string}
	 */
	Utils._replySubjectAdd_ = function (sPrefix, sSubject, bFixLongSubject)
	{
		var
			oMatch = null,
			sResult = Utils.trim(sSubject)
		;

		if (null !== (oMatch = (new window.RegExp('^' + sPrefix + '[\\s]?\\:(.*)$', 'gi')).exec(sSubject)) && !Utils.isUnd(oMatch[1]))
		{
			sResult = sPrefix + '[2]: ' + oMatch[1];
		}
		else if (null !== (oMatch = (new window.RegExp('^(' + sPrefix + '[\\s]?[\\[\\(]?)([\\d]+)([\\]\\)]?[\\s]?\\:.*)$', 'gi')).exec(sSubject)) &&
			!Utils.isUnd(oMatch[1]) && !Utils.isUnd(oMatch[2]) && !Utils.isUnd(oMatch[3]))
		{
			sResult = oMatch[1] + (Utils.pInt(oMatch[2]) + 1) + oMatch[3];
		}
		else
		{
			sResult = sPrefix + ': ' + sSubject;
		}

		sResult = sResult.replace(/[\s]+/g, ' ');
		sResult = (Utils.isUnd(bFixLongSubject) ? true : bFixLongSubject) ? Utils.fixLongSubject(sResult) : sResult;
	//	sResult = sResult.replace(/^(Re|Fwd)[\s]?\[[\d]+\]:/ig, '$1:');
		return sResult;
	};

	/**
	 * @deprecated
	 * @param {string} sSubject
	 * @return {string}
	 */
	Utils._fixLongSubject_ = function (sSubject)
	{
		var
			iCounter = 0,
			oMatch = null
		;

		sSubject = Utils.trim(sSubject.replace(/[\s]+/, ' '));

		do
		{
			oMatch = /^Re(\[([\d]+)\]|):[\s]{0,3}Re(\[([\d]+)\]|):/ig.exec(sSubject);
			if (!oMatch || Utils.isUnd(oMatch[0]))
			{
				oMatch = null;
			}

			if (oMatch)
			{
				iCounter = 0;
				iCounter += Utils.isUnd(oMatch[2]) ? 1 : 0 + Utils.pInt(oMatch[2]);
				iCounter += Utils.isUnd(oMatch[4]) ? 1 : 0 + Utils.pInt(oMatch[4]);

				sSubject = sSubject.replace(/^Re(\[[\d]+\]|):[\s]{0,3}Re(\[[\d]+\]|):/gi, 'Re' + (0 < iCounter ? '[' + iCounter + ']' : '') + ':');
			}

		}
		while (oMatch);

		sSubject = sSubject.replace(/[\s]+/, ' ');
		return sSubject;
	};

	/**
	 * @param {number} iNum
	 * @param {number} iDec
	 * @return {number}
	 */
	Utils.roundNumber = function (iNum, iDec)
	{
		return Math.round(iNum * Math.pow(10, iDec)) / Math.pow(10, iDec);
	};

	/**
	 * @param {(number|string)} iSizeInBytes
	 * @return {string}
	 */
	Utils.friendlySize = function (iSizeInBytes)
	{
		iSizeInBytes = Utils.pInt(iSizeInBytes);

		if (iSizeInBytes >= 1073741824)
		{
			return Utils.roundNumber(iSizeInBytes / 1073741824, 1) + 'GB';
		}
		else if (iSizeInBytes >= 1048576)
		{
			return Utils.roundNumber(iSizeInBytes / 1048576, 1) + 'MB';
		}
		else if (iSizeInBytes >= 1024)
		{
			return Utils.roundNumber(iSizeInBytes / 1024, 0) + 'KB';
		}

		return iSizeInBytes + 'B';
	};

	/**
	 * @param {string} sDesc
	 */
	Utils.log = function (sDesc)
	{
		if (window.console && window.console.log)
		{
			window.console.log(sDesc);
		}
	};

	/**
	 * @param {number} iCode
	 * @param {*=} mMessage = ''
	 * @return {string}
	 */
	Utils.getNotification = function (iCode, mMessage)
	{
		iCode = Utils.pInt(iCode);
		if (Enums.Notification.ClientViewError === iCode && mMessage)
		{
			return mMessage;
		}

		return Utils.isUnd(Globals.oNotificationI18N[iCode]) ? '' : Globals.oNotificationI18N[iCode];
	};

	Utils.initNotificationLanguage = function ()
	{
		var oN = Globals.oNotificationI18N || {};
		oN[Enums.Notification.InvalidToken] = Utils.i18n('NOTIFICATIONS/INVALID_TOKEN');
		oN[Enums.Notification.AuthError] = Utils.i18n('NOTIFICATIONS/AUTH_ERROR');
		oN[Enums.Notification.AccessError] = Utils.i18n('NOTIFICATIONS/ACCESS_ERROR');
		oN[Enums.Notification.ConnectionError] = Utils.i18n('NOTIFICATIONS/CONNECTION_ERROR');
		oN[Enums.Notification.CaptchaError] = Utils.i18n('NOTIFICATIONS/CAPTCHA_ERROR');
		oN[Enums.Notification.SocialFacebookLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_FACEBOOK_LOGIN_ACCESS_DISABLE');
		oN[Enums.Notification.SocialTwitterLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_TWITTER_LOGIN_ACCESS_DISABLE');
		oN[Enums.Notification.SocialGoogleLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_GOOGLE_LOGIN_ACCESS_DISABLE');
		oN[Enums.Notification.DomainNotAllowed] = Utils.i18n('NOTIFICATIONS/DOMAIN_NOT_ALLOWED');
		oN[Enums.Notification.AccountNotAllowed] = Utils.i18n('NOTIFICATIONS/ACCOUNT_NOT_ALLOWED');

		oN[Enums.Notification.AccountTwoFactorAuthRequired] = Utils.i18n('NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_REQUIRED');
		oN[Enums.Notification.AccountTwoFactorAuthError] = Utils.i18n('NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_ERROR');

		oN[Enums.Notification.CouldNotSaveNewPassword] = Utils.i18n('NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD');
		oN[Enums.Notification.CurrentPasswordIncorrect] = Utils.i18n('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT');
		oN[Enums.Notification.NewPasswordShort] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_SHORT');
		oN[Enums.Notification.NewPasswordWeak] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_WEAK');
		oN[Enums.Notification.NewPasswordForbidden] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_FORBIDDENT');

		oN[Enums.Notification.ContactsSyncError] = Utils.i18n('NOTIFICATIONS/CONTACTS_SYNC_ERROR');

		oN[Enums.Notification.CantGetMessageList] = Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST');
		oN[Enums.Notification.CantGetMessage] = Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE');
		oN[Enums.Notification.CantDeleteMessage] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_MESSAGE');
		oN[Enums.Notification.CantMoveMessage] = Utils.i18n('NOTIFICATIONS/CANT_MOVE_MESSAGE');
		oN[Enums.Notification.CantCopyMessage] = Utils.i18n('NOTIFICATIONS/CANT_MOVE_MESSAGE');

		oN[Enums.Notification.CantSaveMessage] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_MESSAGE');
		oN[Enums.Notification.CantSendMessage] = Utils.i18n('NOTIFICATIONS/CANT_SEND_MESSAGE');
		oN[Enums.Notification.InvalidRecipients] = Utils.i18n('NOTIFICATIONS/INVALID_RECIPIENTS');

		oN[Enums.Notification.CantCreateFolder] = Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER');
		oN[Enums.Notification.CantRenameFolder] = Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER');
		oN[Enums.Notification.CantDeleteFolder] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER');
		oN[Enums.Notification.CantDeleteNonEmptyFolder] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_NON_EMPTY_FOLDER');
		oN[Enums.Notification.CantSubscribeFolder] = Utils.i18n('NOTIFICATIONS/CANT_SUBSCRIBE_FOLDER');
		oN[Enums.Notification.CantUnsubscribeFolder] = Utils.i18n('NOTIFICATIONS/CANT_UNSUBSCRIBE_FOLDER');

		oN[Enums.Notification.CantSaveSettings] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_SETTINGS');
		oN[Enums.Notification.CantSavePluginSettings] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_PLUGIN_SETTINGS');

		oN[Enums.Notification.DomainAlreadyExists] = Utils.i18n('NOTIFICATIONS/DOMAIN_ALREADY_EXISTS');

		oN[Enums.Notification.CantInstallPackage] = Utils.i18n('NOTIFICATIONS/CANT_INSTALL_PACKAGE');
		oN[Enums.Notification.CantDeletePackage] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_PACKAGE');
		oN[Enums.Notification.InvalidPluginPackage] = Utils.i18n('NOTIFICATIONS/INVALID_PLUGIN_PACKAGE');
		oN[Enums.Notification.UnsupportedPluginPackage] = Utils.i18n('NOTIFICATIONS/UNSUPPORTED_PLUGIN_PACKAGE');

		oN[Enums.Notification.LicensingServerIsUnavailable] = Utils.i18n('NOTIFICATIONS/LICENSING_SERVER_IS_UNAVAILABLE');
		oN[Enums.Notification.LicensingExpired] = Utils.i18n('NOTIFICATIONS/LICENSING_EXPIRED');
		oN[Enums.Notification.LicensingBanned] = Utils.i18n('NOTIFICATIONS/LICENSING_BANNED');

		oN[Enums.Notification.DemoSendMessageError] = Utils.i18n('NOTIFICATIONS/DEMO_SEND_MESSAGE_ERROR');

		oN[Enums.Notification.AccountAlreadyExists] = Utils.i18n('NOTIFICATIONS/ACCOUNT_ALREADY_EXISTS');

		oN[Enums.Notification.MailServerError] = Utils.i18n('NOTIFICATIONS/MAIL_SERVER_ERROR');
		oN[Enums.Notification.InvalidInputArgument] = Utils.i18n('NOTIFICATIONS/INVALID_INPUT_ARGUMENT');
		oN[Enums.Notification.UnknownNotification] = Utils.i18n('NOTIFICATIONS/UNKNOWN_ERROR');
		oN[Enums.Notification.UnknownError] = Utils.i18n('NOTIFICATIONS/UNKNOWN_ERROR');
	};

	/**
	 * @param {*} mCode
	 * @return {string}
	 */
	Utils.getUploadErrorDescByCode = function (mCode)
	{
		var sResult = '';
		switch (Utils.pInt(mCode)) {
		case Enums.UploadErrorCode.FileIsTooBig:
			sResult = Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG');
			break;
		case Enums.UploadErrorCode.FilePartiallyUploaded:
			sResult = Utils.i18n('UPLOAD/ERROR_FILE_PARTIALLY_UPLOADED');
			break;
		case Enums.UploadErrorCode.FileNoUploaded:
			sResult = Utils.i18n('UPLOAD/ERROR_NO_FILE_UPLOADED');
			break;
		case Enums.UploadErrorCode.MissingTempFolder:
			sResult = Utils.i18n('UPLOAD/ERROR_MISSING_TEMP_FOLDER');
			break;
		case Enums.UploadErrorCode.FileOnSaveingError:
			sResult = Utils.i18n('UPLOAD/ERROR_ON_SAVING_FILE');
			break;
		case Enums.UploadErrorCode.FileType:
			sResult = Utils.i18n('UPLOAD/ERROR_FILE_TYPE');
			break;
		default:
			sResult = Utils.i18n('UPLOAD/ERROR_UNKNOWN');
			break;
		}

		return sResult;
	};

	/**
	 * @param {?} oObject
	 * @param {string} sMethodName
	 * @param {Array=} aParameters
	 * @param {number=} nDelay
	 */
	Utils.delegateRun = function (oObject, sMethodName, aParameters, nDelay)
	{
		if (oObject && oObject[sMethodName])
		{
			nDelay = Utils.pInt(nDelay);
			if (0 >= nDelay)
			{
				oObject[sMethodName].apply(oObject, Utils.isArray(aParameters) ? aParameters : []);
			}
			else
			{
				_.delay(function () {
					oObject[sMethodName].apply(oObject, Utils.isArray(aParameters) ? aParameters : []);
				}, nDelay);
			}
		}
	};

	/**
	 * @param {?} oEvent
	 */
	Utils.killCtrlAandS = function (oEvent)
	{
		oEvent = oEvent || window.event;
		if (oEvent && oEvent.ctrlKey && !oEvent.shiftKey && !oEvent.altKey)
		{
			var
				oSender = oEvent.target || oEvent.srcElement,
				iKey = oEvent.keyCode || oEvent.which
			;

			if (iKey === Enums.EventKeyCode.S)
			{
				oEvent.preventDefault();
				return;
			}

			if (oSender && oSender.tagName && oSender.tagName.match(/INPUT|TEXTAREA/i))
			{
				return;
			}

			if (iKey === Enums.EventKeyCode.A)
			{
				if (window.getSelection)
				{
					window.getSelection().removeAllRanges();
				}
				else if (window.document.selection && window.document.selection.clear)
				{
					window.document.selection.clear();
				}

				oEvent.preventDefault();
			}
		}
	};

	/**
	 * @param {(Object|null|undefined)} oContext
	 * @param {Function} fExecute
	 * @param {(Function|boolean|null)=} fCanExecute
	 * @return {Function}
	 */
	Utils.createCommand = function (oContext, fExecute, fCanExecute)
	{
		var
			fResult = fExecute ? function () {
				if (fResult.canExecute && fResult.canExecute())
				{
					fExecute.apply(oContext, Array.prototype.slice.call(arguments));
				}
				return false;
			} : function () {}
		;

		fResult.enabled = ko.observable(true);

		fCanExecute = Utils.isUnd(fCanExecute) ? true : fCanExecute;
		if (Utils.isFunc(fCanExecute))
		{
			fResult.canExecute = ko.computed(function () {
				return fResult.enabled() && fCanExecute.call(oContext);
			});
		}
		else
		{
			fResult.canExecute = ko.computed(function () {
				return fResult.enabled() && !!fCanExecute;
			});
		}

		return fResult;
	};

	/**
	 * @param {Object} oData
	 */
	Utils.initDataConstructorBySettings = function (oData)
	{
		oData.editorDefaultType = ko.observable(Enums.EditorDefaultType.Html);
		oData.showImages = ko.observable(false);
		oData.interfaceAnimation = ko.observable(Enums.InterfaceAnimation.Full);
		oData.contactsAutosave = ko.observable(false);

		Globals.sAnimationType = Enums.InterfaceAnimation.Full;

		oData.capaThemes = ko.observable(false);
		oData.allowLanguagesOnSettings = ko.observable(true);
		oData.allowLanguagesOnLogin = ko.observable(true);

		oData.useLocalProxyForExternalImages = ko.observable(false);

		oData.desktopNotifications = ko.observable(false);
		oData.useThreads = ko.observable(true);
		oData.replySameFolder = ko.observable(true);
		oData.useCheckboxesInList = ko.observable(true);

		oData.layout = ko.observable(Enums.Layout.SidePreview);
		oData.usePreviewPane = ko.computed(function () {
			return Enums.Layout.NoPreview !== oData.layout();
		});

		oData.interfaceAnimation.subscribe(function (sValue) {
			if (Globals.bMobileDevice || sValue === Enums.InterfaceAnimation.None)
			{
				$html.removeClass('rl-anim rl-anim-full').addClass('no-rl-anim');

				Globals.sAnimationType = Enums.InterfaceAnimation.None;
			}
			else
			{
				switch (sValue)
				{
					case Enums.InterfaceAnimation.Full:
						$html.removeClass('no-rl-anim').addClass('rl-anim rl-anim-full');
						Globals.sAnimationType = sValue;
						break;
					case Enums.InterfaceAnimation.Normal:
						$html.removeClass('no-rl-anim rl-anim-full').addClass('rl-anim');
						Globals.sAnimationType = sValue;
						break;
				}
			}
		});

		oData.interfaceAnimation.valueHasMutated();

		oData.desktopNotificationsPermisions = ko.computed(function () {
			oData.desktopNotifications();
			var iResult = Enums.DesktopNotifications.NotSupported;
			if (NotificationClass && NotificationClass.permission)
			{
				switch (NotificationClass.permission.toLowerCase())
				{
					case 'granted':
						iResult = Enums.DesktopNotifications.Allowed;
						break;
					case 'denied':
						iResult = Enums.DesktopNotifications.Denied;
						break;
					case 'default':
						iResult = Enums.DesktopNotifications.NotAllowed;
						break;
				}
			}
			else if (window.webkitNotifications && window.webkitNotifications.checkPermission)
			{
				iResult = window.webkitNotifications.checkPermission();
			}

			return iResult;
		});

		oData.useDesktopNotifications = ko.computed({
			'read': function () {
				return oData.desktopNotifications() &&
					Enums.DesktopNotifications.Allowed === oData.desktopNotificationsPermisions();
			},
			'write': function (bValue) {
				if (bValue)
				{
					var iPermission = oData.desktopNotificationsPermisions();
					if (Enums.DesktopNotifications.Allowed === iPermission)
					{
						oData.desktopNotifications(true);
					}
					else if (Enums.DesktopNotifications.NotAllowed === iPermission)
					{
						NotificationClass.requestPermission(function () {
							oData.desktopNotifications.valueHasMutated();
							if (Enums.DesktopNotifications.Allowed === oData.desktopNotificationsPermisions())
							{
								if (oData.desktopNotifications())
								{
									oData.desktopNotifications.valueHasMutated();
								}
								else
								{
									oData.desktopNotifications(true);
								}
							}
							else
							{
								if (oData.desktopNotifications())
								{
									oData.desktopNotifications(false);
								}
								else
								{
									oData.desktopNotifications.valueHasMutated();
								}
							}
						});
					}
					else
					{
						oData.desktopNotifications(false);
					}
				}
				else
				{
					oData.desktopNotifications(false);
				}
			}
		});

		oData.language = ko.observable('');
		oData.languages = ko.observableArray([]);

		oData.mainLanguage = ko.computed({
			'read': oData.language,
			'write': function (sValue) {
				if (sValue !== oData.language())
				{
					if (-1 < Utils.inArray(sValue, oData.languages()))
					{
						oData.language(sValue);
					}
					else if (0 < oData.languages().length)
					{
						oData.language(oData.languages()[0]);
					}
				}
				else
				{
					oData.language.valueHasMutated();
				}
			}
		});

		oData.theme = ko.observable('');
		oData.themes = ko.observableArray([]);

		oData.mainTheme = ko.computed({
			'read': oData.theme,
			'write': function (sValue) {
				if (sValue !== oData.theme())
				{
					var aThemes = oData.themes();
					if (-1 < Utils.inArray(sValue, aThemes))
					{
						oData.theme(sValue);
					}
					else if (0 < aThemes.length)
					{
						oData.theme(aThemes[0]);
					}
				}
				else
				{
					oData.theme.valueHasMutated();
				}
			}
		});

		oData.capaAdditionalAccounts = ko.observable(false);
		oData.capaAdditionalIdentities = ko.observable(false);
		oData.capaGravatar = ko.observable(false);
		oData.determineUserLanguage = ko.observable(false);
		oData.determineUserDomain = ko.observable(false);

		oData.messagesPerPage = ko.observable(Consts.Defaults.MessagesPerPage);//.extend({'throttle': 200});

		oData.mainMessagesPerPage = oData.messagesPerPage;
		oData.mainMessagesPerPage = ko.computed({
			'read': oData.messagesPerPage,
			'write': function (iValue) {
				if (-1 < Utils.inArray(Utils.pInt(iValue), Consts.Defaults.MessagesPerPageArray))
				{
					if (iValue !== oData.messagesPerPage())
					{
						oData.messagesPerPage(iValue);
					}
				}
				else
				{
					oData.messagesPerPage.valueHasMutated();
				}
			}
		});

		oData.facebookSupported = ko.observable(false);
		oData.facebookEnable = ko.observable(false);
		oData.facebookAppID = ko.observable('');
		oData.facebookAppSecret = ko.observable('');

		oData.twitterEnable = ko.observable(false);
		oData.twitterConsumerKey = ko.observable('');
		oData.twitterConsumerSecret = ko.observable('');

		oData.googleEnable = ko.observable(false);
		oData.googleClientID = ko.observable('');
		oData.googleClientSecret = ko.observable('');
		oData.googleApiKey = ko.observable('');

		oData.dropboxEnable = ko.observable(false);
		oData.dropboxApiKey = ko.observable('');

		oData.contactsIsAllowed = ko.observable(false);
	};

	/**
	 * @param {{moment:Function}} oObject
	 */
	Utils.createMomentDate = function (oObject)
	{
		if (Utils.isUnd(oObject.moment))
		{
			oObject.moment = ko.observable(moment());
		}

		return ko.computed(function () {
			Globals.momentTrigger();
			var oMoment = this.moment();
			return 1970 === oMoment.year() ? '' : oMoment.fromNow();
		}, oObject);
	};

	/**
	 * @param {{moment:Function, momentDate:Function}} oObject
	 */
	Utils.createMomentShortDate = function (oObject)
	{
		return ko.computed(function () {

			var
				sResult = '',
				oMomentNow = moment(),
				oMoment = this.moment(),
				sMomentDate = this.momentDate()
			;

			if (1970 === oMoment.year())
			{
				sResult = '';
			}
			else if (4 >= oMomentNow.diff(oMoment, 'hours'))
			{
				sResult = sMomentDate;
			}
			else if (oMomentNow.format('L') === oMoment.format('L'))
			{
				sResult = Utils.i18n('MESSAGE_LIST/TODAY_AT', {
					'TIME': oMoment.format('LT')
				});
			}
			else if (oMomentNow.clone().subtract('days', 1).format('L') === oMoment.format('L'))
			{
				sResult = Utils.i18n('MESSAGE_LIST/YESTERDAY_AT', {
					'TIME': oMoment.format('LT')
				});
			}
			else if (oMomentNow.year() === oMoment.year())
			{
				sResult = oMoment.format('D MMM.');
			}
			else
			{
				sResult = oMoment.format('LL');
			}

			return sResult;

		}, oObject);
	};

	/**
	 * @param {string} sFullNameHash
	 * @return {boolean}
	 */
	Utils.isFolderExpanded = function (sFullNameHash)
	{
		var aExpandedList = /** @type {Array|null} */ LocalStorage.get(Enums.ClientSideKeyName.ExpandedFolders);
		return _.isArray(aExpandedList) && -1 !== _.indexOf(aExpandedList, sFullNameHash);
	};

	/**
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	Utils.setExpandedFolder = function (sFullNameHash, bExpanded)
	{
		var aExpandedList = /** @type {Array|null} */ LocalStorage.get(Enums.ClientSideKeyName.ExpandedFolders);
		if (!_.isArray(aExpandedList))
		{
			aExpandedList = [];
		}

		if (bExpanded)
		{
			aExpandedList.push(sFullNameHash);
			aExpandedList = _.uniq(aExpandedList);
		}
		else
		{
			aExpandedList = _.without(aExpandedList, sFullNameHash);
		}

		LocalStorage.set(Enums.ClientSideKeyName.ExpandedFolders, aExpandedList);
	};

	Utils.initLayoutResizer = function (sLeft, sRight, sClientSideKeyName)
	{
		var
			iDisabledWidth = 60,
			iMinWidth = 155,
			oLeft = $(sLeft),
			oRight = $(sRight),

			mLeftWidth = LocalStorage.get(sClientSideKeyName) || null,

			fSetWidth = function (iWidth) {
				if (iWidth)
				{
					oLeft.css({
						'width': '' + iWidth + 'px'
					});

					oRight.css({
						'left': '' + iWidth + 'px'
					});
				}
			},

			fDisable = function (bDisable) {
				if (bDisable)
				{
					oLeft.resizable('disable');
					fSetWidth(iDisabledWidth);
				}
				else
				{
					oLeft.resizable('enable');
					var iWidth = Utils.pInt(LocalStorage.get(sClientSideKeyName)) || iMinWidth;
					fSetWidth(iWidth > iMinWidth ? iWidth : iMinWidth);
				}
			},

			fResizeFunction = function (oEvent, oObject) {
				if (oObject && oObject.size && oObject.size.width)
				{
					LocalStorage.set(sClientSideKeyName, oObject.size.width);

					oRight.css({
						'left': '' + oObject.size.width + 'px'
					});
				}
			}
		;

		if (null !== mLeftWidth)
		{
			fSetWidth(mLeftWidth > iMinWidth ? mLeftWidth : iMinWidth);
		}

		oLeft.resizable({
			'helper': 'ui-resizable-helper',
			'minWidth': iMinWidth,
			'maxWidth': 350,
			'handles': 'e',
			'stop': fResizeFunction
		});

		RL.sub('left-panel.off', function () {
			fDisable(true);
		});

		RL.sub('left-panel.on', function () {
			fDisable(false);
		});
	};

	/**
	 * @param {Object} oMessageTextBody
	 */
	Utils.initBlockquoteSwitcher = function (oMessageTextBody)
	{
		if (oMessageTextBody)
		{
			var $oList = $('blockquote:not(.rl-bq-switcher)', oMessageTextBody).filter(function () {
				return 0 === $(this).parent().closest('blockquote', oMessageTextBody).length;
			});

			if ($oList && 0 < $oList.length)
			{
				$oList.each(function () {
					var $self = $(this), iH = $self.height();
					if (0 === iH || 100 < iH)
					{
						$self.addClass('rl-bq-switcher hidden-bq');
						$('<span class="rlBlockquoteSwitcher"><i class="icon-ellipsis" /></span>')
							.insertBefore($self)
							.click(function () {
								$self.toggleClass('hidden-bq');
								Utils.windowResize();
							})
							.after('<br />')
							.before('<br />')
						;
					}
				});
			}
		}
	};

	/**
	 * @param {Object} oMessageTextBody
	 */
	Utils.removeBlockquoteSwitcher = function (oMessageTextBody)
	{
		if (oMessageTextBody)
		{
			$(oMessageTextBody).find('blockquote.rl-bq-switcher').each(function () {
				$(this).removeClass('rl-bq-switcher hidden-bq');
			});

			$(oMessageTextBody).find('.rlBlockquoteSwitcher').each(function () {
				$(this).remove();
			});
		}
	};

	/**
	 * @param {Object} oMessageTextBody
	 */
	Utils.toggleMessageBlockquote = function (oMessageTextBody)
	{
		if (oMessageTextBody)
		{
			oMessageTextBody.find('.rlBlockquoteSwitcher').click();
		}
	};

	Utils.convertThemeName = function (sTheme)
	{
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
		}

		return Utils.trim(sTheme.replace(/[^a-zA-Z]+/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
	};

	/**
	 * @param {string} sName
	 * @return {string}
	 */
	Utils.quoteName = function (sName)
	{
		return sName.replace(/["]/g, '\\"');
	};

	/**
	 * @return {number}
	 */
	Utils.microtime = function ()
	{
		return (new Date()).getTime();
	};

	/**
	 *
	 * @param {string} sLanguage
	 * @param {boolean=} bEng = false
	 * @return {string}
	 */
	Utils.convertLangName = function (sLanguage, bEng)
	{
		return Utils.i18n('LANGS_NAMES' + (true === bEng ? '_EN' : '') + '/LANG_' +
			sLanguage.toUpperCase().replace(/[^a-zA-Z0-9]+/, '_'), null, sLanguage);
	};

	/**
	 * @param {number=} iLen
	 * @return {string}
	 */
	Utils.fakeMd5 = function(iLen)
	{
		var
			sResult = '',
			sLine = '0123456789abcdefghijklmnopqrstuvwxyz'
		;

		iLen = Utils.isUnd(iLen) ? 32 : Utils.pInt(iLen);

		while (sResult.length < iLen)
		{
			sResult += sLine.substr(window.Math.round(window.Math.random() * sLine.length), 1);
		}

		return sResult;
	};

	/* jshint ignore:start */

	/**
	 * @param {string} s
	 * @return {string}
	 */
	Utils.md5 = function(s){function L(k,d){return(k<<d)|(k>>>(32-d))}function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H)}if(I|d){if(x&1073741824){return(x^3221225472^F^H)}else{return(x^1073741824^F^H)}}else{return(x^F^H)}}function r(d,F,k){return(d&F)|((~d)&k)}function q(d,F,k){return(d&k)|(F&(~k))}function p(d,F,k){return(d^F^k)}function n(d,F,k){return(F^(d|(~k)))}function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F)}function f(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F)}function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F)}function t(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F)}function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]|(G.charCodeAt(H)<<d));H++}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa}function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2)}return k}function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x)}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128)}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128)}}}return d}var C=Array();var P,h,E,v,g,Y,X,W,V;var S=7,Q=12,N=17,M=22;var A=5,z=9,y=14,w=20;var o=4,m=11,l=16,j=23;var U=6,T=10,R=15,O=21;s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],Q,3905402710);W=u(W,V,Y,X,C[P+2],N,606105819);X=u(X,W,V,Y,C[P+3],M,3250441966);Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],Q,1200080426);W=u(W,V,Y,X,C[P+6],N,2821735955);X=u(X,W,V,Y,C[P+7],M,4249261313);Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],Q,2336552879);W=u(W,V,Y,X,C[P+10],N,4294925233);X=u(X,W,V,Y,C[P+11],M,2304563134);Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],Q,4254626195);W=u(W,V,Y,X,C[P+14],N,2792965006);X=u(X,W,V,Y,C[P+15],M,1236535329);Y=f(Y,X,W,V,C[P+1],A,4129170786);V=f(V,Y,X,W,C[P+6],z,3225465664);W=f(W,V,Y,X,C[P+11],y,643717713);X=f(X,W,V,Y,C[P+0],w,3921069994);Y=f(Y,X,W,V,C[P+5],A,3593408605);V=f(V,Y,X,W,C[P+10],z,38016083);W=f(W,V,Y,X,C[P+15],y,3634488961);X=f(X,W,V,Y,C[P+4],w,3889429448);Y=f(Y,X,W,V,C[P+9],A,568446438);V=f(V,Y,X,W,C[P+14],z,3275163606);W=f(W,V,Y,X,C[P+3],y,4107603335);X=f(X,W,V,Y,C[P+8],w,1163531501);Y=f(Y,X,W,V,C[P+13],A,2850285829);V=f(V,Y,X,W,C[P+2],z,4243563512);W=f(W,V,Y,X,C[P+7],y,1735328473);X=f(X,W,V,Y,C[P+12],w,2368359562);Y=D(Y,X,W,V,C[P+5],o,4294588738);V=D(V,Y,X,W,C[P+8],m,2272392833);W=D(W,V,Y,X,C[P+11],l,1839030562);X=D(X,W,V,Y,C[P+14],j,4259657740);Y=D(Y,X,W,V,C[P+1],o,2763975236);V=D(V,Y,X,W,C[P+4],m,1272893353);W=D(W,V,Y,X,C[P+7],l,4139469664);X=D(X,W,V,Y,C[P+10],j,3200236656);Y=D(Y,X,W,V,C[P+13],o,681279174);V=D(V,Y,X,W,C[P+0],m,3936430074);W=D(W,V,Y,X,C[P+3],l,3572445317);X=D(X,W,V,Y,C[P+6],j,76029189);Y=D(Y,X,W,V,C[P+9],o,3654602809);V=D(V,Y,X,W,C[P+12],m,3873151461);W=D(W,V,Y,X,C[P+15],l,530742520);X=D(X,W,V,Y,C[P+2],j,3299628645);Y=t(Y,X,W,V,C[P+0],U,4096336452);V=t(V,Y,X,W,C[P+7],T,1126891415);W=t(W,V,Y,X,C[P+14],R,2878612391);X=t(X,W,V,Y,C[P+5],O,4237533241);Y=t(Y,X,W,V,C[P+12],U,1700485571);V=t(V,Y,X,W,C[P+3],T,2399980690);W=t(W,V,Y,X,C[P+10],R,4293915773);X=t(X,W,V,Y,C[P+1],O,2240044497);Y=t(Y,X,W,V,C[P+8],U,1873313359);V=t(V,Y,X,W,C[P+15],T,4264355552);W=t(W,V,Y,X,C[P+6],R,2734768916);X=t(X,W,V,Y,C[P+13],O,1309151649);Y=t(Y,X,W,V,C[P+4],U,4149444226);V=t(V,Y,X,W,C[P+11],T,3174756917);W=t(W,V,Y,X,C[P+2],R,718787259);X=t(X,W,V,Y,C[P+9],O,3951481745);Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g)}var i=B(Y)+B(X)+B(W)+B(V);return i.toLowerCase()};
	/* jshint ignore:end */

	Utils.convertPlainTextToHtml = function (sPlain)
	{
		return sPlain.toString()
			.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;')
			.replace(/\r/g, '').replace(/\n/g, '<br />');
	};

	Utils.draggeblePlace = function ()
	{
		return $('<div class="draggablePlace"><span class="text"></span>&nbsp;<i class="icon-copy icon-white visible-on-ctrl"></i><i class="icon-mail icon-white hidden-on-ctrl"></i></div>').appendTo('#rl-hidden');
	};

	Utils.defautOptionsAfterRender = function (oOption, oItem)
	{
		if (oItem && !Utils.isUnd(oItem.disabled) && oOption)
		{
			$(oOption)
				.toggleClass('disabled', oItem.disabled)
				.prop('disabled', oItem.disabled)
			;
		}
	};

	/**
	 * @param {Object} oViewModel
	 * @param {string} sTemplateID
	 * @param {string} sTitle
	 * @param {Function=} fCallback
	 */
	Utils.windowPopupKnockout = function (oViewModel, sTemplateID, sTitle, fCallback)
	{
		var
			oScript = null,
			oWin = window.open(''),
			sFunc = '__OpenerApplyBindingsUid' + Utils.fakeMd5() + '__',
			oTemplate = $('#' + sTemplateID)
		;

		window[sFunc] = function () {

			if (oWin && oWin.document.body && oTemplate && oTemplate[0])
			{
				var oBody = $(oWin.document.body);

				$('#rl-content', oBody).html(oTemplate.html());
				$('html', oWin.document).addClass('external ' + $('html').attr('class'));

				Utils.i18nToNode(oBody);

				kn.applyExternal(oViewModel, $('#rl-content', oBody)[0]);

				window[sFunc] = null;

				fCallback(oWin);
			}
		};

		oWin.document.open();
		oWin.document.write('<html><head>' +
	'<meta charset="utf-8" />' +
	'<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />' +
	'<meta name="viewport" content="user-scalable=no" />' +
	'<meta name="apple-mobile-web-app-capable" content="yes" />' +
	'<meta name="robots" content="noindex, nofollow, noodp" />' +
	'<title>' + Utils.encodeHtml(sTitle) + '</title>' +
	'</head><body><div id="rl-content"></div></body></html>');
		oWin.document.close();

		oScript = oWin.document.createElement('script');
		oScript.type = 'text/javascript';
		oScript.innerHTML = 'if(window&&window.opener&&window.opener[\'' + sFunc + '\']){window.opener[\'' + sFunc + '\']();window.opener[\'' + sFunc + '\']=null}';
		oWin.document.getElementsByTagName('head')[0].appendChild(oScript);
	};

	Utils.settingsSaveHelperFunction = function (fCallback, koTrigger, oContext, iTimer)
	{
		oContext = oContext || null;
		iTimer = Utils.isUnd(iTimer) ? 1000 : Utils.pInt(iTimer);
		return function (sType, mData, bCached, sRequestAction, oRequestParameters) {
			koTrigger.call(oContext, mData && mData['Result'] ? Enums.SaveSettingsStep.TrueResult : Enums.SaveSettingsStep.FalseResult);
			if (fCallback)
			{
				fCallback.call(oContext, sType, mData, bCached, sRequestAction, oRequestParameters);
			}
			_.delay(function () {
				koTrigger.call(oContext, Enums.SaveSettingsStep.Idle);
			}, iTimer);
		};
	};

	Utils.settingsSaveHelperSimpleFunction = function (koTrigger, oContext)
	{
		return Utils.settingsSaveHelperFunction(null, koTrigger, oContext, 1000);
	};

	Utils.$div = $('<div></div>');

	/**
	 * @param {string} sHtml
	 * @return {string}
	 */
	Utils.htmlToPlain = function (sHtml)
	{
		var
			iPos = 0,
			iP1 = 0,
			iP2 = 0,
			iP3 = 0,
			iLimit = 0,

			sText = '',

			splitPlainText = function (sText)
			{
				var
					iLen = 100,
					sPrefix = '',
					sSubText = '',
					sResult = sText,
					iSpacePos = 0,
					iNewLinePos = 0
				;

				while (sResult.length > iLen)
				{
					sSubText = sResult.substring(0, iLen);
					iSpacePos = sSubText.lastIndexOf(' ');
					iNewLinePos = sSubText.lastIndexOf('\n');

					if (-1 !== iNewLinePos)
					{
						iSpacePos = iNewLinePos;
					}

					if (-1 === iSpacePos)
					{
						iSpacePos = iLen;
					}

					sPrefix += sSubText.substring(0, iSpacePos) + '\n';
					sResult = sResult.substring(iSpacePos + 1);
				}

				return sPrefix + sResult;
			},

			convertBlockquote = function (sText) {
				sText = splitPlainText($.trim(sText));
				sText = '> ' + sText.replace(/\n/gm, '\n> ');
				return sText.replace(/(^|\n)([> ]+)/gm, function () {
					return (arguments && 2 < arguments.length) ? arguments[1] + $.trim(arguments[2].replace(/[\s]/, '')) + ' ' : '';
				});
			},

			convertDivs = function () {
				if (arguments && 1 < arguments.length)
				{
					var sText = $.trim(arguments[1]);
					if (0 < sText.length)
					{
						sText = sText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs);
						sText = '\n' + $.trim(sText) + '\n';
					}

					return sText;
				}

				return '';
			},

			convertPre = function () {
				return (arguments && 1 < arguments.length) ? arguments[1].toString().replace(/[\n]/gm, '<br />') : '';
			},

			fixAttibuteValue = function () {
				return (arguments && 1 < arguments.length) ?
					'' + arguments[1] + arguments[2].replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
			},

			convertLinks = function () {
				return (arguments && 1 < arguments.length) ? $.trim(arguments[1]) : '';
			}
		;

		sText = sHtml
			.replace(/<pre[^>]*>([\s\S\r\n]*)<\/pre>/gmi, convertPre)
			.replace(/[\s]+/gm, ' ')
			.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gmi, fixAttibuteValue)
			.replace(/<br[^>]*>/gmi, '\n')
			.replace(/<\/h[\d]>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<\/li>/gi, '\n')
			.replace(/<\/td>/gi, '\n')
			.replace(/<\/tr>/gi, '\n')
			.replace(/<hr[^>]*>/gmi, '\n_______________________________\n\n')
			.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs)
			.replace(/<blockquote[^>]*>/gmi, '\n__bq__start__\n')
			.replace(/<\/blockquote>/gmi, '\n__bq__end__\n')
			.replace(/<a [^>]*>([\s\S\r\n]*?)<\/a>/gmi, convertLinks)
			.replace(/<\/div>/gi, '\n')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&quot;/gi, '"')
			.replace(/<[^>]*>/gm, '')
		;

		sText = Utils.$div.html(sText).text();

		sText = sText
			.replace(/\n[ \t]+/gm, '\n')
			.replace(/[\n]{3,}/gm, '\n\n')
			.replace(/&gt;/gi, '>')
			.replace(/&lt;/gi, '<')
			.replace(/&amp;/gi, '&')
		;

		iPos = 0;
		iLimit = 100;

		while (0 < iLimit)
		{
			iLimit--;
			iP1 = sText.indexOf('__bq__start__', iPos);
			if (-1 < iP1)
			{
				iP2 = sText.indexOf('__bq__start__', iP1 + 5);
				iP3 = sText.indexOf('__bq__end__', iP1 + 5);

				if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3)
				{
					sText = sText.substring(0, iP1) +
						convertBlockquote(sText.substring(iP1 + 13, iP3)) +
						sText.substring(iP3 + 11);

					iPos = 0;
				}
				else if (-1 < iP2 && iP2 < iP3)
				{
					iPos = iP2 - 1;
				}
				else
				{
					iPos = 0;
				}
			}
			else
			{
				break;
			}
		}

		sText = sText
			.replace(/__bq__start__/gm, '')
			.replace(/__bq__end__/gm, '')
		;

		return sText;
	};

	/**
	 * @param {string} sPlain
	 * @param {boolean} bLinkify = false
	 * @return {string}
	 */
	Utils.plainToHtml = function (sPlain, bLinkify)
	{
		sPlain = sPlain.toString().replace(/\r/g, '');

		var
			bIn = false,
			bDo = true,
			bStart = true,
			aNextText = [],
			sLine = '',
			iIndex = 0,
			aText = sPlain.split("\n")
		;

		do
		{
			bDo = false;
			aNextText = [];
			for (iIndex = 0; iIndex < aText.length; iIndex++)
			{
				sLine = aText[iIndex];
				bStart = '>' === sLine.substr(0, 1);
				if (bStart && !bIn)
				{
					bDo = true;
					bIn = true;
					aNextText.push('~~~blockquote~~~');
					aNextText.push(sLine.substr(1));
				}
				else if (!bStart && bIn)
				{
					bIn = false;
					aNextText.push('~~~/blockquote~~~');
					aNextText.push(sLine);
				}
				else if (bStart && bIn)
				{
					aNextText.push(sLine.substr(1));
				}
				else
				{
					aNextText.push(sLine);
				}
			}

			if (bIn)
			{
				bIn = false;
				aNextText.push('~~~/blockquote~~~');
			}

			aText = aNextText;
		}
		while (bDo);

		sPlain = aText.join("\n");

		sPlain = sPlain
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;').replace(/</g, '&lt;')
			.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
			.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/[\-_~]{10,}/g, '<hr />')
			.replace(/\n/g, '<br />');

		return bLinkify ? Utils.linkify(sPlain) : sPlain;
	};

	window.rainloop_Utils_htmlToPlain = Utils.htmlToPlain;
	window.rainloop_Utils_plainToHtml = Utils.plainToHtml;

	/**
	 * @param {string} sHtml
	 * @return {string}
	 */
	Utils.linkify = function (sHtml)
	{
		if ($.fn && $.fn.linkify)
		{
			sHtml = Utils.$div.html(sHtml.replace(/&amp;/ig, 'amp_amp_12345_amp_amp'))
				.linkify()
				.find('.linkified').removeClass('linkified').end()
				.html()
				.replace(/amp_amp_12345_amp_amp/g, '&amp;')
			;
		}

		return sHtml;
	};

	Utils.resizeAndCrop = function (sUrl, iValue, fCallback)
	{
		var oTempImg = new window.Image();
		oTempImg.onload = function() {

			var
				aDiff = [0, 0],
				oCanvas = document.createElement('canvas'),
				oCtx = oCanvas.getContext('2d')
			;

			oCanvas.width = iValue;
			oCanvas.height = iValue;

			if (this.width > this.height)
			{
				aDiff = [this.width - this.height, 0];
			}
			else
			{
				aDiff = [0, this.height - this.width];
			}

			oCtx.fillStyle = '#fff';
			oCtx.fillRect(0, 0, iValue, iValue);
			oCtx.drawImage(this, aDiff[0] / 2, aDiff[1] / 2, this.width - aDiff[0], this.height - aDiff[1], 0, 0, iValue, iValue);

			fCallback(oCanvas.toDataURL('image/jpeg'));
		};

		oTempImg.src = sUrl;
	};

	Utils.computedPagenatorHelper = function (koCurrentPage, koPageCount)
	{
		return function() {
			var
				iPrev = 0,
				iNext = 0,
				iLimit = 2,
				aResult = [],
				iCurrentPage = koCurrentPage(),
				iPageCount = koPageCount(),

				/**
				 * @param {number} iIndex
				 * @param {boolean=} bPush
				 * @param {string=} sCustomName
				 */
				fAdd = function (iIndex, bPush, sCustomName) {

					var oData = {
						'current': iIndex === iCurrentPage,
						'name': Utils.isUnd(sCustomName) ? iIndex.toString() : sCustomName.toString(),
						'custom': Utils.isUnd(sCustomName) ? false : true,
						'title': Utils.isUnd(sCustomName) ? '' : iIndex.toString(),
						'value': iIndex.toString()
					};

					if (Utils.isUnd(bPush) ? true : !!bPush)
					{
						aResult.push(oData);
					}
					else
					{
						aResult.unshift(oData);
					}
				}
			;

			if (1 < iPageCount || (0 < iPageCount && iPageCount < iCurrentPage))
	//		if (0 < iPageCount && 0 < iCurrentPage)
			{
				if (iPageCount < iCurrentPage)
				{
					fAdd(iPageCount);
					iPrev = iPageCount;
					iNext = iPageCount;
				}
				else
				{
					if (3 >= iCurrentPage || iPageCount - 2 <= iCurrentPage)
					{
						iLimit += 2;
					}

					fAdd(iCurrentPage);
					iPrev = iCurrentPage;
					iNext = iCurrentPage;
				}

				while (0 < iLimit) {

					iPrev -= 1;
					iNext += 1;

					if (0 < iPrev)
					{
						fAdd(iPrev, false);
						iLimit--;
					}

					if (iPageCount >= iNext)
					{
						fAdd(iNext, true);
						iLimit--;
					}
					else if (0 >= iPrev)
					{
						break;
					}
				}

				if (3 === iPrev)
				{
					fAdd(2, false);
				}
				else if (3 < iPrev)
				{
					fAdd(Math.round((iPrev - 1) / 2), false, '...');
				}

				if (iPageCount - 2 === iNext)
				{
					fAdd(iPageCount - 1, true);
				}
				else if (iPageCount - 2 > iNext)
				{
					fAdd(Math.round((iPageCount + iNext) / 2), true, '...');
				}

				// first and last
				if (1 < iPrev)
				{
					fAdd(1, false);
				}

				if (iPageCount > iNext)
				{
					fAdd(iPageCount, true);
				}
			}

			return aResult;
		};
	};

	Utils.selectElement = function (element)
	{
		/* jshint onevar: false */
		if (window.getSelection)
		{
			var sel = window.getSelection();
			sel.removeAllRanges();
			var range = document.createRange();
			range.selectNodeContents(element);
			sel.addRange(range);
		}
		else if (document.selection)
		{
			var textRange = document.body.createTextRange();
			textRange.moveToElementText(element);
			textRange.select();
		}
		/* jshint onevar: true */
	};

	Utils.disableKeyFilter = function ()
	{
		if (window.key)
		{
			key.filter = function () {
				return RL.data().useKeyboardShortcuts();
			};
		}
	};

	Utils.restoreKeyFilter = function ()
	{
		if (window.key)
		{
			key.filter = function (event) {

				if (RL.data().useKeyboardShortcuts())
				{
					var
						element = event.target || event.srcElement,
						tagName = element ? element.tagName : ''
					;

					tagName = tagName.toUpperCase();
					return !(tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA' ||
						(element && tagName === 'DIV' && 'editorHtmlArea' === element.className && element.contentEditable)
					);
				}

				return false;
			};
		}
	};

	Utils.detectDropdownVisibility = _.debounce(function () {
		Globals.dropdownVisibility(!!_.find(Globals.aBootstrapDropdowns, function (oItem) {
			return oItem.hasClass('open');
		}));
	}, 50);

	Utils.triggerAutocompleteInputChange = function (bDelay) {

		var fFunc = function () {
			$('.checkAutocomplete').trigger('change');
		};

		if (bDelay)
		{
			_.delay(fFunc, 100);
		}
		else
		{
			fFunc();
		}
	};

	module.exports = Utils;

}(module));
},{"../External/$doc.js":11,"../External/$window.js":13,"../External/NotificationClass.js":16,"../External/jquery.js":19,"../External/key.js":20,"../External/ko.js":21,"../External/underscore.js":24,"../External/window.js":25,"../Knoin/Knoin.js":26,"../Storages/LocalStorage.js":36,"./Enums.js":5,"./Globals.js":6}],10:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = require('./jquery.js')('<div></div>');

},{"./jquery.js":19}],11:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = require('./jquery.js')(window.document);

},{"./jquery.js":19}],12:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = require('./jquery.js')('html');

},{"./jquery.js":19}],13:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = require('./jquery.js')(window);

},{"./jquery.js":19}],14:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = require('./window.js')['rainloopAppData'] || {};
},{"./window.js":25}],15:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = JSON;
},{}],16:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

var
	window = require('./window.js')
;

module.exports = window.Notification && window.Notification.requestPermission ? window.Notification : null;
},{"./window.js":25}],17:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = crossroads;
},{}],18:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = hasher;
},{}],19:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = $;
},{}],20:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = key;
},{}],21:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('./jquery.js'),
		_ = require('./underscore.js'),
		window = require('./window.js'),
		$window = require('./$window.js'),
		$doc = require('./$doc.js'),

		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),

		RL = require('../RL.js')
	;

	ko.bindingHandlers.tooltip = {
		'init': function (oElement, fValueAccessor) {
			if (!Globals.bMobileDevice)
			{
				var
					$oEl = $(oElement),
					sClass = $oEl.data('tooltip-class') || '',
					sPlacement = $oEl.data('tooltip-placement') || 'top'
				;

				$oEl.tooltip({
					'delay': {
						'show': 500,
						'hide': 100
					},
					'html': true,
					'container': 'body',
					'placement': sPlacement,
					'trigger': 'hover',
					'title': function () {
						return $oEl.is('.disabled') || Globals.dropdownVisibility() ? '' : '<span class="tooltip-class ' + sClass + '">' +
							Utils.i18n(ko.utils.unwrapObservable(fValueAccessor())) + '</span>';
					}
				}).click(function () {
					$oEl.tooltip('hide');
				});

				Globals.tooltipTrigger.subscribe(function () {
					$oEl.tooltip('hide');
				});
			}
		}
	};

	ko.bindingHandlers.tooltip2 = {
		'init': function (oElement, fValueAccessor) {
			var
				$oEl = $(oElement),
				sClass = $oEl.data('tooltip-class') || '',
				sPlacement = $oEl.data('tooltip-placement') || 'top'
			;

			$oEl.tooltip({
				'delay': {
					'show': 500,
					'hide': 100
				},
				'html': true,
				'container': 'body',
				'placement': sPlacement,
				'title': function () {
					return $oEl.is('.disabled') || Globals.dropdownVisibility() ? '' :
						'<span class="tooltip-class ' + sClass + '">' + fValueAccessor()() + '</span>';
				}
			}).click(function () {
				$oEl.tooltip('hide');
			});

			Globals.tooltipTrigger.subscribe(function () {
				$oEl.tooltip('hide');
			});
		}
	};

	ko.bindingHandlers.tooltip3 = {
		'init': function (oElement) {

			var $oEl = $(oElement);

			$oEl.tooltip({
				'container': 'body',
				'trigger': 'hover manual',
				'title': function () {
					return $oEl.data('tooltip3-data') || '';
				}
			});

			$doc.click(function () {
				$oEl.tooltip('hide');
			});

			Globals.tooltipTrigger.subscribe(function () {
				$oEl.tooltip('hide');
			});
		},
		'update': function (oElement, fValueAccessor) {
			var sValue = ko.utils.unwrapObservable(fValueAccessor());
			if ('' === sValue)
			{
				$(oElement).data('tooltip3-data', '').tooltip('hide');
			}
			else
			{
				$(oElement).data('tooltip3-data', sValue).tooltip('show');
			}
		}
	};

	ko.bindingHandlers.registrateBootstrapDropdown = {
		'init': function (oElement) {
			Globals.aBootstrapDropdowns.push($(oElement));
		}
	};

	ko.bindingHandlers.openDropdownTrigger = {
		'update': function (oElement, fValueAccessor) {
			if (ko.utils.unwrapObservable(fValueAccessor()))
			{
				var $el = $(oElement);
				if (!$el.hasClass('open'))
				{
					$el.find('.dropdown-toggle').dropdown('toggle');
					Utils.detectDropdownVisibility();
				}

				fValueAccessor()(false);
			}
		}
	};

	ko.bindingHandlers.dropdownCloser = {
		'init': function (oElement) {
			$(oElement).closest('.dropdown').on('click', '.e-item', function () {
				$(oElement).dropdown('toggle');
			});
		}
	};

	ko.bindingHandlers.popover = {
		'init': function (oElement, fValueAccessor) {
			$(oElement).popover(ko.utils.unwrapObservable(fValueAccessor()));
		}
	};

	ko.bindingHandlers.csstext = {
		'init': function (oElement, fValueAccessor) {
			if (oElement && oElement.styleSheet && !Utils.isUnd(oElement.styleSheet.cssText))
			{
				oElement.styleSheet.cssText = ko.utils.unwrapObservable(fValueAccessor());
			}
			else
			{
				$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
			}
		},
		'update': function (oElement, fValueAccessor) {
			if (oElement && oElement.styleSheet && !Utils.isUnd(oElement.styleSheet.cssText))
			{
				oElement.styleSheet.cssText = ko.utils.unwrapObservable(fValueAccessor());
			}
			else
			{
				$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
			}
		}
	};

	ko.bindingHandlers.resizecrop = {
		'init': function (oElement) {
			$(oElement).addClass('resizecrop').resizecrop({
				'width': '100',
				'height': '100',
				'wrapperCSS': {
					'border-radius': '10px'
				}
			});
		},
		'update': function (oElement, fValueAccessor) {
			fValueAccessor()();
			$(oElement).resizecrop({
				'width': '100',
				'height': '100'
			});
		}
	};

	ko.bindingHandlers.onEnter = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			$(oElement).on('keypress',  function (oEvent) {
				if (oEvent && 13 === window.parseInt(oEvent.keyCode, 10))
				{
					$(oElement).trigger('change');
					fValueAccessor().call(oViewModel);
				}
			});
		}
	};

	ko.bindingHandlers.onEsc = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			$(oElement).on('keypress', function (oEvent) {
				if (oEvent && 27 === window.parseInt(oEvent.keyCode, 10))
				{
					$(oElement).trigger('change');
					fValueAccessor().call(oViewModel);
				}
			});
		}
	};

	ko.bindingHandlers.clickOnTrue = {
		'update': function (oElement, fValueAccessor) {
			if (ko.utils.unwrapObservable(fValueAccessor()))
			{
				$(oElement).click();
			}
		}
	};

	ko.bindingHandlers.modal = {
		'init': function (oElement, fValueAccessor) {

			$(oElement).toggleClass('fade', !Globals.bMobileDevice).modal({
				'keyboard': false,
				'show': ko.utils.unwrapObservable(fValueAccessor())
			})
			.on('shown', function () {
				Utils.windowResize();
			})
			.find('.close').click(function () {
				fValueAccessor()(false);
			});
		},
		'update': function (oElement, fValueAccessor) {
			$(oElement).modal(ko.utils.unwrapObservable(fValueAccessor()) ? 'show' : 'hide');
		}
	};

	ko.bindingHandlers.i18nInit = {
		'init': function (oElement) {
			Utils.i18nToNode(oElement);
		}
	};

	ko.bindingHandlers.i18nUpdate = {
		'update': function (oElement, fValueAccessor) {
			ko.utils.unwrapObservable(fValueAccessor());
			Utils.i18nToNode(oElement);
		}
	};

	ko.bindingHandlers.link = {
		'update': function (oElement, fValueAccessor) {
			$(oElement).attr('href', ko.utils.unwrapObservable(fValueAccessor()));
		}
	};

	ko.bindingHandlers.title = {
		'update': function (oElement, fValueAccessor) {
			$(oElement).attr('title', ko.utils.unwrapObservable(fValueAccessor()));
		}
	};

	ko.bindingHandlers.textF = {
		'init': function (oElement, fValueAccessor) {
			$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
		}
	};

	ko.bindingHandlers.initDom = {
		'init': function (oElement, fValueAccessor) {
			fValueAccessor()(oElement);
		}
	};

	ko.bindingHandlers.initResizeTrigger = {
		'init': function (oElement, fValueAccessor) {
			var aValues = ko.utils.unwrapObservable(fValueAccessor());
			$(oElement).css({
				'height': aValues[1],
				'min-height': aValues[1]
			});
		},
		'update': function (oElement, fValueAccessor) {
			var
				aValues = ko.utils.unwrapObservable(fValueAccessor()),
				iValue = Utils.pInt(aValues[1]),
				iSize = 0,
				iOffset = $(oElement).offset().top
			;

			if (0 < iOffset)
			{
				iOffset += Utils.pInt(aValues[2]);
				iSize = $window.height() - iOffset;

				if (iValue < iSize)
				{
					iValue = iSize;
				}

				$(oElement).css({
					'height': iValue,
					'min-height': iValue
				});
			}
		}
	};

	ko.bindingHandlers.appendDom = {
		'update': function (oElement, fValueAccessor) {
			$(oElement).hide().empty().append(ko.utils.unwrapObservable(fValueAccessor())).show();
		}
	};

	ko.bindingHandlers.draggable = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

			if (!Globals.bMobileDevice)
			{
				var
					iTriggerZone = 100,
					iScrollSpeed = 3,
					fAllValueFunc = fAllBindingsAccessor(),
					sDroppableSelector = fAllValueFunc && fAllValueFunc['droppableSelector'] ? fAllValueFunc['droppableSelector'] : '',
					oConf = {
						'distance': 20,
						'handle': '.dragHandle',
						'cursorAt': {'top': 22, 'left': 3},
						'refreshPositions': true,
						'scroll': true
					}
				;

				if (sDroppableSelector)
				{
					oConf['drag'] = function (oEvent) {

						$(sDroppableSelector).each(function () {
							var
								moveUp = null,
								moveDown = null,
								$this = $(this),
								oOffset = $this.offset(),
								bottomPos = oOffset.top + $this.height()
							;

							window.clearInterval($this.data('timerScroll'));
							$this.data('timerScroll', false);

							if (oEvent.pageX >= oOffset.left && oEvent.pageX <= oOffset.left + $this.width())
							{
								if (oEvent.pageY >= bottomPos - iTriggerZone && oEvent.pageY <= bottomPos)
								{
									moveUp = function() {
										$this.scrollTop($this.scrollTop() + iScrollSpeed);
										Utils.windowResize();
									};

									$this.data('timerScroll', window.setInterval(moveUp, 10));
									moveUp();
								}

								if (oEvent.pageY >= oOffset.top && oEvent.pageY <= oOffset.top + iTriggerZone)
								{
									moveDown = function() {
										$this.scrollTop($this.scrollTop() - iScrollSpeed);
										Utils.windowResize();
									};

									$this.data('timerScroll', window.setInterval(moveDown, 10));
									moveDown();
								}
							}
						});
					};

					oConf['stop'] =	function() {
						$(sDroppableSelector).each(function () {
							window.clearInterval($(this).data('timerScroll'));
							$(this).data('timerScroll', false);
						});
					};
				}

				oConf['helper'] = function (oEvent) {
					return fValueAccessor()(oEvent && oEvent.target ? ko.dataFor(oEvent.target) : null);
				};

				$(oElement).draggable(oConf).on('mousedown', function () {
					Utils.removeInFocus();
				});
			}
		}
	};

	ko.bindingHandlers.droppable = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

			if (!Globals.bMobileDevice)
			{
				var
					fValueFunc = fValueAccessor(),
					fAllValueFunc = fAllBindingsAccessor(),
					fOverCallback = fAllValueFunc && fAllValueFunc['droppableOver'] ? fAllValueFunc['droppableOver'] : null,
					fOutCallback = fAllValueFunc && fAllValueFunc['droppableOut'] ? fAllValueFunc['droppableOut'] : null,
					oConf = {
						'tolerance': 'pointer',
						'hoverClass': 'droppableHover'
					}
				;

				if (fValueFunc)
				{
					oConf['drop'] = function (oEvent, oUi) {
						fValueFunc(oEvent, oUi);
					};

					if (fOverCallback)
					{
						oConf['over'] = function (oEvent, oUi) {
							fOverCallback(oEvent, oUi);
						};
					}

					if (fOutCallback)
					{
						oConf['out'] = function (oEvent, oUi) {
							fOutCallback(oEvent, oUi);
						};
					}

					$(oElement).droppable(oConf);
				}
			}
		}
	};

	ko.bindingHandlers.nano = {
		'init': function (oElement) {
			if (!Globals.bDisableNanoScroll)
			{
				$(oElement)
					.addClass('nano')
					.nanoScroller({
						'iOSNativeScrolling': false,
						'preventPageScrolling': true
					})
				;
			}
		}
	};

	ko.bindingHandlers.saveTrigger = {
		'init': function (oElement) {

			var $oEl = $(oElement);

			$oEl.data('save-trigger-type', $oEl.is('input[type=text],input[type=email],input[type=password],select,textarea') ? 'input' : 'custom');

			if ('custom' === $oEl.data('save-trigger-type'))
			{
				$oEl.append(
					'&nbsp;&nbsp;<i class="icon-spinner animated"></i><i class="icon-remove error"></i><i class="icon-ok success"></i>'
				).addClass('settings-saved-trigger');
			}
			else
			{
				$oEl.addClass('settings-saved-trigger-input');
			}
		},
		'update': function (oElement, fValueAccessor) {
			var
				mValue = ko.utils.unwrapObservable(fValueAccessor()),
				$oEl = $(oElement)
			;

			if ('custom' === $oEl.data('save-trigger-type'))
			{
				switch (mValue.toString())
				{
					case '1':
						$oEl
							.find('.animated,.error').hide().removeClass('visible')
							.end()
							.find('.success').show().addClass('visible')
						;
						break;
					case '0':
						$oEl
							.find('.animated,.success').hide().removeClass('visible')
							.end()
							.find('.error').show().addClass('visible')
						;
						break;
					case '-2':
						$oEl
							.find('.error,.success').hide().removeClass('visible')
							.end()
							.find('.animated').show().addClass('visible')
						;
						break;
					default:
						$oEl
							.find('.animated').hide()
							.end()
							.find('.error,.success').removeClass('visible')
						;
						break;
				}
			}
			else
			{
				switch (mValue.toString())
				{
					case '1':
						$oEl.addClass('success').removeClass('error');
						break;
					case '0':
						$oEl.addClass('error').removeClass('success');
						break;
					case '-2':
	//					$oEl;
						break;
					default:
						$oEl.removeClass('error success');
						break;
				}
			}
		}
	};

	ko.bindingHandlers.emailsTags = {
		'init': function(oElement, fValueAccessor) {
			var
				$oEl = $(oElement),
				fValue = fValueAccessor(),
				fFocusCallback = function (bValue) {
					if (fValue && fValue.focusTrigger)
					{
						fValue.focusTrigger(bValue);
					}
				}
			;

			$oEl.inputosaurus({
				'parseOnBlur': true,
				'allowDragAndDrop': true,
				'focusCallback': fFocusCallback,
				'inputDelimiters': [',', ';'],
				'autoCompleteSource': function (oData, fResponse) {
					RL().getAutocomplete(oData.term, function (aData) {
						fResponse(_.map(aData, function (oEmailItem) {
							return oEmailItem.toLine(false);
						}));
					});
				},
				'parseHook': function (aInput) {
					return _.map(aInput, function (sInputValue) {

						var
							sValue = Utils.trim(sInputValue),
							oEmail = null
						;

						if ('' !== sValue)
						{
							oEmail = new EmailModel();
							oEmail.mailsoParse(sValue);
							oEmail.clearDuplicateName();
							return [oEmail.toLine(false), oEmail];
						}

						return [sValue, null];

					});
				},
				'change': _.bind(function (oEvent) {
					$oEl.data('EmailsTagsValue', oEvent.target.value);
					fValue(oEvent.target.value);
				}, this)
			});
		},
		'update': function (oElement, fValueAccessor, fAllBindingsAccessor) {

			var
				$oEl = $(oElement),
				fAllValueFunc = fAllBindingsAccessor(),
				fEmailsTagsFilter = fAllValueFunc['emailsTagsFilter'] || null,
				sValue = ko.utils.unwrapObservable(fValueAccessor())
			;

			if ($oEl.data('EmailsTagsValue') !== sValue)
			{
				$oEl.val(sValue);
				$oEl.data('EmailsTagsValue', sValue);
				$oEl.inputosaurus('refresh');
			}

			if (fEmailsTagsFilter && ko.utils.unwrapObservable(fEmailsTagsFilter))
			{
				$oEl.inputosaurus('focus');
			}
		}
	};

	ko.bindingHandlers.contactTags = {
		'init': function(oElement, fValueAccessor) {
			var
				$oEl = $(oElement),
				fValue = fValueAccessor(),
				fFocusCallback = function (bValue) {
					if (fValue && fValue.focusTrigger)
					{
						fValue.focusTrigger(bValue);
					}
				}
			;

			$oEl.inputosaurus({
				'parseOnBlur': true,
				'allowDragAndDrop': false,
				'focusCallback': fFocusCallback,
				'inputDelimiters': [',', ';'],
				'outputDelimiter': ',',
				'autoCompleteSource': function (oData, fResponse) {
					RL().getContactTagsAutocomplete(oData.term, function (aData) {
						fResponse(_.map(aData, function (oTagItem) {
							return oTagItem.toLine(false);
						}));
					});
				},
				'parseHook': function (aInput) {
					return _.map(aInput, function (sInputValue) {

						var
							sValue = Utils.trim(sInputValue),
							oTag = null
						;

						if ('' !== sValue)
						{
							oTag = new ContactTagModel();
							oTag.name(sValue);
							return [oTag.toLine(false), oTag];
						}

						return [sValue, null];

					});
				},
				'change': _.bind(function (oEvent) {
					$oEl.data('ContactTagsValue', oEvent.target.value);
					fValue(oEvent.target.value);
				}, this)
			});
		},
		'update': function (oElement, fValueAccessor, fAllBindingsAccessor) {

			var
				$oEl = $(oElement),
				fAllValueFunc = fAllBindingsAccessor(),
				fContactTagsFilter = fAllValueFunc['contactTagsFilter'] || null,
				sValue = ko.utils.unwrapObservable(fValueAccessor())
			;

			if ($oEl.data('ContactTagsValue') !== sValue)
			{
				$oEl.val(sValue);
				$oEl.data('ContactTagsValue', sValue);
				$oEl.inputosaurus('refresh');
			}

			if (fContactTagsFilter && ko.utils.unwrapObservable(fContactTagsFilter))
			{
				$oEl.inputosaurus('focus');
			}
		}
	};

	ko.bindingHandlers.command = {
		'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
			var
				jqElement = $(oElement),
				oCommand = fValueAccessor()
			;

			if (!oCommand || !oCommand.enabled || !oCommand.canExecute)
			{
				throw new Error('You are not using command function');
			}

			jqElement.addClass('command');
			ko.bindingHandlers[jqElement.is('form') ? 'submit' : 'click'].init.apply(oViewModel, arguments);
		},

		'update': function (oElement, fValueAccessor) {

			var
				bResult = true,
				jqElement = $(oElement),
				oCommand = fValueAccessor()
			;

			bResult = oCommand.enabled();
			jqElement.toggleClass('command-not-enabled', !bResult);

			if (bResult)
			{
				bResult = oCommand.canExecute();
				jqElement.toggleClass('command-can-not-be-execute', !bResult);
			}

			jqElement.toggleClass('command-disabled disable disabled', !bResult).toggleClass('no-disabled', !!bResult);

			if (jqElement.is('input') || jqElement.is('button'))
			{
				jqElement.prop('disabled', !bResult);
			}
		}
	};

	ko.extenders.trimmer = function (oTarget)
	{
		var oResult = ko.computed({
			'read': oTarget,
			'write': function (sNewValue) {
				oTarget(Utils.trim(sNewValue.toString()));
			},
			'owner': this
		});

		oResult(oTarget());
		return oResult;
	};

	ko.extenders.posInterer = function (oTarget, iDefault)
	{
		var oResult = ko.computed({
			'read': oTarget,
			'write': function (sNewValue) {
				var iNew = Utils.pInt(sNewValue.toString(), iDefault);
				if (0 >= iNew)
				{
					iNew = iDefault;
				}

				if (iNew === oTarget() && '' + iNew !== '' + sNewValue)
				{
					oTarget(iNew + 1);
				}

				oTarget(iNew);
			}
		});

		oResult(oTarget());
		return oResult;
	};

	ko.extenders.reversible = function (oTarget)
	{
		var mValue = oTarget();

		oTarget.commit = function ()
		{
			mValue = oTarget();
		};

		oTarget.reverse = function ()
		{
			oTarget(mValue);
		};

		oTarget.commitedValue = function ()
		{
			return mValue;
		};

		return oTarget;
	};

	ko.extenders.toggleSubscribe = function (oTarget, oOptions)
	{
		oTarget.subscribe(oOptions[1], oOptions[0], 'beforeChange');
		oTarget.subscribe(oOptions[2], oOptions[0]);

		return oTarget;
	};

	ko.extenders.falseTimeout = function (oTarget, iOption)
	{
		oTarget.iTimeout = 0;
		oTarget.subscribe(function (bValue) {
			if (bValue)
			{
				window.clearTimeout(oTarget.iTimeout);
				oTarget.iTimeout = window.setTimeout(function () {
					oTarget(false);
					oTarget.iTimeout = 0;
				}, Utils.pInt(iOption));
			}
		});

		return oTarget;
	};

	ko.observable.fn.validateNone = function ()
	{
		this.hasError = ko.observable(false);
		return this;
	};

	ko.observable.fn.validateEmail = function ()
	{
		this.hasError = ko.observable(false);

		this.subscribe(function (sValue) {
			sValue = Utils.trim(sValue);
			this.hasError('' !== sValue && !(/^[^@\s]+@[^@\s]+$/.test(sValue)));
		}, this);

		this.valueHasMutated();
		return this;
	};

	ko.observable.fn.validateSimpleEmail = function ()
	{
		this.hasError = ko.observable(false);

		this.subscribe(function (sValue) {
			sValue = Utils.trim(sValue);
			this.hasError('' !== sValue && !(/^.+@.+$/.test(sValue)));
		}, this);

		this.valueHasMutated();
		return this;
	};

	ko.observable.fn.validateFunc = function (fFunc)
	{
		this.hasFuncError = ko.observable(false);

		if (Utils.isFunc(fFunc))
		{
			this.subscribe(function (sValue) {
				this.hasFuncError(!fFunc(sValue));
			}, this);

			this.valueHasMutated();
		}

		return this;
	};

	module.exports = ko;

}(module));
},{"../Common/Globals.js":6,"../Common/Utils.js":9,"../RL.js":32,"./$doc.js":11,"./$window.js":13,"./jquery.js":19,"./underscore.js":24,"./window.js":25}],22:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = moment;
},{}],23:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = ssm;
},{}],24:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = window;
},{}],25:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = window;

},{}],26:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		hasher = require('../External/hasher.js'),
		crossroads = require('../External/crossroads.js'),
		$html = require('../External/$html.js'),
		Globals = require('../Common/Globals.js'),
		Enums = require('../Common/Enums.js'),
		Plugins = require('../Common/Plugins.js'),
		Utils = require('../Common/Utils.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 */
	function Knoin()
	{
		this.sDefaultScreenName = '';
		this.oScreens = {};
		this.oBoot = null;
		this.oCurrentScreen = null;
	}

	/**
	 * @param {Object} thisObject
	 */
	Knoin.constructorEnd = function (thisObject)
	{
		if (Utils.isFunc(thisObject['__constructor_end']))
		{
			thisObject['__constructor_end'].call(thisObject);
		}
	};

	Knoin.prototype.sDefaultScreenName = '';
	Knoin.prototype.oScreens = {};
	Knoin.prototype.oBoot = null;
	Knoin.prototype.oCurrentScreen = null;

	Knoin.prototype.hideLoading = function ()
	{
		$('#rl-loading').hide();
	};

	Knoin.prototype.rl = function ()
	{
		return this.oBoot;
	};

	Knoin.prototype.remote = function ()
	{
		return this.oRemote;
	};

	/**
	 * @param {Object} thisObject
	 */
	Knoin.prototype.constructorEnd = function (thisObject)
	{
		if (Utils.isFunc(thisObject['__constructor_end']))
		{
			thisObject['__constructor_end'].call(thisObject);
		}
	};

	/**
	 * @param {string} sName
	 * @param {Function} ViewModelClass
	 * @param {Function=} AbstractViewModel = KnoinAbstractViewModel
	 */
	Knoin.prototype.extendAsViewModel = function (sName, ViewModelClass, AbstractViewModel)
	{
		if (ViewModelClass)
		{
			if (!AbstractViewModel)
			{
				AbstractViewModel = KnoinAbstractViewModel;
			}

			ViewModelClass.__name = sName;
			Plugins.regViewModelHook(sName, ViewModelClass);
			_.extend(ViewModelClass.prototype, AbstractViewModel.prototype);
		}
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 * @param {string} sLabelName
	 * @param {string} sTemplate
	 * @param {string} sRoute
	 * @param {boolean=} bDefault
	 */
	Knoin.prototype.addSettingsViewModel = function (SettingsViewModelClass, sTemplate, sLabelName, sRoute, bDefault)
	{
		SettingsViewModelClass.__rlSettingsData = {
			'Label':  sLabelName,
			'Template':  sTemplate,
			'Route':  sRoute,
			'IsDefault':  !!bDefault
		};

		Globals.aViewModels['settings'].push(SettingsViewModelClass);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 */
	Knoin.prototype.removeSettingsViewModel = function (SettingsViewModelClass)
	{
		Globals.aViewModels['settings-removed'].push(SettingsViewModelClass);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 */
	Knoin.prototype.disableSettingsViewModel = function (SettingsViewModelClass)
	{
		Globals.aViewModels['settings-disabled'].push(SettingsViewModelClass);
	};

	Knoin.prototype.routeOff = function ()
	{
		hasher.changed.active = false;
	};

	Knoin.prototype.routeOn = function ()
	{
		hasher.changed.active = true;
	};

	/**
	 * @param {string} sScreenName
	 * @return {?Object}
	 */
	Knoin.prototype.screen = function (sScreenName)
	{
		return ('' !== sScreenName && !Utils.isUnd(this.oScreens[sScreenName])) ? this.oScreens[sScreenName] : null;
	};

	/**
	 * @param {Function} ViewModelClass
	 * @param {Object=} oScreen
	 */
	Knoin.prototype.buildViewModel = function (ViewModelClass, oScreen)
	{
		if (ViewModelClass && !ViewModelClass.__builded)
		{
			var
				oViewModel = new ViewModelClass(oScreen),
				sPosition = oViewModel.viewModelPosition(),
				oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
				oViewModelDom = null
			;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = oViewModel;
			oViewModel.data = RL.data(); // TODO cjs

			oViewModel.viewModelName = ViewModelClass.__name;

			if (oViewModelPlace && 1 === oViewModelPlace.length)
			{
				oViewModelDom = $('<div></div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide();
				oViewModelDom.appendTo(oViewModelPlace);

				oViewModel.viewModelDom = oViewModelDom;
				ViewModelClass.__dom = oViewModelDom;

				if ('Popups' === sPosition)
				{
					oViewModel.cancelCommand = oViewModel.closeCommand = Utils.createCommand(oViewModel, function () {
						kn.hideScreenPopup(ViewModelClass); // TODO cjs
					});

					oViewModel.modalVisibility.subscribe(function (bValue) {

						var self = this;
						if (bValue)
						{
							this.viewModelDom.show();
							this.storeAndSetKeyScope();

							RL.popupVisibilityNames.push(this.viewModelName); // TODO cjs
							oViewModel.viewModelDom.css('z-index', 3000 + RL.popupVisibilityNames().length + 10); // TODO cjs

							Utils.delegateRun(this, 'onFocus', [], 500);
						}
						else
						{
							Utils.delegateRun(this, 'onHide');
							this.restoreKeyScope();

							RL.popupVisibilityNames.remove(this.viewModelName); // TODO cjs
							oViewModel.viewModelDom.css('z-index', 2000);

							Globals.tooltipTrigger(!Globals.tooltipTrigger());

							_.delay(function () {
								self.viewModelDom.hide();
							}, 300);
						}

					}, oViewModel);
				}

				Plugins.runHook('view-model-pre-build', [ViewModelClass.__name, oViewModel, oViewModelDom]); // TODO cjs

				ko.applyBindingAccessorsToNode(oViewModelDom[0], {
					'i18nInit': true,
					'template': function () { return {'name': oViewModel.viewModelTemplate()};}
				}, oViewModel);

				Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
				if (oViewModel && 'Popups' === sPosition)
				{
					oViewModel.registerPopupKeyDown();
				}

				Plugins.runHook('view-model-post-build', [ViewModelClass.__name, oViewModel, oViewModelDom]); // TODO cjs
			}
			else
			{
				Utils.log('Cannot find view model position: ' + sPosition);
			}
		}

		return ViewModelClass ? ViewModelClass.__vm : null;
	};

	/**
	 * @param {Object} oViewModel
	 * @param {Object} oViewModelDom
	 */
	Knoin.prototype.applyExternal = function (oViewModel, oViewModelDom)
	{
		if (oViewModel && oViewModelDom)
		{
			ko.applyBindings(oViewModel, oViewModelDom);
		}
	};

	/**
	 * @param {Function} ViewModelClassToHide
	 */
	Knoin.prototype.hideScreenPopup = function (ViewModelClassToHide)
	{
		if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
		{
			ViewModelClassToHide.__vm.modalVisibility(false);
			Plugins.runHook('view-model-on-hide', [ViewModelClassToHide.__name, ViewModelClassToHide.__vm]); // TODO cjs
		}
	};

	/**
	 * @param {Function} ViewModelClassToShow
	 * @param {Array=} aParameters
	 */
	Knoin.prototype.showScreenPopup = function (ViewModelClassToShow, aParameters)
	{
		if (ViewModelClassToShow)
		{
			this.buildViewModel(ViewModelClassToShow);

			if (ViewModelClassToShow.__vm && ViewModelClassToShow.__dom)
			{
				ViewModelClassToShow.__vm.modalVisibility(true);
				Utils.delegateRun(ViewModelClassToShow.__vm, 'onShow', aParameters || []);
				Plugins.runHook('view-model-on-show', [ViewModelClassToShow.__name, ViewModelClassToShow.__vm, aParameters || []]); // TODO cjs
			}
		}
	};

	/**
	 * @param {Function} ViewModelClassToShow
	 * @return {boolean}
	 */
	Knoin.prototype.isPopupVisible = function (ViewModelClassToShow)
	{
		return ViewModelClassToShow && ViewModelClassToShow.__vm ? ViewModelClassToShow.__vm.modalVisibility() : false;
	};

	/**
	 * @param {string} sScreenName
	 * @param {string} sSubPart
	 */
	Knoin.prototype.screenOnRoute = function (sScreenName, sSubPart)
	{
		var
			self = this,
			oScreen = null,
			oCross = null
		;

		if ('' === Utils.pString(sScreenName))
		{
			sScreenName = this.sDefaultScreenName;
		}

		if ('' !== sScreenName)
		{
			oScreen = this.screen(sScreenName);
			if (!oScreen)
			{
				oScreen = this.screen(this.sDefaultScreenName);
				if (oScreen)
				{
					sSubPart = sScreenName + '/' + sSubPart;
					sScreenName = this.sDefaultScreenName;
				}
			}

			if (oScreen && oScreen.__started)
			{
				if (!oScreen.__builded)
				{
					oScreen.__builded = true;

					if (Utils.isNonEmptyArray(oScreen.viewModels()))
					{
						_.each(oScreen.viewModels(), function (ViewModelClass) {
							this.buildViewModel(ViewModelClass, oScreen);
						}, this);
					}

					Utils.delegateRun(oScreen, 'onBuild');
				}

				_.defer(function () {

					// hide screen
					if (self.oCurrentScreen)
					{
						Utils.delegateRun(self.oCurrentScreen, 'onHide');

						if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
						{
							_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

								if (ViewModelClass.__vm && ViewModelClass.__dom &&
									'Popups' !== ViewModelClass.__vm.viewModelPosition())
								{
									ViewModelClass.__dom.hide();
									ViewModelClass.__vm.viewModelVisibility(false);
									Utils.delegateRun(ViewModelClass.__vm, 'onHide');
								}

							});
						}
					}
					// --

					self.oCurrentScreen = oScreen;

					// show screen
					if (self.oCurrentScreen)
					{
						Utils.delegateRun(self.oCurrentScreen, 'onShow');

						Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]); // TODO cjs

						if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
						{
							_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

								if (ViewModelClass.__vm && ViewModelClass.__dom &&
									'Popups' !== ViewModelClass.__vm.viewModelPosition())
								{
									ViewModelClass.__dom.show();
									ViewModelClass.__vm.viewModelVisibility(true);
									Utils.delegateRun(ViewModelClass.__vm, 'onShow');
									Utils.delegateRun(ViewModelClass.__vm, 'onFocus', [], 200);

									Plugins.runHook('view-model-on-show', [ViewModelClass.__name, ViewModelClass.__vm]); // TODO cjs
								}

							}, self);
						}
					}
					// --

					oCross = oScreen.__cross();
					if (oCross)
					{
						oCross.parse(sSubPart);
					}
				});
			}
		}
	};

	/**
	 * @param {Array} aScreensClasses
	 */
	Knoin.prototype.startScreens = function (aScreensClasses)
	{
		$('#rl-content').css({
			'visibility': 'hidden'
		});

		_.each(aScreensClasses, function (CScreen) {

				var
					oScreen = new CScreen(),
					sScreenName = oScreen ? oScreen.screenName() : ''
				;

				if (oScreen && '' !== sScreenName)
				{
					if ('' === this.sDefaultScreenName)
					{
						this.sDefaultScreenName = sScreenName;
					}

					this.oScreens[sScreenName] = oScreen;
				}

			}, this);


		_.each(this.oScreens, function (oScreen) {
			if (oScreen && !oScreen.__started && oScreen.__start)
			{
				oScreen.__started = true;
				oScreen.__start();

				Plugins.runHook('screen-pre-start', [oScreen.screenName(), oScreen]); // TODO cjs
				Utils.delegateRun(oScreen, 'onStart');
				Plugins.runHook('screen-post-start', [oScreen.screenName(), oScreen]); // TODO cjs
			}
		}, this);

		var oCross = crossroads.create();
		oCross.addRoute(/^([a-zA-Z0-9\-]*)\/?(.*)$/, _.bind(this.screenOnRoute, this));

		hasher.initialized.add(oCross.parse, oCross);
		hasher.changed.add(oCross.parse, oCross);
		hasher.init();

		$('#rl-content').css({
			'visibility': 'visible'
		});

		_.delay(function () {
			$html.removeClass('rl-started-trigger').addClass('rl-started');
		}, 50);
	};

	/**
	 * @param {string} sHash
	 * @param {boolean=} bSilence = false
	 * @param {boolean=} bReplace = false
	 */
	Knoin.prototype.setHash = function (sHash, bSilence, bReplace)
	{
		sHash = '#' === sHash.substr(0, 1) ? sHash.substr(1) : sHash;
		sHash = '/' === sHash.substr(0, 1) ? sHash.substr(1) : sHash;

		bReplace = Utils.isUnd(bReplace) ? false : !!bReplace;

		if (Utils.isUnd(bSilence) ? false : !!bSilence)
		{
			hasher.changed.active = false;
			hasher[bReplace ? 'replaceHash' : 'setHash'](sHash);
			hasher.changed.active = true;
		}
		else
		{
			hasher.changed.active = true;
			hasher[bReplace ? 'replaceHash' : 'setHash'](sHash);
			hasher.setHash(sHash);
		}
	};

	/**
	 * @return {Knoin}
	 */
	Knoin.prototype.bootstart = function (RL, Remote)
	{
		this.oBoot = RL;
		this.oRemote = Remote;
		
		var
			window = require('../External/window.js'),
			$window = require('../External/$window.js'),
			$html = require('../External/$html.js'),
			Plugins = require('../Common/Plugins.js'),
			EmailModel = require('../Models/EmailModel.js')
		;
	
		$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

		$window.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);
		$window.unload(function () {
			Globals.bUnload = true;
		});

		$html.on('click.dropdown.data-api', function () {
			Utils.detectDropdownVisibility();
		});

		// export
		window['rl'] = window['rl'] || {};
		window['rl']['addHook'] = Plugins.addHook;
		window['rl']['settingsGet'] = Plugins.mainSettingsGet;
		window['rl']['remoteRequest'] = Plugins.remoteRequest;
		window['rl']['pluginSettingsGet'] = Plugins.settingsGet;
		window['rl']['addSettingsViewModel'] = _.bind(this.addSettingsViewModel, this);
		window['rl']['createCommand'] = Utils.createCommand;

		window['rl']['EmailModel'] = EmailModel;
		window['rl']['Enums'] = Enums;

		window['__RLBOOT'] = function (fCall) {

			// boot
			$(function () {

				if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
				{
					$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

					_.delay(function () {
						
						RL.bootstart();

						$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');
					}, 50);
				}
				else
				{
					fCall(false);
				}

				window['__RLBOOT'] = null;
			});
		};
	};

	module.exports = new Knoin();

}(module));
},{"../Common/Enums.js":5,"../Common/Globals.js":6,"../Common/Plugins.js":8,"../Common/Utils.js":9,"../External/$html.js":12,"../External/$window.js":13,"../External/crossroads.js":17,"../External/hasher.js":18,"../External/jquery.js":19,"../External/ko.js":21,"../External/underscore.js":24,"../External/window.js":25,"../Knoin/KnoinAbstractViewModel.js":28,"../Models/EmailModel.js":30}],27:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	/**
	 * @constructor
	 */
	function KnoinAbstractBoot()
	{

	}

	KnoinAbstractBoot.prototype.bootstart = function ()
	{

	};

	module.exports = KnoinAbstractBoot;

}(module));
},{}],28:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		$window = require('../External/$window.js'),
		Utils = require('../Common/Utils.js'),
		Enums = require('../Common/Enums.js')
	;

	/**
	 * @param {string=} sPosition = ''
	 * @param {string=} sTemplate = ''
	 * @constructor
	 */
	function KnoinAbstractViewModel(sPosition, sTemplate)
	{
		this.bDisabeCloseOnEsc = false;
		this.sPosition = Utils.pString(sPosition);
		this.sTemplate = Utils.pString(sTemplate);

		this.sDefaultKeyScope = Enums.KeyState.None;
		this.sCurrentKeyScope = this.sDefaultKeyScope;

		this.viewModelName = '';
		this.viewModelVisibility = ko.observable(false);
		this.modalVisibility = ko.observable(false).extend({'rateLimit': 0});

		this.viewModelDom = null;
	}

	/**
	 * @type {string}
	 */
	KnoinAbstractViewModel.prototype.sPosition = '';

	/**
	 * @type {string}
	 */
	KnoinAbstractViewModel.prototype.sTemplate = '';

	/**
	 * @type {string}
	 */
	KnoinAbstractViewModel.prototype.viewModelName = '';

	/**
	 * @type {?}
	 */
	KnoinAbstractViewModel.prototype.viewModelDom = null;

	/**
	 * @return {string}
	 */
	KnoinAbstractViewModel.prototype.viewModelTemplate = function ()
	{
		return this.sTemplate;
	};

	/**
	 * @return {string}
	 */
	KnoinAbstractViewModel.prototype.viewModelPosition = function ()
	{
		return this.sPosition;
	};

	KnoinAbstractViewModel.prototype.cancelCommand = KnoinAbstractViewModel.prototype.closeCommand = function ()
	{
	};

	KnoinAbstractViewModel.prototype.storeAndSetKeyScope = function ()
	{
		this.sCurrentKeyScope = RL.data().keyScope(); // TODO cjs
		RL.data().keyScope(this.sDefaultKeyScope); // TODO cjs
	};

	KnoinAbstractViewModel.prototype.restoreKeyScope = function ()
	{
		RL.data().keyScope(this.sCurrentKeyScope); // TODO cjs
	};

	KnoinAbstractViewModel.prototype.registerPopupKeyDown = function ()
	{
		var self = this;
		$window.on('keydown', function (oEvent) {
			if (oEvent && self.modalVisibility && self.modalVisibility())
			{
				if (!this.bDisabeCloseOnEsc && Enums.EventKeyCode.Esc === oEvent.keyCode)
				{
					Utils.delegateRun(self, 'cancelCommand');
					return false;
				}
				else if (Enums.EventKeyCode.Backspace === oEvent.keyCode && !Utils.inFocus())
				{
					return false;
				}
			}

			return true;
		});
	};

	module.exports = KnoinAbstractViewModel;

}(module));
},{"../Common/Enums.js":5,"../Common/Utils.js":9,"../External/$window.js":13,"../External/ko.js":21}],29:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js')
	;
	
	/**
	 * @constructor
	 */
	function AttachmentModel()
	{
		this.mimeType = '';
		this.fileName = '';
		this.estimatedSize = 0;
		this.friendlySize = '';
		this.isInline = false;
		this.isLinked = false;
		this.cid = '';
		this.cidWithOutTags = '';
		this.contentLocation = '';
		this.download = '';
		this.folder = '';
		this.uid = '';
		this.mimeIndex = '';
	}

	/**
	 * @static
	 * @param {AjaxJsonAttachment} oJsonAttachment
	 * @return {?AttachmentModel}
	 */
	AttachmentModel.newInstanceFromJson = function (oJsonAttachment)
	{
		var oAttachmentModel = new AttachmentModel();
		return oAttachmentModel.initByJson(oJsonAttachment) ? oAttachmentModel : null;
	};

	AttachmentModel.prototype.mimeType = '';
	AttachmentModel.prototype.fileName = '';
	AttachmentModel.prototype.estimatedSize = 0;
	AttachmentModel.prototype.friendlySize = '';
	AttachmentModel.prototype.isInline = false;
	AttachmentModel.prototype.isLinked = false;
	AttachmentModel.prototype.cid = '';
	AttachmentModel.prototype.cidWithOutTags = '';
	AttachmentModel.prototype.contentLocation = '';
	AttachmentModel.prototype.download = '';
	AttachmentModel.prototype.folder = '';
	AttachmentModel.prototype.uid = '';
	AttachmentModel.prototype.mimeIndex = '';

	/**
	 * @param {AjaxJsonAttachment} oJsonAttachment
	 */
	AttachmentModel.prototype.initByJson = function (oJsonAttachment)
	{
		var bResult = false;
		if (oJsonAttachment && 'Object/Attachment' === oJsonAttachment['@Object'])
		{
			this.mimeType = (oJsonAttachment.MimeType || '').toLowerCase();
			this.fileName = oJsonAttachment.FileName;
			this.estimatedSize = Utils.pInt(oJsonAttachment.EstimatedSize);
			this.isInline = !!oJsonAttachment.IsInline;
			this.isLinked = !!oJsonAttachment.IsLinked;
			this.cid = oJsonAttachment.CID;
			this.contentLocation = oJsonAttachment.ContentLocation;
			this.download = oJsonAttachment.Download;

			this.folder = oJsonAttachment.Folder;
			this.uid = oJsonAttachment.Uid;
			this.mimeIndex = oJsonAttachment.MimeIndex;

			this.friendlySize = Utils.friendlySize(this.estimatedSize);
			this.cidWithOutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isImage = function ()
	{
		return -1 < Utils.inArray(this.mimeType.toLowerCase(),
			['image/png', 'image/jpg', 'image/jpeg', 'image/gif']
		);
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isText = function ()
	{
		return 'text/' === this.mimeType.substr(0, 5) &&
			-1 === Utils.inArray(this.mimeType, ['text/html']);
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isPdf = function ()
	{
		return Globals.bAllowPdfPreview && 'application/pdf' === this.mimeType;
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkDownload = function ()
	{
		return LinkBuilder.attachmentDownload(this.download); // TODO cjs
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreview = function ()
	{
		return LinkBuilder.attachmentPreview(this.download); // TODO cjs
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreviewAsPlain = function ()
	{
		return LinkBuilder.attachmentPreviewAsPlain(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.generateTransferDownloadUrl = function ()
	{
		var	sLink = this.linkDownload();
		if ('http' !== sLink.substr(0, 4))
		{
			sLink = window.location.protocol + '//' + window.location.host + window.location.pathname + sLink;
		}

		return this.mimeType + ':' + this.fileName + ':' + sLink;
	};

	/**
	 * @param {AttachmentModel} oAttachment
	 * @param {*} oEvent
	 * @return {boolean}
	 */
	AttachmentModel.prototype.eventDragStart = function (oAttachment, oEvent)
	{
		var	oLocalEvent = oEvent.originalEvent || oEvent;
		if (oAttachment && oLocalEvent && oLocalEvent.dataTransfer && oLocalEvent.dataTransfer.setData)
		{
			oLocalEvent.dataTransfer.setData('DownloadURL', this.generateTransferDownloadUrl());
		}

		return true;
	};

	AttachmentModel.prototype.iconClass = function ()
	{
		var
			aParts = this.mimeType.toLocaleString().split('/'),
			sClass = 'icon-file'
		;

		if (aParts && aParts[1])
		{
			if ('image' === aParts[0])
			{
				sClass = 'icon-file-image';
			}
			else if ('text' === aParts[0])
			{
				sClass = 'icon-file-text';
			}
			else if ('audio' === aParts[0])
			{
				sClass = 'icon-file-music';
			}
			else if ('video' === aParts[0])
			{
				sClass = 'icon-file-movie';
			}
			else if (-1 < Utils.inArray(aParts[1],
				['zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2', 'x-zip', 'x-7z', 'x-rar', 'x-tar', 'x-gzip', 'x-bzip', 'x-bzip2', 'x-zip-compressed', 'x-7z-compressed', 'x-rar-compressed']))
			{
				sClass = 'icon-file-zip';
			}
	//		else if (-1 < Utils.inArray(aParts[1],
	//			['pdf', 'x-pdf']))
	//		{
	//			sClass = 'icon-file-pdf';
	//		}
	//		else if (-1 < Utils.inArray(aParts[1], [
	//			'exe', 'x-exe', 'x-winexe', 'bat'
	//		]))
	//		{
	//			sClass = 'icon-console';
	//		}
			else if (-1 < Utils.inArray(aParts[1], [
				'rtf', 'msword', 'vnd.msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document',
				'vnd.openxmlformats-officedocument.wordprocessingml.template',
				'vnd.ms-word.document.macroEnabled.12',
				'vnd.ms-word.template.macroEnabled.12'
			]))
			{
				sClass = 'icon-file-text';
			}
			else if (-1 < Utils.inArray(aParts[1], [
				'excel', 'ms-excel', 'vnd.ms-excel',
				'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'vnd.openxmlformats-officedocument.spreadsheetml.template',
				'vnd.ms-excel.sheet.macroEnabled.12',
				'vnd.ms-excel.template.macroEnabled.12',
				'vnd.ms-excel.addin.macroEnabled.12',
				'vnd.ms-excel.sheet.binary.macroEnabled.12'
			]))
			{
				sClass = 'icon-file-excel';
			}
			else if (-1 < Utils.inArray(aParts[1], [
				'powerpoint', 'ms-powerpoint', 'vnd.ms-powerpoint',
				'vnd.openxmlformats-officedocument.presentationml.presentation',
				'vnd.openxmlformats-officedocument.presentationml.template',
				'vnd.openxmlformats-officedocument.presentationml.slideshow',
				'vnd.ms-powerpoint.addin.macroEnabled.12',
				'vnd.ms-powerpoint.presentation.macroEnabled.12',
				'vnd.ms-powerpoint.template.macroEnabled.12',
				'vnd.ms-powerpoint.slideshow.macroEnabled.12'
			]))
			{
				sClass = 'icon-file-chart-graph';
			}
		}

		return sClass;
	};

	module.exports = AttachmentModel;

}(module));
},{"../Common/Globals.js":6,"../Common/LinkBuilder.js":7,"../Common/Utils.js":9,"../External/window.js":25}],30:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js')
	;

	/**
	 * @param {string=} sEmail
	 * @param {string=} sName
	 *
	 * @constructor
	 */
	function EmailModel(sEmail, sName)
	{
		this.email = sEmail || '';
		this.name = sName || '';
		this.privateType = null;

		this.clearDuplicateName();
	}

	/**
	 * @static
	 * @param {AjaxJsonEmail} oJsonEmail
	 * @return {?EmailModel}
	 */
	EmailModel.newInstanceFromJson = function (oJsonEmail)
	{
		var oEmailModel = new EmailModel();
		return oEmailModel.initByJson(oJsonEmail) ? oEmailModel : null;
	};

	/**
	 * @type {string}
	 */
	EmailModel.prototype.name = '';

	/**
	 * @type {string}
	 */
	EmailModel.prototype.email = '';

	/**
	 * @type {(number|null)}
	 */
	EmailModel.prototype.privateType = null;

	EmailModel.prototype.clear = function ()
	{
		this.email = '';
		this.name = '';
		this.privateType = null;
	};

	/**
	 * @returns {boolean}
	 */
	EmailModel.prototype.validate = function ()
	{
		return '' !== this.name || '' !== this.email;
	};

	/**
	 * @param {boolean} bWithoutName = false
	 * @return {string}
	 */
	EmailModel.prototype.hash = function (bWithoutName)
	{
		return '#' + (bWithoutName ? '' : this.name) + '#' + this.email + '#';
	};

	EmailModel.prototype.clearDuplicateName = function ()
	{
		if (this.name === this.email)
		{
			this.name = '';
		}
	};

	/**
	 * @return {number}
	 */
	EmailModel.prototype.type = function ()
	{
		if (null === this.privateType)
		{
			if (this.email && '@facebook.com' === this.email.substr(-13))
			{
				this.privateType = Enums.EmailType.Facebook;
			}

			if (null === this.privateType)
			{
				this.privateType = Enums.EmailType.Default;
			}
		}

		return this.privateType;
	};

	/**
	 * @param {string} sQuery
	 * @return {boolean}
	 */
	EmailModel.prototype.search = function (sQuery)
	{
		return -1 < (this.name + ' ' + this.email).toLowerCase().indexOf(sQuery.toLowerCase());
	};

	/**
	 * @param {string} sString
	 */
	EmailModel.prototype.parse = function (sString)
	{
		this.clear();

		sString = Utils.trim(sString);

		var
			mRegex = /(?:"([^"]+)")? ?<?(.*?@[^>,]+)>?,? ?/g,
			mMatch = mRegex.exec(sString)
		;

		if (mMatch)
		{
			this.name = mMatch[1] || '';
			this.email = mMatch[2] || '';

			this.clearDuplicateName();
		}
		else if ((/^[^@]+@[^@]+$/).test(sString))
		{
			this.name = '';
			this.email = sString;
		}
	};

	/**
	 * @param {AjaxJsonEmail} oJsonEmail
	 * @return {boolean}
	 */
	EmailModel.prototype.initByJson = function (oJsonEmail)
	{
		var bResult = false;
		if (oJsonEmail && 'Object/Email' === oJsonEmail['@Object'])
		{
			this.name = Utils.trim(oJsonEmail.Name);
			this.email = Utils.trim(oJsonEmail.Email);

			bResult = '' !== this.email;
			this.clearDuplicateName();
		}

		return bResult;
	};

	/**
	 * @param {boolean} bFriendlyView
	 * @param {boolean=} bWrapWithLink = false
	 * @param {boolean=} bEncodeHtml = false
	 * @return {string}
	 */
	EmailModel.prototype.toLine = function (bFriendlyView, bWrapWithLink, bEncodeHtml)
	{
		var sResult = '';
		if ('' !== this.email)
		{
			bWrapWithLink = Utils.isUnd(bWrapWithLink) ? false : !!bWrapWithLink;
			bEncodeHtml = Utils.isUnd(bEncodeHtml) ? false : !!bEncodeHtml;

			if (bFriendlyView && '' !== this.name)
			{
				sResult = bWrapWithLink ? '<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') +
					'" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.name) + '</a>' :
						(bEncodeHtml ? Utils.encodeHtml(this.name) : this.name);
			}
			else
			{
				sResult = this.email;
				if ('' !== this.name)
				{
					if (bWrapWithLink)
					{
						sResult = Utils.encodeHtml('"' + this.name + '" <') +
							'<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(sResult) + '</a>' + Utils.encodeHtml('>');
					}
					else
					{
						sResult = '"' + this.name + '" <' + sResult + '>';
						if (bEncodeHtml)
						{
							sResult = Utils.encodeHtml(sResult);
						}
					}
				}
				else if (bWrapWithLink)
				{
					sResult = '<a href="mailto:' + Utils.encodeHtml(this.email) + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.email) + '</a>';
				}
			}
		}

		return sResult;
	};

	/**
	 * @param {string} $sEmailAddress
	 * @return {boolean}
	 */
	EmailModel.prototype.mailsoParse = function ($sEmailAddress)
	{
		$sEmailAddress = Utils.trim($sEmailAddress);
		if ('' === $sEmailAddress)
		{
			return false;
		}

		var
			substr = function (str, start, len) {
				str += '';
				var	end = str.length;

				if (start < 0) {
					start += end;
				}

				end = typeof len === 'undefined' ? end : (len < 0 ? len + end : len + start);

				return start >= str.length || start < 0 || start > end ? false : str.slice(start, end);
			},

			substr_replace = function (str, replace, start, length) {
				if (start < 0) {
					start = start + str.length;
				}
				length = length !== undefined ? length : str.length;
				if (length < 0) {
					length = length + str.length - start;
				}
				return str.slice(0, start) + replace.substr(0, length) + replace.slice(length) + str.slice(start + length);
			},

			$sName = '',
			$sEmail = '',
			$sComment = '',

			$bInName = false,
			$bInAddress = false,
			$bInComment = false,

			$aRegs = null,

			$iStartIndex = 0,
			$iEndIndex = 0,
			$iCurrentIndex = 0
		;

		while ($iCurrentIndex < $sEmailAddress.length)
		{
			switch ($sEmailAddress.substr($iCurrentIndex, 1))
			{
				case '"':
					if ((!$bInName) && (!$bInAddress) && (!$bInComment))
					{
						$bInName = true;
						$iStartIndex = $iCurrentIndex;
					}
					else if ((!$bInAddress) && (!$bInComment))
					{
						$iEndIndex = $iCurrentIndex;
						$sName = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
						$sEmailAddress = substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
						$iEndIndex = 0;
						$iCurrentIndex = 0;
						$iStartIndex = 0;
						$bInName = false;
					}
					break;
				case '<':
					if ((!$bInName) && (!$bInAddress) && (!$bInComment))
					{
						if ($iCurrentIndex > 0 && $sName.length === 0)
						{
							$sName = substr($sEmailAddress, 0, $iCurrentIndex);
						}

						$bInAddress = true;
						$iStartIndex = $iCurrentIndex;
					}
					break;
				case '>':
					if ($bInAddress)
					{
						$iEndIndex = $iCurrentIndex;
						$sEmail = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
						$sEmailAddress = substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
						$iEndIndex = 0;
						$iCurrentIndex = 0;
						$iStartIndex = 0;
						$bInAddress = false;
					}
					break;
				case '(':
					if ((!$bInName) && (!$bInAddress) && (!$bInComment))
					{
						$bInComment = true;
						$iStartIndex = $iCurrentIndex;
					}
					break;
				case ')':
					if ($bInComment)
					{
						$iEndIndex = $iCurrentIndex;
						$sComment = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
						$sEmailAddress = substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
						$iEndIndex = 0;
						$iCurrentIndex = 0;
						$iStartIndex = 0;
						$bInComment = false;
					}
					break;
				case '\\':
					$iCurrentIndex++;
					break;
			}

			$iCurrentIndex++;
		}

		if ($sEmail.length === 0)
		{
			$aRegs = $sEmailAddress.match(/[^@\s]+@\S+/i);
			if ($aRegs && $aRegs[0])
			{
				$sEmail = $aRegs[0];
			}
			else
			{
				$sName = $sEmailAddress;
			}
		}

		if ($sEmail.length > 0 && $sName.length === 0 && $sComment.length === 0)
		{
			$sName = $sEmailAddress.replace($sEmail, '');
		}

		$sEmail = Utils.trim($sEmail).replace(/^[<]+/, '').replace(/[>]+$/, '');
		$sName = Utils.trim($sName).replace(/^["']+/, '').replace(/["']+$/, '');
		$sComment = Utils.trim($sComment).replace(/^[(]+/, '').replace(/[)]+$/, '');

		// Remove backslash
		$sName = $sName.replace(/\\\\(.)/, '$1');
		$sComment = $sComment.replace(/\\\\(.)/, '$1');

		this.name = $sName;
		this.email = $sEmail;

		this.clearDuplicateName();
		return true;
	};

	/**
	 * @return {string}
	 */
	EmailModel.prototype.inputoTagLine = function ()
	{
		return 0 < this.name.length ? this.name + ' (' + this.email + ')' : this.email;
	};

	module.exports = EmailModel;

}(module));
},{"../Common/Enums.js":5,"../Common/Utils.js":9}],31:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		moment = require('../External/moment.js'),
		$window = require('../External/$window.js'),
		$div = require('../External/$div.js'),

		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		EmailModel = require('./EmailModel.js'),
		AttachmentModel = require('./AttachmentModel.js')
	;

	/**
	* @constructor
	*/
	function MessageModel()
	{
		this.folderFullNameRaw = '';
		this.uid = '';
		this.hash = '';
		this.requestHash = '';
		this.subject = ko.observable('');
		this.subjectPrefix = ko.observable('');
		this.subjectSuffix = ko.observable('');
		this.size = ko.observable(0);
		this.dateTimeStampInUTC = ko.observable(0);
		this.priority = ko.observable(Enums.MessagePriority.Normal);

		this.proxy = false;

		this.fromEmailString = ko.observable('');
		this.fromClearEmailString = ko.observable('');
		this.toEmailsString = ko.observable('');
		this.toClearEmailsString = ko.observable('');

		this.senderEmailsString = ko.observable('');
		this.senderClearEmailsString = ko.observable('');

		this.emails = [];

		this.from = [];
		this.to = [];
		this.cc = [];
		this.bcc = [];
		this.replyTo = [];
		this.deliveredTo = [];

		this.newForAnimation = ko.observable(false);

		this.deleted = ko.observable(false);
		this.unseen = ko.observable(false);
		this.flagged = ko.observable(false);
		this.answered = ko.observable(false);
		this.forwarded = ko.observable(false);
		this.isReadReceipt = ko.observable(false);

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.checked = ko.observable(false);
		this.hasAttachments = ko.observable(false);
		this.attachmentsMainType = ko.observable('');

		this.moment = ko.observable(moment(moment.unix(0)));

		this.attachmentIconClass = ko.computed(function () {
			var sClass = '';
			if (this.hasAttachments())
			{
				sClass = 'icon-attachment';
				switch (this.attachmentsMainType())
				{
					case 'image':
						sClass = 'icon-image';
						break;
					case 'archive':
						sClass = 'icon-file-zip';
						break;
					case 'doc':
						sClass = 'icon-file-text';
						break;
	 //				case 'pdf':
	 //					sClass = 'icon-file-pdf';
	 //					break;
				}
			}
			return sClass;
		}, this);

		this.fullFormatDateValue = ko.computed(function () {
			return MessageModel.calculateFullFromatDateValue(this.dateTimeStampInUTC());
		}, this);

		this.momentDate = Utils.createMomentDate(this);
		this.momentShortDate = Utils.createMomentShortDate(this);

		this.dateTimeStampInUTC.subscribe(function (iValue) {
			var iNow = moment().unix();
			this.moment(moment.unix(iNow < iValue ? iNow : iValue));
		}, this);

		this.body = null;
		this.plainRaw = '';
		this.isHtml = ko.observable(false);
		this.hasImages = ko.observable(false);
		this.attachments = ko.observableArray([]);

		this.isPgpSigned = ko.observable(false);
		this.isPgpEncrypted = ko.observable(false);
		this.pgpSignedVerifyStatus = ko.observable(Enums.SignedVerifyStatus.None);
		this.pgpSignedVerifyUser = ko.observable('');

		this.priority = ko.observable(Enums.MessagePriority.Normal);
		this.readReceipt = ko.observable('');

		this.aDraftInfo = [];
		this.sMessageId = '';
		this.sInReplyTo = '';
		this.sReferences = '';

		this.parentUid = ko.observable(0);
		this.threads = ko.observableArray([]);
		this.threadsLen = ko.observable(0);
		this.hasUnseenSubMessage = ko.observable(false);
		this.hasFlaggedSubMessage = ko.observable(false);

		this.lastInCollapsedThread = ko.observable(false);
		this.lastInCollapsedThreadLoading = ko.observable(false);

		this.threadsLenResult = ko.computed(function () {
			var iCount = this.threadsLen();
			return 0 === this.parentUid() && 0 < iCount ? iCount + 1 : '';
		}, this);
	}

	/**
	* @static
	* @param {AjaxJsonMessage} oJsonMessage
	* @return {?MessageModel}
	*/
	MessageModel.newInstanceFromJson = function (oJsonMessage)
	{
		var oMessageModel = new MessageModel();
		return oMessageModel.initByJson(oJsonMessage) ? oMessageModel : null;
	};

	/**
	* @static
	* @param {number} iTimeStampInUTC
	* @return {string}
	*/
	MessageModel.calculateFullFromatDateValue = function (iTimeStampInUTC)
	{
		return 0 < iTimeStampInUTC ? moment.unix(iTimeStampInUTC).format('LLL') : '';
	};

	/**
	* @static
	* @param {Array} aEmail
	* @param {boolean=} bFriendlyView
	* @param {boolean=} bWrapWithLink = false
	* @return {string}
	*/
	MessageModel.emailsToLine = function (aEmail, bFriendlyView, bWrapWithLink)
	{
		var
			aResult = [],
			iIndex = 0,
			iLen = 0
		;

		if (Utils.isNonEmptyArray(aEmail))
		{
			for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
			{
				aResult.push(aEmail[iIndex].toLine(bFriendlyView, bWrapWithLink));
			}
		}

		return aResult.join(', ');
	};

	/**
	* @static
	* @param {Array} aEmail
	* @return {string}
	*/
	MessageModel.emailsToLineClear = function (aEmail)
	{
		var
			aResult = [],
			iIndex = 0,
			iLen = 0
		;

		if (Utils.isNonEmptyArray(aEmail))
		{
			for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
			{
				if (aEmail[iIndex] && aEmail[iIndex].email && '' !== aEmail[iIndex].name)
				{
					aResult.push(aEmail[iIndex].email);
				}
			}
		}

		return aResult.join(', ');
	};

	/**
	* @static
	* @param {?Array} aJsonEmails
	* @return {Array.<EmailModel>}
	*/
	MessageModel.initEmailsFromJson = function (aJsonEmails)
	{
		var
			iIndex = 0,
			iLen = 0,
			oEmailModel = null,
			aResult = []
		;

		if (Utils.isNonEmptyArray(aJsonEmails))
		{
			for (iIndex = 0, iLen = aJsonEmails.length; iIndex < iLen; iIndex++)
			{
				oEmailModel = EmailModel.newInstanceFromJson(aJsonEmails[iIndex]);
				if (oEmailModel)
				{
					aResult.push(oEmailModel);
				}
			}
		}

		return aResult;
	};

	/**
	* @static
	* @param {Array.<EmailModel>} aMessageEmails
	* @param {Object} oLocalUnic
	* @param {Array} aLocalEmails
	*/
	MessageModel.replyHelper = function (aMessageEmails, oLocalUnic, aLocalEmails)
	{
	   if (aMessageEmails && 0 < aMessageEmails.length)
	   {
		   var
			   iIndex = 0,
			   iLen = aMessageEmails.length
		   ;

		   for (; iIndex < iLen; iIndex++)
		   {
			   if (Utils.isUnd(oLocalUnic[aMessageEmails[iIndex].email]))
			   {
				   oLocalUnic[aMessageEmails[iIndex].email] = true;
				   aLocalEmails.push(aMessageEmails[iIndex]);
			   }
		   }
	   }
	};

	MessageModel.prototype.clear = function ()
	{
	   this.folderFullNameRaw = '';
	   this.uid = '';
	   this.hash = '';
	   this.requestHash = '';
	   this.subject('');
	   this.subjectPrefix('');
	   this.subjectSuffix('');
	   this.size(0);
	   this.dateTimeStampInUTC(0);
	   this.priority(Enums.MessagePriority.Normal);

	   this.proxy = false;

	   this.fromEmailString('');
	   this.fromClearEmailString('');
	   this.toEmailsString('');
	   this.toClearEmailsString('');
	   this.senderEmailsString('');
	   this.senderClearEmailsString('');

	   this.emails = [];

	   this.from = [];
	   this.to = [];
	   this.cc = [];
	   this.bcc = [];
	   this.replyTo = [];
	   this.deliveredTo = [];

	   this.newForAnimation(false);

	   this.deleted(false);
	   this.unseen(false);
	   this.flagged(false);
	   this.answered(false);
	   this.forwarded(false);
	   this.isReadReceipt(false);

	   this.selected(false);
	   this.checked(false);
	   this.hasAttachments(false);
	   this.attachmentsMainType('');

	   this.body = null;
	   this.isHtml(false);
	   this.hasImages(false);
	   this.attachments([]);

	   this.isPgpSigned(false);
	   this.isPgpEncrypted(false);
	   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
	   this.pgpSignedVerifyUser('');

	   this.priority(Enums.MessagePriority.Normal);
	   this.readReceipt('');
	   this.aDraftInfo = [];
	   this.sMessageId = '';
	   this.sInReplyTo = '';
	   this.sReferences = '';

	   this.parentUid(0);
	   this.threads([]);
	   this.threadsLen(0);
	   this.hasUnseenSubMessage(false);
	   this.hasFlaggedSubMessage(false);

	   this.lastInCollapsedThread(false);
	   this.lastInCollapsedThreadLoading(false);
	};

	MessageModel.prototype.computeSenderEmail = function ()
	{
	   var
		   sSent = RL.data().sentFolder(),
		   sDraft = RL.data().draftFolder()
	   ;

	   this.senderEmailsString(this.folderFullNameRaw === sSent || this.folderFullNameRaw === sDraft ?
		   this.toEmailsString() : this.fromEmailString());

	   this.senderClearEmailsString(this.folderFullNameRaw === sSent || this.folderFullNameRaw === sDraft ?
		   this.toClearEmailsString() : this.fromClearEmailString());
	};

	/**
	* @param {AjaxJsonMessage} oJsonMessage
	* @return {boolean}
	*/
	MessageModel.prototype.initByJson = function (oJsonMessage)
	{
	   var bResult = false;
	   if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	   {
		   this.folderFullNameRaw = oJsonMessage.Folder;
		   this.uid = oJsonMessage.Uid;
		   this.hash = oJsonMessage.Hash;
		   this.requestHash = oJsonMessage.RequestHash;

		   this.proxy = !!oJsonMessage.ExternalProxy;

		   this.size(Utils.pInt(oJsonMessage.Size));

		   this.from = MessageModel.initEmailsFromJson(oJsonMessage.From);
		   this.to = MessageModel.initEmailsFromJson(oJsonMessage.To);
		   this.cc = MessageModel.initEmailsFromJson(oJsonMessage.Cc);
		   this.bcc = MessageModel.initEmailsFromJson(oJsonMessage.Bcc);
		   this.replyTo = MessageModel.initEmailsFromJson(oJsonMessage.ReplyTo);
		   this.deliveredTo = MessageModel.initEmailsFromJson(oJsonMessage.DeliveredTo);

		   this.subject(oJsonMessage.Subject);
		   if (Utils.isArray(oJsonMessage.SubjectParts))
		   {
			   this.subjectPrefix(oJsonMessage.SubjectParts[0]);
			   this.subjectSuffix(oJsonMessage.SubjectParts[1]);
		   }
		   else
		   {
			   this.subjectPrefix('');
			   this.subjectSuffix(this.subject());
		   }

		   this.dateTimeStampInUTC(Utils.pInt(oJsonMessage.DateTimeStampInUTC));
		   this.hasAttachments(!!oJsonMessage.HasAttachments);
		   this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

		   this.fromEmailString(MessageModel.emailsToLine(this.from, true));
		   this.fromClearEmailString(MessageModel.emailsToLineClear(this.from));
		   this.toEmailsString(MessageModel.emailsToLine(this.to, true));
		   this.toClearEmailsString(MessageModel.emailsToLineClear(this.to));

		   this.parentUid(Utils.pInt(oJsonMessage.ParentThread));
		   this.threads(Utils.isArray(oJsonMessage.Threads) ? oJsonMessage.Threads : []);
		   this.threadsLen(Utils.pInt(oJsonMessage.ThreadsLen));

		   this.initFlagsByJson(oJsonMessage);
		   this.computeSenderEmail();

		   bResult = true;
	   }

	   return bResult;
	};

	/**
	* @param {AjaxJsonMessage} oJsonMessage
	* @return {boolean}
	*/
	MessageModel.prototype.initUpdateByMessageJson = function (oJsonMessage)
	{
	   var
		   bResult = false,
		   iPriority = Enums.MessagePriority.Normal
	   ;

	   if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	   {
		   iPriority = Utils.pInt(oJsonMessage.Priority);
		   this.priority(-1 < Utils.inArray(iPriority, [Enums.MessagePriority.High, Enums.MessagePriority.Low]) ?
			   iPriority : Enums.MessagePriority.Normal);

		   this.aDraftInfo = oJsonMessage.DraftInfo;

		   this.sMessageId = oJsonMessage.MessageId;
		   this.sInReplyTo = oJsonMessage.InReplyTo;
		   this.sReferences = oJsonMessage.References;

		   this.proxy = !!oJsonMessage.ExternalProxy;

		   if (RL.data().capaOpenPGP()) // TODO cjs
		   {
			   this.isPgpSigned(!!oJsonMessage.PgpSigned);
			   this.isPgpEncrypted(!!oJsonMessage.PgpEncrypted);
		   }

		   this.hasAttachments(!!oJsonMessage.HasAttachments);
		   this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

		   this.foundedCIDs = Utils.isArray(oJsonMessage.FoundedCIDs) ? oJsonMessage.FoundedCIDs : [];
		   this.attachments(this.initAttachmentsFromJson(oJsonMessage.Attachments));

		   this.readReceipt(oJsonMessage.ReadReceipt || '');

		   this.computeSenderEmail();

		   bResult = true;
	   }

	   return bResult;
	};

	/**
	* @param {(AjaxJsonAttachment|null)} oJsonAttachments
	* @return {Array}
	*/
	MessageModel.prototype.initAttachmentsFromJson = function (oJsonAttachments)
	{
	   var
		   iIndex = 0,
		   iLen = 0,
		   oAttachmentModel = null,
		   aResult = []
	   ;

	   if (oJsonAttachments && 'Collection/AttachmentCollection' === oJsonAttachments['@Object'] &&
		   Utils.isNonEmptyArray(oJsonAttachments['@Collection']))
	   {
		   for (iIndex = 0, iLen = oJsonAttachments['@Collection'].length; iIndex < iLen; iIndex++)
		   {
			   oAttachmentModel = AttachmentModel.newInstanceFromJson(oJsonAttachments['@Collection'][iIndex]);
			   if (oAttachmentModel)
			   {
				   if ('' !== oAttachmentModel.cidWithOutTags && 0 < this.foundedCIDs.length &&
					   0 <= Utils.inArray(oAttachmentModel.cidWithOutTags, this.foundedCIDs))
				   {
					   oAttachmentModel.isLinked = true;
				   }

				   aResult.push(oAttachmentModel);
			   }
		   }
	   }

	   return aResult;
	};

	/**
	* @param {AjaxJsonMessage} oJsonMessage
	* @return {boolean}
	*/
	MessageModel.prototype.initFlagsByJson = function (oJsonMessage)
	{
	   var bResult = false;

	   if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	   {
		   this.unseen(!oJsonMessage.IsSeen);
		   this.flagged(!!oJsonMessage.IsFlagged);
		   this.answered(!!oJsonMessage.IsAnswered);
		   this.forwarded(!!oJsonMessage.IsForwarded);
		   this.isReadReceipt(!!oJsonMessage.IsReadReceipt);

		   bResult = true;
	   }

	   return bResult;
	};

	/**
	* @param {boolean} bFriendlyView
	* @param {boolean=} bWrapWithLink = false
	* @return {string}
	*/
	MessageModel.prototype.fromToLine = function (bFriendlyView, bWrapWithLink)
	{
	   return MessageModel.emailsToLine(this.from, bFriendlyView, bWrapWithLink);
	};

	/**
	* @param {boolean} bFriendlyView
	* @param {boolean=} bWrapWithLink = false
	* @return {string}
	*/
	MessageModel.prototype.toToLine = function (bFriendlyView, bWrapWithLink)
	{
	   return MessageModel.emailsToLine(this.to, bFriendlyView, bWrapWithLink);
	};

	/**
	* @param {boolean} bFriendlyView
	* @param {boolean=} bWrapWithLink = false
	* @return {string}
	*/
	MessageModel.prototype.ccToLine = function (bFriendlyView, bWrapWithLink)
	{
	   return MessageModel.emailsToLine(this.cc, bFriendlyView, bWrapWithLink);
	};

	/**
	* @param {boolean} bFriendlyView
	* @param {boolean=} bWrapWithLink = false
	* @return {string}
	*/
	MessageModel.prototype.bccToLine = function (bFriendlyView, bWrapWithLink)
	{
	   return MessageModel.emailsToLine(this.bcc, bFriendlyView, bWrapWithLink);
	};

	/**
	* @return string
	*/
	MessageModel.prototype.lineAsCcc = function ()
	{
	   var aResult = [];
	   if (this.deleted())
	   {
		   aResult.push('deleted');
	   }
	   if (this.selected())
	   {
		   aResult.push('selected');
	   }
	   if (this.checked())
	   {
		   aResult.push('checked');
	   }
	   if (this.flagged())
	   {
		   aResult.push('flagged');
	   }
	   if (this.unseen())
	   {
		   aResult.push('unseen');
	   }
	   if (this.answered())
	   {
		   aResult.push('answered');
	   }
	   if (this.forwarded())
	   {
		   aResult.push('forwarded');
	   }
	   if (this.focused())
	   {
		   aResult.push('focused');
	   }
	   if (this.hasAttachments())
	   {
		   aResult.push('withAttachments');
		   switch (this.attachmentsMainType())
		   {
			   case 'image':
				   aResult.push('imageOnlyAttachments');
				   break;
			   case 'archive':
				   aResult.push('archiveOnlyAttachments');
				   break;
		   }
	   }
	   if (this.newForAnimation())
	   {
		   aResult.push('new');
	   }
	   if ('' === this.subject())
	   {
		   aResult.push('emptySubject');
	   }
	   if (0 < this.parentUid())
	   {
		   aResult.push('hasParentMessage');
	   }
	   if (0 < this.threadsLen() && 0 === this.parentUid())
	   {
		   aResult.push('hasChildrenMessage');
	   }
	   if (this.hasUnseenSubMessage())
	   {
		   aResult.push('hasUnseenSubMessage');
	   }
	   if (this.hasFlaggedSubMessage())
	   {
		   aResult.push('hasFlaggedSubMessage');
	   }

	   return aResult.join(' ');
	};

	/**
	* @return {boolean}
	*/
	MessageModel.prototype.hasVisibleAttachments = function ()
	{
	   return !!_.find(this.attachments(), function (oAttachment) {
		   return !oAttachment.isLinked;
	   });
	};

	/**
	* @param {string} sCid
	* @return {*}
	*/
	MessageModel.prototype.findAttachmentByCid = function (sCid)
	{
	   var
		   oResult = null,
		   aAttachments = this.attachments()
	   ;

	   if (Utils.isNonEmptyArray(aAttachments))
	   {
		   sCid = sCid.replace(/^<+/, '').replace(/>+$/, '');
		   oResult = _.find(aAttachments, function (oAttachment) {
			   return sCid === oAttachment.cidWithOutTags;
		   });
	   }

	   return oResult || null;
	};

	/**
	* @param {string} sContentLocation
	* @return {*}
	*/
	MessageModel.prototype.findAttachmentByContentLocation = function (sContentLocation)
	{
	   var
		   oResult = null,
		   aAttachments = this.attachments()
	   ;

	   if (Utils.isNonEmptyArray(aAttachments))
	   {
		   oResult = _.find(aAttachments, function (oAttachment) {
			   return sContentLocation === oAttachment.contentLocation;
		   });
	   }

	   return oResult || null;
	};


	/**
	* @return {string}
	*/
	MessageModel.prototype.messageId = function ()
	{
	   return this.sMessageId;
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.inReplyTo = function ()
	{
	   return this.sInReplyTo;
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.references = function ()
	{
	   return this.sReferences;
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.fromAsSingleEmail = function ()
	{
	   return Utils.isArray(this.from) && this.from[0] ? this.from[0].email : '';
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.viewLink = function ()
	{
	   return LinkBuilder.messageViewLink(this.requestHash);// TODO cjs
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.downloadLink = function ()
	{
	   return LinkBuilder.messageDownloadLink(this.requestHash);// TODO cjs
	};

	/**
	* @param {Object} oExcludeEmails
	* @return {Array}
	*/
	MessageModel.prototype.replyEmails = function (oExcludeEmails)
	{
	   var
		   aResult = [],
		   oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
	   ;

	   MessageModel.replyHelper(this.replyTo, oUnic, aResult);
	   if (0 === aResult.length)
	   {
		   MessageModel.replyHelper(this.from, oUnic, aResult);
	   }

	   return aResult;
	};

	/**
	* @param {Object} oExcludeEmails
	* @return {Array.<Array>}
	*/
	MessageModel.prototype.replyAllEmails = function (oExcludeEmails)
	{
	   var
		   aToResult = [],
		   aCcResult = [],
		   oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
	   ;

	   MessageModel.replyHelper(this.replyTo, oUnic, aToResult);
	   if (0 === aToResult.length)
	   {
		   MessageModel.replyHelper(this.from, oUnic, aToResult);
	   }

	   MessageModel.replyHelper(this.to, oUnic, aToResult);
	   MessageModel.replyHelper(this.cc, oUnic, aCcResult);

	   return [aToResult, aCcResult];
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.textBodyToString = function ()
	{
	   return this.body ? this.body.html() : '';
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.attachmentsToStringLine = function ()
	{
	   var aAttachLines = _.map(this.attachments(), function (oItem) {
		   return oItem.fileName + ' (' + oItem.friendlySize + ')';
	   });

	   return aAttachLines && 0 < aAttachLines.length ? aAttachLines.join(', ') : '';
	};

	/**
	* @return {Object}
	*/
	MessageModel.prototype.getDataForWindowPopup = function ()
	{
	   return {
		   'popupFrom': this.fromToLine(false),
		   'popupTo': this.toToLine(false),
		   'popupCc': this.ccToLine(false),
		   'popupBcc': this.bccToLine(false),
		   'popupSubject': this.subject(),
		   'popupDate': this.fullFormatDateValue(),
		   'popupAttachments': this.attachmentsToStringLine(),
		   'popupBody': this.textBodyToString()
	   };
	};

	/**
	* @param {boolean=} bPrint = false
	*/
	MessageModel.prototype.viewPopupMessage = function (bPrint)
	{
	   Utils.windowPopupKnockout(this.getDataForWindowPopup(), 'PopupsWindowSimpleMessage', this.subject(), function (oPopupWin) {
		   if (oPopupWin && oPopupWin.document && oPopupWin.document.body)
		   {
			   $('img.lazy', oPopupWin.document.body).each(function (iIndex, oImg) {

				   var
					   $oImg = $(oImg),
					   sOrig = $oImg.data('original'),
					   sSrc = $oImg.attr('src')
				   ;

				   if (0 <= iIndex && sOrig && !sSrc)
				   {
					   $oImg.attr('src', sOrig);
				   }
			   });

			   if (bPrint)
			   {
				   window.setTimeout(function () {
					   oPopupWin.print();
				   }, 100);
			   }
		   }
	   });
	};

	MessageModel.prototype.printMessage = function ()
	{
	   this.viewPopupMessage(true);
	};

	/**
	* @returns {string}
	*/
	MessageModel.prototype.generateUid = function ()
	{
	   return this.folderFullNameRaw + '/' + this.uid;
	};

	/**
	* @param {MessageModel} oMessage
	* @return {MessageModel}
	*/
	MessageModel.prototype.populateByMessageListItem = function (oMessage)
	{
	   this.folderFullNameRaw = oMessage.folderFullNameRaw;
	   this.uid = oMessage.uid;
	   this.hash = oMessage.hash;
	   this.requestHash = oMessage.requestHash;
	   this.subject(oMessage.subject());
	   this.subjectPrefix(this.subjectPrefix());
	   this.subjectSuffix(this.subjectSuffix());

	   this.size(oMessage.size());
	   this.dateTimeStampInUTC(oMessage.dateTimeStampInUTC());
	   this.priority(oMessage.priority());

	   this.proxy = oMessage.proxy;

	   this.fromEmailString(oMessage.fromEmailString());
	   this.fromClearEmailString(oMessage.fromClearEmailString());
	   this.toEmailsString(oMessage.toEmailsString());
	   this.toClearEmailsString(oMessage.toClearEmailsString());

	   this.emails = oMessage.emails;

	   this.from = oMessage.from;
	   this.to = oMessage.to;
	   this.cc = oMessage.cc;
	   this.bcc = oMessage.bcc;
	   this.replyTo = oMessage.replyTo;
	   this.deliveredTo = oMessage.deliveredTo;

	   this.unseen(oMessage.unseen());
	   this.flagged(oMessage.flagged());
	   this.answered(oMessage.answered());
	   this.forwarded(oMessage.forwarded());
	   this.isReadReceipt(oMessage.isReadReceipt());

	   this.selected(oMessage.selected());
	   this.checked(oMessage.checked());
	   this.hasAttachments(oMessage.hasAttachments());
	   this.attachmentsMainType(oMessage.attachmentsMainType());

	   this.moment(oMessage.moment());

	   this.body = null;

	   this.priority(Enums.MessagePriority.Normal);
	   this.aDraftInfo = [];
	   this.sMessageId = '';
	   this.sInReplyTo = '';
	   this.sReferences = '';

	   this.parentUid(oMessage.parentUid());
	   this.threads(oMessage.threads());
	   this.threadsLen(oMessage.threadsLen());

	   this.computeSenderEmail();

	   return this;
	};

	MessageModel.prototype.showExternalImages = function (bLazy)
	{
	   if (this.body && this.body.data('rl-has-images'))
	   {
		   var sAttr = '';
		   bLazy = Utils.isUnd(bLazy) ? false : bLazy;

		   this.hasImages(false);
		   this.body.data('rl-has-images', false);

		   sAttr = this.proxy ? 'data-x-additional-src' : 'data-x-src';
		   $('[' + sAttr + ']', this.body).each(function () {
			   if (bLazy && $(this).is('img'))
			   {
				   $(this)
					   .addClass('lazy')
					   .attr('data-original', $(this).attr(sAttr))
					   .removeAttr(sAttr)
				   ;
			   }
			   else
			   {
				   $(this).attr('src', $(this).attr(sAttr)).removeAttr(sAttr);
			   }
		   });

		   sAttr = this.proxy ? 'data-x-additional-style-url' : 'data-x-style-url';
		   $('[' + sAttr + ']', this.body).each(function () {
			   var sStyle = Utils.trim($(this).attr('style'));
			   sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
			   $(this).attr('style', sStyle + $(this).attr(sAttr)).removeAttr(sAttr);
		   });

		   if (bLazy)
		   {
			   $('img.lazy', this.body).addClass('lazy-inited').lazyload({
				   'threshold' : 400,
				   'effect' : 'fadeIn',
				   'skip_invisible' : false,
				   'container': $('.RL-MailMessageView .messageView .messageItem .content')[0]
			   });

			   $window.resize();
		   }

		   Utils.windowResize(500);
	   }
	};

	MessageModel.prototype.showInternalImages = function (bLazy)
	{
	   if (this.body && !this.body.data('rl-init-internal-images'))
	   {
		   this.body.data('rl-init-internal-images', true);

		   bLazy = Utils.isUnd(bLazy) ? false : bLazy;

		   var self = this;

		   $('[data-x-src-cid]', this.body).each(function () {

			   var oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-cid'));
			   if (oAttachment && oAttachment.download)
			   {
				   if (bLazy && $(this).is('img'))
				   {
					   $(this)
						   .addClass('lazy')
						   .attr('data-original', oAttachment.linkPreview());
				   }
				   else
				   {
					   $(this).attr('src', oAttachment.linkPreview());
				   }
			   }
		   });

		   $('[data-x-src-location]', this.body).each(function () {

			   var oAttachment = self.findAttachmentByContentLocation($(this).attr('data-x-src-location'));
			   if (!oAttachment)
			   {
				   oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-location'));
			   }

			   if (oAttachment && oAttachment.download)
			   {
				   if (bLazy && $(this).is('img'))
				   {
					   $(this)
						   .addClass('lazy')
						   .attr('data-original', oAttachment.linkPreview());
				   }
				   else
				   {
					   $(this).attr('src', oAttachment.linkPreview());
				   }
			   }
		   });

		   $('[data-x-style-cid]', this.body).each(function () {

			   var
				   sStyle = '',
				   sName = '',
				   oAttachment = self.findAttachmentByCid($(this).attr('data-x-style-cid'))
			   ;

			   if (oAttachment && oAttachment.linkPreview)
			   {
				   sName = $(this).attr('data-x-style-cid-name');
				   if ('' !== sName)
				   {
					   sStyle = Utils.trim($(this).attr('style'));
					   sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
					   $(this).attr('style', sStyle + sName + ': url(\'' + oAttachment.linkPreview() + '\')');
				   }
			   }
		   });

		   if (bLazy)
		   {
			   (function ($oImg, oContainer) {
				   _.delay(function () {
					   $oImg.addClass('lazy-inited').lazyload({
						   'threshold' : 400,
						   'effect' : 'fadeIn',
						   'skip_invisible' : false,
						   'container': oContainer
					   });
				   }, 300);
			   }($('img.lazy', self.body), $('.RL-MailMessageView .messageView .messageItem .content')[0]));
		   }

		   Utils.windowResize(500);
	   }
	};

	MessageModel.prototype.storeDataToDom = function ()
	{
	   if (this.body)
	   {
		   this.body.data('rl-is-html', !!this.isHtml());
		   this.body.data('rl-has-images', !!this.hasImages());

		   this.body.data('rl-plain-raw', this.plainRaw);

		   if (RL.data().capaOpenPGP()) // TODO cjs
		   {
			   this.body.data('rl-plain-pgp-signed', !!this.isPgpSigned());
			   this.body.data('rl-plain-pgp-encrypted', !!this.isPgpEncrypted());
			   this.body.data('rl-pgp-verify-status', this.pgpSignedVerifyStatus());
			   this.body.data('rl-pgp-verify-user', this.pgpSignedVerifyUser());
		   }
	   }
	};

	MessageModel.prototype.storePgpVerifyDataToDom = function ()
	{
	   if (this.body && RL.data().capaOpenPGP()) // TODO cjs
	   {
		   this.body.data('rl-pgp-verify-status', this.pgpSignedVerifyStatus());
		   this.body.data('rl-pgp-verify-user', this.pgpSignedVerifyUser());
	   }
	};

	MessageModel.prototype.fetchDataToDom = function ()
	{
	   if (this.body)
	   {
		   this.isHtml(!!this.body.data('rl-is-html'));
		   this.hasImages(!!this.body.data('rl-has-images'));

		   this.plainRaw = Utils.pString(this.body.data('rl-plain-raw'));

		   if (RL.data().capaOpenPGP()) // TODO cjs
		   {
			   this.isPgpSigned(!!this.body.data('rl-plain-pgp-signed'));
			   this.isPgpEncrypted(!!this.body.data('rl-plain-pgp-encrypted'));
			   this.pgpSignedVerifyStatus(this.body.data('rl-pgp-verify-status'));
			   this.pgpSignedVerifyUser(this.body.data('rl-pgp-verify-user'));
		   }
		   else
		   {
			   this.isPgpSigned(false);
			   this.isPgpEncrypted(false);
			   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
			   this.pgpSignedVerifyUser('');
		   }
	   }
	};

	MessageModel.prototype.verifyPgpSignedClearMessage = function ()
	{
	   if (this.isPgpSigned())
	   {
		   var
			   aRes = [],
			   mPgpMessage = null,
			   sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
			   aPublicKeys = RL.data().findPublicKeysByEmail(sFrom), // TODO cjs
			   oValidKey = null,
			   oValidSysKey = null,
			   sPlain = ''
		   ;

		   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Error);
		   this.pgpSignedVerifyUser('');

		   try
		   {
			   mPgpMessage = window.openpgp.cleartext.readArmored(this.plainRaw);
			   if (mPgpMessage && mPgpMessage.getText)
			   {
				   this.pgpSignedVerifyStatus(
					   aPublicKeys.length ? Enums.SignedVerifyStatus.Unverified : Enums.SignedVerifyStatus.UnknownPublicKeys);

				   aRes = mPgpMessage.verify(aPublicKeys);
				   if (aRes && 0 < aRes.length)
				   {
					   oValidKey = _.find(aRes, function (oItem) {
						   return oItem && oItem.keyid && oItem.valid;
					   });

					   if (oValidKey)
					   {
						   oValidSysKey = RL.data().findPublicKeyByHex(oValidKey.keyid.toHex()); // TODO cjs
						   if (oValidSysKey)
						   {
							   sPlain = mPgpMessage.getText();

							   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
							   this.pgpSignedVerifyUser(oValidSysKey.user);

							   sPlain =
								   $div.empty().append(
									   $('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
								   ).html()
							   ;

							   $div.empty();

							   this.replacePlaneTextBody(sPlain);
						   }
					   }
				   }
			   }
		   }
		   catch (oExc) {}

		   this.storePgpVerifyDataToDom();
	   }
	};

	MessageModel.prototype.decryptPgpEncryptedMessage = function (sPassword)
	{
	   if (this.isPgpEncrypted())
	   {
		   var
			   aRes = [],
			   mPgpMessage = null,
			   mPgpMessageDecrypted = null,
			   sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
			   aPublicKey = RL.data().findPublicKeysByEmail(sFrom), // TODO cjs
			   oPrivateKey = RL.data().findSelfPrivateKey(sPassword), // TODO cjs
			   oValidKey = null,
			   oValidSysKey = null,
			   sPlain = ''
		   ;

		   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Error);
		   this.pgpSignedVerifyUser('');

		   if (!oPrivateKey)
		   {
			   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.UnknownPrivateKey);
		   }

		   try
		   {
			   mPgpMessage = window.openpgp.message.readArmored(this.plainRaw);
			   if (mPgpMessage && oPrivateKey && mPgpMessage.decrypt)
			   {
				   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Unverified);

				   mPgpMessageDecrypted = mPgpMessage.decrypt(oPrivateKey);
				   if (mPgpMessageDecrypted)
				   {
					   aRes = mPgpMessageDecrypted.verify(aPublicKey);
					   if (aRes && 0 < aRes.length)
					   {
						   oValidKey = _.find(aRes, function (oItem) {
							   return oItem && oItem.keyid && oItem.valid;
						   });

						   if (oValidKey)
						   {
							   oValidSysKey = RL.data().findPublicKeyByHex(oValidKey.keyid.toHex()); // TODO cjs
							   if (oValidSysKey)
							   {
								   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
								   this.pgpSignedVerifyUser(oValidSysKey.user);
							   }
						   }
					   }

					   sPlain = mPgpMessageDecrypted.getText();

					   sPlain =
						   $div.empty().append(
							   $('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
						   ).html()
					   ;

					   $div.empty();

					   this.replacePlaneTextBody(sPlain);
				   }
			   }
		   }
		   catch (oExc) {}

		   this.storePgpVerifyDataToDom();
	   }
	};

	MessageModel.prototype.replacePlaneTextBody = function (sPlain)
	{
	   if (this.body)
	   {
		   this.body.html(sPlain).addClass('b-text-part plain');
	   }
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.flagHash = function ()
	{
	   return [this.deleted(), this.unseen(), this.flagged(), this.answered(), this.forwarded(),
		   this.isReadReceipt()].join('');
	};

	module.exports = MessageModel;

}(module));
},{"../Common/Enums.js":5,"../Common/LinkBuilder.js":7,"../Common/Utils.js":9,"../External/$div.js":10,"../External/$window.js":13,"../External/jquery.js":19,"../External/ko.js":21,"../External/moment.js":22,"../External/underscore.js":24,"../External/window.js":25,"./AttachmentModel.js":29,"./EmailModel.js":30}],32:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = function () {
	return require('./Knoin/Knoin.js').rl();
};
},{"./Knoin/Knoin.js":26}],33:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

module.exports = function () {
	return require('./Knoin/Knoin.js').remote();
};
},{"./Knoin/Knoin.js":26}],34:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),

		Consts = require('../Common/Consts.js'),
		Enums = require('../Common/Enums.js'),
		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		Plugins = require('../Common/Plugins.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		RL = require('../RL.js')
	;

	/**
	* @constructor
	*/
   function AbstractAjaxRemoteStorage()
   {
	   this.oRequests = {};
   }

   AbstractAjaxRemoteStorage.prototype.oRequests = {};

   /**
	* @param {?Function} fCallback
	* @param {string} sRequestAction
	* @param {string} sType
	* @param {?AjaxJsonDefaultResponse} oData
	* @param {boolean} bCached
	* @param {*=} oRequestParameters
	*/
   AbstractAjaxRemoteStorage.prototype.defaultResponse = function (fCallback, sRequestAction, sType, oData, bCached, oRequestParameters)
   {
	   var
		   fCall = function () {
			   if (Enums.StorageResultType.Success !== sType && Globals.bUnload)
			   {
				   sType = Enums.StorageResultType.Unload;
			   }

			   if (Enums.StorageResultType.Success === sType && oData && !oData.Result)
			   {
				   if (oData && -1 < Utils.inArray(oData.ErrorCode, [
					   Enums.Notification.AuthError, Enums.Notification.AccessError,
					   Enums.Notification.ConnectionError, Enums.Notification.DomainNotAllowed, Enums.Notification.AccountNotAllowed,
					   Enums.Notification.MailServerError,	Enums.Notification.UnknownNotification, Enums.Notification.UnknownError
				   ]))
				   {
					   Globals.iAjaxErrorCount++;
				   }

				   if (oData && Enums.Notification.InvalidToken === oData.ErrorCode)
				   {
					   Globals.iTokenErrorCount++;
				   }

				   if (Consts.Values.TokenErrorLimit < Globals.iTokenErrorCount)
				   {
					   RL().loginAndLogoutReload(true);
				   }

				   if (oData.Logout || Consts.Values.AjaxErrorLimit < Globals.iAjaxErrorCount)
				   {
					   if (window.__rlah_clear)
					   {
						   window.__rlah_clear();
					   }

					   RL().loginAndLogoutReload(true);
				   }
			   }
			   else if (Enums.StorageResultType.Success === sType && oData && oData.Result)
			   {
				   Globals.iAjaxErrorCount = 0;
				   Globals.iTokenErrorCount = 0;
			   }

			   if (fCallback)
			   {
				   Plugins.runHook('ajax-default-response', [sRequestAction, Enums.StorageResultType.Success === sType ? oData : null, sType, bCached, oRequestParameters]);

				   fCallback(
					   sType,
					   Enums.StorageResultType.Success === sType ? oData : null,
					   bCached,
					   sRequestAction,
					   oRequestParameters
				   );
			   }
		   }
	   ;

	   switch (sType)
	   {
		   case 'success':
			   sType = Enums.StorageResultType.Success;
			   break;
		   case 'abort':
			   sType = Enums.StorageResultType.Abort;
			   break;
		   default:
			   sType = Enums.StorageResultType.Error;
			   break;
	   }

	   if (Enums.StorageResultType.Error === sType)
	   {
		   _.delay(fCall, 300);
	   }
	   else
	   {
		   fCall();
	   }
   };

   /**
	* @param {?Function} fResultCallback
	* @param {Object} oParameters
	* @param {?number=} iTimeOut = 20000
	* @param {string=} sGetAdd = ''
	* @param {Array=} aAbortActions = []
	* @return {jQuery.jqXHR}
	*/
   AbstractAjaxRemoteStorage.prototype.ajaxRequest = function (fResultCallback, oParameters, iTimeOut, sGetAdd, aAbortActions)
   {
	   var
		   self = this,
		   bPost = '' === sGetAdd,
		   oHeaders = {},
		   iStart = (new window.Date()).getTime(),
		   oDefAjax = null,
		   sAction = ''
	   ;

	   oParameters = oParameters || {};
	   iTimeOut = Utils.isNormal(iTimeOut) ? iTimeOut : 20000;
	   sGetAdd = Utils.isUnd(sGetAdd) ? '' : Utils.pString(sGetAdd);
	   aAbortActions = Utils.isArray(aAbortActions) ? aAbortActions : [];

	   sAction = oParameters.Action || '';

	   if (sAction && 0 < aAbortActions.length)
	   {
		   _.each(aAbortActions, function (sActionToAbort) {
			   if (self.oRequests[sActionToAbort])
			   {
				   self.oRequests[sActionToAbort].__aborted = true;
				   if (self.oRequests[sActionToAbort].abort)
				   {
					   self.oRequests[sActionToAbort].abort();
				   }
				   self.oRequests[sActionToAbort] = null;
			   }
		   });
	   }

	   if (bPost)
	   {
		   oParameters['XToken'] = RL.settingsGet('Token'); // TODO cjs
	   }

	   oDefAjax = $.ajax({
		   'type': bPost ? 'POST' : 'GET',
		   'url': LinkBuilder.ajax(sGetAdd),
		   'async': true,
		   'dataType': 'json',
		   'data': bPost ? oParameters : {},
		   'headers': oHeaders,
		   'timeout': iTimeOut,
		   'global': true
	   });

	   oDefAjax.always(function (oData, sType) {

		   var bCached = false;
		   if (oData && oData['Time'])
		   {
			   bCached = Utils.pInt(oData['Time']) > (new window.Date()).getTime() - iStart;
		   }

		   if (sAction && self.oRequests[sAction])
		   {
			   if (self.oRequests[sAction].__aborted)
			   {
				   sType = 'abort';
			   }

			   self.oRequests[sAction] = null;
		   }

		   self.defaultResponse(fResultCallback, sAction, sType, oData, bCached, oParameters);
	   });

	   if (sAction && 0 < aAbortActions.length && -1 < Utils.inArray(sAction, aAbortActions))
	   {
		   if (this.oRequests[sAction])
		   {
			   this.oRequests[sAction].__aborted = true;
			   if (this.oRequests[sAction].abort)
			   {
				   this.oRequests[sAction].abort();
			   }
			   this.oRequests[sAction] = null;
		   }

		   this.oRequests[sAction] = oDefAjax;
	   }

	   return oDefAjax;
   };

   /**
	* @param {?Function} fCallback
	* @param {string} sAction
	* @param {Object=} oParameters
	* @param {?number=} iTimeout
	* @param {string=} sGetAdd = ''
	* @param {Array=} aAbortActions = []
	*/
   AbstractAjaxRemoteStorage.prototype.defaultRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
   {
	   oParameters = oParameters || {};
	   oParameters.Action = sAction;

	   sGetAdd = Utils.pString(sGetAdd);

	   Plugins.runHook('ajax-default-request', [sAction, oParameters, sGetAdd]);

	   this.ajaxRequest(fCallback, oParameters,
		   Utils.isUnd(iTimeout) ? Consts.Defaults.DefaultAjaxTimeout : Utils.pInt(iTimeout), sGetAdd, aAbortActions);
   };

   /**
	* @param {?Function} fCallback
	*/
   AbstractAjaxRemoteStorage.prototype.noop = function (fCallback)
   {
	   this.defaultRequest(fCallback, 'Noop');
   };

   /**
	* @param {?Function} fCallback
	* @param {string} sMessage
	* @param {string} sFileName
	* @param {number} iLineNo
	* @param {string} sLocation
	* @param {string} sHtmlCapa
	* @param {number} iTime
	*/
   AbstractAjaxRemoteStorage.prototype.jsError = function (fCallback, sMessage, sFileName, iLineNo, sLocation, sHtmlCapa, iTime)
   {
	   this.defaultRequest(fCallback, 'JsError', {
		   'Message': sMessage,
		   'FileName': sFileName,
		   'LineNo': iLineNo,
		   'Location': sLocation,
		   'HtmlCapa': sHtmlCapa,
		   'TimeOnPage': iTime
	   });
   };

   /**
	* @param {?Function} fCallback
	* @param {string} sType
	* @param {Array=} mData = null
	* @param {boolean=} bIsError = false
	*/
   AbstractAjaxRemoteStorage.prototype.jsInfo = function (fCallback, sType, mData, bIsError)
   {
	   this.defaultRequest(fCallback, 'JsInfo', {
		   'Type': sType,
		   'Data': mData,
		   'IsError': (Utils.isUnd(bIsError) ? false : !!bIsError) ? '1' : '0'
	   });
   };

   /**
	* @param {?Function} fCallback
	*/
   AbstractAjaxRemoteStorage.prototype.getPublicKey = function (fCallback)
   {
	   this.defaultRequest(fCallback, 'GetPublicKey');
   };

   /**
	* @param {?Function} fCallback
	* @param {string} sVersion
	*/
   AbstractAjaxRemoteStorage.prototype.jsVersion = function (fCallback, sVersion)
   {
	   this.defaultRequest(fCallback, 'Version', {
		   'Version': sVersion
	   });
   };

	module.exports = AbstractAjaxRemoteStorage;

}(module));
},{"../Common/Consts.js":4,"../Common/Enums.js":5,"../Common/Globals.js":6,"../Common/LinkBuilder.js":7,"../Common/Plugins.js":8,"../Common/Utils.js":9,"../External/jquery.js":19,"../External/window.js":25,"../RL.js":32}],35:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		key = require('../External/key.js'),
		Enums = require('../Common/Enums.js'),
		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js')
	;
	
	/**
	 * @constructor
	 */
	function AbstractData()
	{
		this.leftPanelDisabled = ko.observable(false);
		this.useKeyboardShortcuts = ko.observable(true);

		this.keyScopeReal = ko.observable(Enums.KeyState.All);
		this.keyScopeFake = ko.observable(Enums.KeyState.All);

		this.keyScope = ko.computed({
			'owner': this,
			'read': function () {
				return this.keyScopeFake();
			},
			'write': function (sValue) {

				if (Enums.KeyState.Menu !== sValue)
				{
					if (Enums.KeyState.Compose === sValue)
					{
						Utils.disableKeyFilter();
					}
					else
					{
						Utils.restoreKeyFilter();
					}

					this.keyScopeFake(sValue);
					if (Globals.dropdownVisibility())
					{
						sValue = Enums.KeyState.Menu;
					}
				}

				this.keyScopeReal(sValue);
			}
		});

		this.keyScopeReal.subscribe(function (sValue) {
	//		window.console.log(sValue);
			key.setScope(sValue);
		});

		this.leftPanelDisabled.subscribe(function (bValue) {
			RL.pub('left-panel.' + (bValue ? 'off' : 'on')); // TODO cjs
		});

		Globals.dropdownVisibility.subscribe(function (bValue) {
			if (bValue)
			{
				Globals.tooltipTrigger(!Globals.tooltipTrigger());
				this.keyScope(Enums.KeyState.Menu);
			}
			else if (Enums.KeyState.Menu === key.getScope())
			{
				this.keyScope(this.keyScopeFake());
			}
		}, this);

		Utils.initDataConstructorBySettings(this);
	}

	AbstractData.prototype.populateDataOnStart = function()
	{
		var
			mLayout = Utils.pInt(RL.settingsGet('Layout')), // TODO cjs
			aLanguages = RL.settingsGet('Languages'),
			aThemes = RL.settingsGet('Themes')
		;

		if (Utils.isArray(aLanguages))
		{
			this.languages(aLanguages);
		}

		if (Utils.isArray(aThemes))
		{
			this.themes(aThemes);
		}

		this.mainLanguage(RL.settingsGet('Language'));
		this.mainTheme(RL.settingsGet('Theme'));

		this.capaAdditionalAccounts(RL.capa(Enums.Capa.AdditionalAccounts));
		this.capaAdditionalIdentities(RL.capa(Enums.Capa.AdditionalIdentities));
		this.capaGravatar(RL.capa(Enums.Capa.Gravatar));
		this.determineUserLanguage(!!RL.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!RL.settingsGet('DetermineUserDomain'));

		this.capaThemes(RL.capa(Enums.Capa.Themes));
		this.allowLanguagesOnLogin(!!RL.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!RL.settingsGet('AllowLanguagesOnSettings'));
		this.useLocalProxyForExternalImages(!!RL.settingsGet('UseLocalProxyForExternalImages'));

		this.editorDefaultType(RL.settingsGet('EditorDefaultType'));
		this.showImages(!!RL.settingsGet('ShowImages'));
		this.contactsAutosave(!!RL.settingsGet('ContactsAutosave'));
		this.interfaceAnimation(RL.settingsGet('InterfaceAnimation'));

		this.mainMessagesPerPage(RL.settingsGet('MPP'));

		this.desktopNotifications(!!RL.settingsGet('DesktopNotifications'));
		this.useThreads(!!RL.settingsGet('UseThreads'));
		this.replySameFolder(!!RL.settingsGet('ReplySameFolder'));
		this.useCheckboxesInList(!!RL.settingsGet('UseCheckboxesInList'));

		this.layout(Enums.Layout.SidePreview);
		if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
		{
			this.layout(mLayout);
		}
		this.facebookSupported(!!RL.settingsGet('SupportedFacebookSocial'));
		this.facebookEnable(!!RL.settingsGet('AllowFacebookSocial'));
		this.facebookAppID(RL.settingsGet('FacebookAppID'));
		this.facebookAppSecret(RL.settingsGet('FacebookAppSecret'));

		this.twitterEnable(!!RL.settingsGet('AllowTwitterSocial'));
		this.twitterConsumerKey(RL.settingsGet('TwitterConsumerKey'));
		this.twitterConsumerSecret(RL.settingsGet('TwitterConsumerSecret'));

		this.googleEnable(!!RL.settingsGet('AllowGoogleSocial'));
		this.googleClientID(RL.settingsGet('GoogleClientID'));
		this.googleClientSecret(RL.settingsGet('GoogleClientSecret'));
		this.googleApiKey(RL.settingsGet('GoogleApiKey'));

		this.dropboxEnable(!!RL.settingsGet('AllowDropboxSocial'));
		this.dropboxApiKey(RL.settingsGet('DropboxApiKey'));

		this.contactsIsAllowed(!!RL.settingsGet('ContactsIsAllowed'));
	};

	module.exports = AbstractData;

}(module));
},{"../Common/Enums.js":5,"../Common/Globals.js":6,"../Common/Utils.js":9,"../External/key.js":20,"../External/ko.js":21}],36:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		CookieDriver = require('./LocalStorages/CookieDriver.js'),
		LocalStorageDriver = require('./LocalStorages/LocalStorageDriver.js')
	;

	/**
	 * @constructor
	 */
	function LocalStorage()
	{
		var
			NextStorageDriver = _.find([LocalStorageDriver, CookieDriver], function (NextStorageDriver) {
				return NextStorageDriver.supported();
			})
		;

		if (NextStorageDriver)
		{
			NextStorageDriver = /** @type {?Function} */ NextStorageDriver;
			this.oDriver = new NextStorageDriver();
		}
	}

	LocalStorage.prototype.oDriver = null;

	/**
	 * @param {number} iKey
	 * @param {*} mData
	 * @return {boolean}
	 */
	LocalStorage.prototype.set = function (iKey, mData)
	{
		return this.oDriver ? this.oDriver.set('p' + iKey, mData) : false;
	};

	/**
	 * @param {number} iKey
	 * @return {*}
	 */
	LocalStorage.prototype.get = function (iKey)
	{
		return this.oDriver ? this.oDriver.get('p' + iKey) : null;
	};

	module.exports = new LocalStorage();

}(module));
},{"../External/underscore.js":24,"./LocalStorages/CookieDriver.js":37,"./LocalStorages/LocalStorageDriver.js":38}],37:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../../External/jquery.js'),
		JSON = require('../../External/JSON.js'),
		Consts = require('../../Common/Consts.js'),
		Utils = require('../../Common/Utils.js')
	;

	/**
	 * @constructor
	 */
	function CookieDriver()
	{

	}

	CookieDriver.supported = function ()
	{
		return true;
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @returns {boolean}
	 */
	CookieDriver.prototype.set = function (sKey, mData)
	{
		var
			mCokieValue = $.cookie(Consts.Values.ClientSideCookieIndexName),
			bResult = false,
			mResult = null
		;

		try
		{
			mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
			if (!mResult)
			{
				mResult = {};
			}

			mResult[sKey] = mData;
			$.cookie(Consts.Values.ClientSideCookieIndexName, JSON.stringify(mResult), {
				'expires': 30
			});

			bResult = true;
		}
		catch (oException) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @returns {*}
	 */
	CookieDriver.prototype.get = function (sKey)
	{
		var
			mCokieValue = $.cookie(Consts.Values.ClientSideCookieIndexName),
			mResult = null
		;

		try
		{
			mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
			if (mResult && !Utils.isUnd(mResult[sKey]))
			{
				mResult = mResult[sKey];
			}
			else
			{
				mResult = null;
			}
		}
		catch (oException) {}

		return mResult;
	};

	module.exports = CookieDriver;

}(module));
},{"../../Common/Consts.js":4,"../../Common/Utils.js":9,"../../External/JSON.js":15,"../../External/jquery.js":19}],38:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../../External/window.js'),
		JSON = require('../../External/JSON.js'),
		Consts = require('../../Common/Consts.js'),
		Utils = require('../../Common/Utils.js')
	;

	/**
	 * @constructor
	 */
	function LocalStorageDriver()
	{
	}

	LocalStorageDriver.supported = function ()
	{
		return !!window.localStorage;
	};

	/**
	 * @param {string} sKey
	 * @param {*} mData
	 * @returns {boolean}
	 */
	LocalStorageDriver.prototype.set = function (sKey, mData)
	{
		var
			mCookieValue = window.localStorage[Consts.Values.ClientSideCookieIndexName] || null,
			bResult = false,
			mResult = null
		;

		try
		{
			mResult = null === mCookieValue ? null : JSON.parse(mCookieValue);
			if (!mResult)
			{
				mResult = {};
			}

			mResult[sKey] = mData;
			window.localStorage[Consts.Values.ClientSideCookieIndexName] = JSON.stringify(mResult);

			bResult = true;
		}
		catch (oException) {}

		return bResult;
	};

	/**
	 * @param {string} sKey
	 * @returns {*}
	 */
	LocalStorageDriver.prototype.get = function (sKey)
	{
		var
			mCokieValue = window.localStorage[Consts.Values.ClientSideCookieIndexName] || null,
			mResult = null
		;

		try
		{
			mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
			if (mResult && !Utils.isUnd(mResult[sKey]))
			{
				mResult = mResult[sKey];
			}
			else
			{
				mResult = null;
			}
		}
		catch (oException) {}

		return mResult;
	};
	
	module.exports = LocalStorageDriver;

}(module));
},{"../../Common/Consts.js":4,"../../Common/Utils.js":9,"../../External/JSON.js":15,"../../External/window.js":25}],39:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),

		Utils = require('../Common/Utils.js'),

		Cache = require('../Storages/WebMailCacheStorage.js'),
		
		AbstractAjaxRemoteStorage = require('./AbstractAjaxRemoteStorage.js')
	;

	/**
	 * @constructor
	 * @extends AbstractAjaxRemoteStorage
	 */
	function WebMailAjaxRemoteStorage()
	{
		AbstractAjaxRemoteStorage.call(this);

		this.oRequests = {};
	}

	_.extend(WebMailAjaxRemoteStorage.prototype, AbstractAjaxRemoteStorage.prototype);

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.folders = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Folders', {
			'SentFolder': RL.settingsGet('SentFolder'),
			'DraftFolder': RL.settingsGet('DraftFolder'),
			'SpamFolder': RL.settingsGet('SpamFolder'),
			'TrashFolder': RL.settingsGet('TrashFolder'),
			'ArchiveFolder': RL.settingsGet('ArchiveFolder')
		}, null, '', ['Folders']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmail
	 * @param {string} sLogin
	 * @param {string} sPassword
	 * @param {boolean} bSignMe
	 * @param {string=} sLanguage
	 * @param {string=} sAdditionalCode
	 * @param {boolean=} bAdditionalCodeSignMe
	 */
	WebMailAjaxRemoteStorage.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe)
	{
		this.defaultRequest(fCallback, 'Login', {
			'Email': sEmail,
			'Login': sLogin,
			'Password': sPassword,
			'Language': sLanguage || '',
			'AdditionalCode': sAdditionalCode || '',
			'AdditionalCodeSignMe': bAdditionalCodeSignMe ? '1' : '0',
			'SignMe': bSignMe ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.getTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'GetTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.createTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.clearTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.showTwoFactorSecret = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sCode
	 */
	WebMailAjaxRemoteStorage.prototype.testTwoFactor = function (fCallback, sCode)
	{
		this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
			'Code': sCode
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 */
	WebMailAjaxRemoteStorage.prototype.enableTwoFactor = function (fCallback, bEnable)
	{
		this.defaultRequest(fCallback, 'EnableTwoFactor', {
			'Enable': bEnable ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.clearTwoFactorInfo = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.contactsSync = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ContactsSync', null, Consts.Defaults.ContactsSyncAjaxTimeout);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 * @param {string} sUrl
	 * @param {string} sUser
	 * @param {string} sPassword
	 */
	WebMailAjaxRemoteStorage.prototype.saveContactsSyncData = function (fCallback, bEnable, sUrl, sUser, sPassword)
	{
		this.defaultRequest(fCallback, 'SaveContactsSyncData', {
			'Enable': bEnable ? '1' : '0',
			'Url': sUrl,
			'User': sUser,
			'Password': sPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmail
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	WebMailAjaxRemoteStorage.prototype.accountAdd = function (fCallback, sEmail, sLogin, sPassword)
	{
		this.defaultRequest(fCallback, 'AccountAdd', {
			'Email': sEmail,
			'Login': sLogin,
			'Password': sPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sEmailToDelete
	 */
	WebMailAjaxRemoteStorage.prototype.accountDelete = function (fCallback, sEmailToDelete)
	{
		this.defaultRequest(fCallback, 'AccountDelete', {
			'EmailToDelete': sEmailToDelete
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sId
	 * @param {string} sEmail
	 * @param {string} sName
	 * @param {string} sReplyTo
	 * @param {string} sBcc
	 */
	WebMailAjaxRemoteStorage.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc)
	{
		this.defaultRequest(fCallback, 'IdentityUpdate', {
			'Id': sId,
			'Email': sEmail,
			'Name': sName,
			'ReplyTo': sReplyTo,
			'Bcc': sBcc
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sIdToDelete
	 */
	WebMailAjaxRemoteStorage.prototype.identityDelete = function (fCallback, sIdToDelete)
	{
		this.defaultRequest(fCallback, 'IdentityDelete', {
			'IdToDelete': sIdToDelete
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.accountsAndIdentities = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AccountsAndIdentities');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {number=} iOffset = 0
	 * @param {number=} iLimit = 20
	 * @param {string=} sSearch = ''
	 * @param {boolean=} bSilent = false
	 */
	WebMailAjaxRemoteStorage.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, bSilent)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

		var
			oData = RL.data(),
			sFolderHash = Cache.getFolderHash(sFolderFullNameRaw)
		;

		bSilent = Utils.isUnd(bSilent) ? false : !!bSilent;
		iOffset = Utils.isUnd(iOffset) ? 0 : Utils.pInt(iOffset);
		iLimit = Utils.isUnd(iOffset) ? 20 : Utils.pInt(iLimit);
		sSearch = Utils.pString(sSearch);

		if ('' !== sFolderHash && ('' === sSearch || -1 === sSearch.indexOf('is:')))
		{
			this.defaultRequest(fCallback, 'MessageList', {},
				'' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
				'MessageList/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iOffset,
					iLimit,
					sSearch,
					oData.projectHash(),
					sFolderHash,
					'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
					oData.threading() && oData.useThreads() ? '1' : '0',
					oData.threading() && sFolderFullNameRaw === oData.messageListThreadFolder() ? oData.messageListThreadUids().join(',') : ''
				].join(String.fromCharCode(0))), bSilent ? [] : ['MessageList']);
		}
		else
		{
			this.defaultRequest(fCallback, 'MessageList', {
				'Folder': sFolderFullNameRaw,
				'Offset': iOffset,
				'Limit': iLimit,
				'Search': sSearch,
				'UidNext': 'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
				'UseThreads': RL.data().threading() && RL.data().useThreads() ? '1' : '0',
				'ExpandedThreadUid': oData.threading() && sFolderFullNameRaw === oData.messageListThreadFolder() ? oData.messageListThreadUids().join(',') : ''
			}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout, '', bSilent ? [] : ['MessageList']);
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aDownloads
	 */
	WebMailAjaxRemoteStorage.prototype.messageUploadAttachments = function (fCallback, aDownloads)
	{
		this.defaultRequest(fCallback, 'MessageUploadAttachments', {
			'Attachments': aDownloads
		}, 999000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iUid
	 * @return {boolean}
	 */
	WebMailAjaxRemoteStorage.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
		iUid = Utils.pInt(iUid);

		if (Cache.getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
		{
			this.defaultRequest(fCallback, 'Message', {}, null,
				'Message/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iUid,
					RL.data().projectHash(),
					RL.data().threading() && RL.data().useThreads() ? '1' : '0'
				].join(String.fromCharCode(0))), ['Message']);

			return true;
		}

		return false;
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aExternals
	 */
	WebMailAjaxRemoteStorage.prototype.composeUploadExternals = function (fCallback, aExternals)
	{
		this.defaultRequest(fCallback, 'ComposeUploadExternals', {
			'Externals': aExternals
		}, 999000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sUrl
	 * @param {string} sAccessToken
	 */
	WebMailAjaxRemoteStorage.prototype.composeUploadDrive = function (fCallback, sUrl, sAccessToken)
	{
		this.defaultRequest(fCallback, 'ComposeUploadDrive', {
			'AccessToken': sAccessToken,
			'Url': sUrl
		}, 999000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {Array=} aList = []
	 */
	WebMailAjaxRemoteStorage.prototype.folderInformation = function (fCallback, sFolder, aList)
	{
		var
			bRequest = true,
			aUids = []
		;

		if (Utils.isArray(aList) && 0 < aList.length)
		{
			bRequest = false;
			_.each(aList, function (oMessageListItem) {
				if (!Cache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, oMessageListItem.uid))
				{
					aUids.push(oMessageListItem.uid);
				}

				if (0 < oMessageListItem.threads().length)
				{
					_.each(oMessageListItem.threads(), function (sUid) {
						if (!Cache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, sUid))
						{
							aUids.push(sUid);
						}
					});
				}
			});

			if (0 < aUids.length)
			{
				bRequest = true;
			}
		}

		if (bRequest)
		{
			this.defaultRequest(fCallback, 'FolderInformation', {
				'Folder': sFolder,
				'FlagsUids': Utils.isArray(aUids) ? aUids.join(',') : '',
				'UidNext': 'INBOX' === sFolder ? Cache.getFolderUidNext(sFolder) : ''
			});
		}
		else if (RL.data().useThreads())
		{
			RL.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aFolders
	 */
	WebMailAjaxRemoteStorage.prototype.folderInformationMultiply = function (fCallback, aFolders)
	{
		this.defaultRequest(fCallback, 'FolderInformationMultiply', {
			'Folders': aFolders
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.logout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Logout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetFlagged
	 */
	WebMailAjaxRemoteStorage.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
	{
		this.defaultRequest(fCallback, 'MessageSetFlagged', {
			'Folder': sFolderFullNameRaw,
			'Uids': aUids.join(','),
			'SetAction': bSetFlagged ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetSeen
	 */
	WebMailAjaxRemoteStorage.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
	{
		this.defaultRequest(fCallback, 'MessageSetSeen', {
			'Folder': sFolderFullNameRaw,
			'Uids': aUids.join(','),
			'SetAction': bSetSeen ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bSetSeen
	 */
	WebMailAjaxRemoteStorage.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
	{
		this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
			'Folder': sFolderFullNameRaw,
			'SetAction': bSetSeen ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sDraftFolder
	 * @param {string} sFrom
	 * @param {string} sTo
	 * @param {string} sCc
	 * @param {string} sBcc
	 * @param {string} sSubject
	 * @param {boolean} bTextIsHtml
	 * @param {string} sText
	 * @param {Array} aAttachments
	 * @param {(Array|null)} aDraftInfo
	 * @param {string} sInReplyTo
	 * @param {string} sReferences
	 */
	WebMailAjaxRemoteStorage.prototype.saveMessage = function (fCallback, sMessageFolder, sMessageUid, sDraftFolder,
		sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences)
	{
		this.defaultRequest(fCallback, 'SaveMessage', {
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'DraftFolder': sDraftFolder,
			'From': sFrom,
			'To': sTo,
			'Cc': sCc,
			'Bcc': sBcc,
			'Subject': sSubject,
			'TextIsHtml': bTextIsHtml ? '1' : '0',
			'Text': sText,
			'DraftInfo': aDraftInfo,
			'InReplyTo': sInReplyTo,
			'References': sReferences,
			'Attachments': aAttachments
		}, Consts.Defaults.SaveMessageAjaxTimeout);
	};


	/**
	 * @param {?Function} fCallback
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sReadReceipt
	 * @param {string} sSubject
	 * @param {string} sText
	 */
	WebMailAjaxRemoteStorage.prototype.sendReadReceiptMessage = function (fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText)
	{
		this.defaultRequest(fCallback, 'SendReadReceiptMessage', {
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'ReadReceipt': sReadReceipt,
			'Subject': sSubject,
			'Text': sText
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sMessageFolder
	 * @param {string} sMessageUid
	 * @param {string} sSentFolder
	 * @param {string} sFrom
	 * @param {string} sTo
	 * @param {string} sCc
	 * @param {string} sBcc
	 * @param {string} sSubject
	 * @param {boolean} bTextIsHtml
	 * @param {string} sText
	 * @param {Array} aAttachments
	 * @param {(Array|null)} aDraftInfo
	 * @param {string} sInReplyTo
	 * @param {string} sReferences
	 * @param {boolean} bRequestReadReceipt
	 */
	WebMailAjaxRemoteStorage.prototype.sendMessage = function (fCallback, sMessageFolder, sMessageUid, sSentFolder,
		sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences, bRequestReadReceipt)
	{
		this.defaultRequest(fCallback, 'SendMessage', {
			'MessageFolder': sMessageFolder,
			'MessageUid': sMessageUid,
			'SentFolder': sSentFolder,
			'From': sFrom,
			'To': sTo,
			'Cc': sCc,
			'Bcc': sBcc,
			'Subject': sSubject,
			'TextIsHtml': bTextIsHtml ? '1' : '0',
			'Text': sText,
			'DraftInfo': aDraftInfo,
			'InReplyTo': sInReplyTo,
			'References': sReferences,
			'ReadReceiptRequest': bRequestReadReceipt ? '1' : '0',
			'Attachments': aAttachments
		}, Consts.Defaults.SendMessageAjaxTimeout);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	WebMailAjaxRemoteStorage.prototype.saveSystemFolders = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	WebMailAjaxRemoteStorage.prototype.saveSettings = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sPrevPassword
	 * @param {string} sNewPassword
	 */
	WebMailAjaxRemoteStorage.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
	{
		this.defaultRequest(fCallback, 'ChangePassword', {
			'PrevPassword': sPrevPassword,
			'NewPassword': sNewPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sNewFolderName
	 * @param {string} sParentName
	 */
	WebMailAjaxRemoteStorage.prototype.folderCreate = function (fCallback, sNewFolderName, sParentName)
	{
		this.defaultRequest(fCallback, 'FolderCreate', {
			'Folder': sNewFolderName,
			'Parent': sParentName
		}, null, '', ['Folders']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 */
	WebMailAjaxRemoteStorage.prototype.folderDelete = function (fCallback, sFolderFullNameRaw)
	{
		this.defaultRequest(fCallback, 'FolderDelete', {
			'Folder': sFolderFullNameRaw
		}, null, '', ['Folders']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sPrevFolderFullNameRaw
	 * @param {string} sNewFolderName
	 */
	WebMailAjaxRemoteStorage.prototype.folderRename = function (fCallback, sPrevFolderFullNameRaw, sNewFolderName)
	{
		this.defaultRequest(fCallback, 'FolderRename', {
			'Folder': sPrevFolderFullNameRaw,
			'NewFolderName': sNewFolderName
		}, null, '', ['Folders']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 */
	WebMailAjaxRemoteStorage.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
	{
		this.defaultRequest(fCallback, 'FolderClear', {
			'Folder': sFolderFullNameRaw
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {boolean} bSubscribe
	 */
	WebMailAjaxRemoteStorage.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
	{
		this.defaultRequest(fCallback, 'FolderSubscribe', {
			'Folder': sFolderFullNameRaw,
			'Subscribe': bSubscribe ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 * @param {string=} sLearning
	 */
	WebMailAjaxRemoteStorage.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids, sLearning)
	{
		this.defaultRequest(fCallback, 'MessageMove', {
			'FromFolder': sFolder,
			'ToFolder': sToFolder,
			'Uids': aUids.join(','),
			'Learning': sLearning || ''
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {string} sToFolder
	 * @param {Array} aUids
	 */
	WebMailAjaxRemoteStorage.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
	{
		this.defaultRequest(fCallback, 'MessageCopy', {
			'FromFolder': sFolder,
			'ToFolder': sToFolder,
			'Uids': aUids.join(',')
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolder
	 * @param {Array} aUids
	 */
	WebMailAjaxRemoteStorage.prototype.messagesDelete = function (fCallback, sFolder, aUids)
	{
		this.defaultRequest(fCallback, 'MessageDelete', {
			'Folder': sFolder,
			'Uids': aUids.join(',')
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.appDelayStart = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AppDelayStart');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.quota = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Quota');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {number} iOffset
	 * @param {number} iLimit
	 * @param {string} sSearch
	 */
	WebMailAjaxRemoteStorage.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
	{
		this.defaultRequest(fCallback, 'Contacts', {
			'Offset': iOffset,
			'Limit': iLimit,
			'Search': sSearch
		}, null, '', ['Contacts']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.contactSave = function (fCallback, sRequestUid, sUid, sTags, aProperties)
	{
		this.defaultRequest(fCallback, 'ContactSave', {
			'RequestUid': sRequestUid,
			'Uid': Utils.trim(sUid),
			'Tags': Utils.trim(sTags),
			'Properties': aProperties
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aUids
	 */
	WebMailAjaxRemoteStorage.prototype.contactsDelete = function (fCallback, aUids)
	{
		this.defaultRequest(fCallback, 'ContactsDelete', {
			'Uids': aUids.join(',')
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sQuery
	 * @param {number} iPage
	 */
	WebMailAjaxRemoteStorage.prototype.suggestions = function (fCallback, sQuery, iPage)
	{
		this.defaultRequest(fCallback, 'Suggestions', {
			'Query': sQuery,
			'Page': iPage
		}, null, '', ['Suggestions']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.facebookUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.facebookDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.twitterUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.twitterDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.googleUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.googleDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	WebMailAjaxRemoteStorage.prototype.socialUsers = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialUsers');
	};

	module.exports = new WebMailAjaxRemoteStorage();

}(module));
},{"../Common/Utils.js":9,"../External/underscore.js":24,"../Storages/WebMailCacheStorage.js":40,"./AbstractAjaxRemoteStorage.js":34}],40:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		RL = require('../RL.js')
	;

	/**
	 * @constructor
	 */
	function WebMailCacheStorage()
	{
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
		this.oNewMessage = {};
		this.oRequestedMessage = {};

		this.bCapaGravatar = RL().capa(Enums.Capa.Gravatar);
	}

	/**
	 * @type {boolean}
	 */
	WebMailCacheStorage.prototype.bCapaGravatar = false;

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oFoldersCache = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oFoldersNamesCache = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oFolderHashCache = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oFolderUidNextCache = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oMessageListHashCache = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oMessageFlagsCache = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oBodies = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oNewMessage = {};

	/**
	 * @type {Object}
	 */
	WebMailCacheStorage.prototype.oRequestedMessage = {};

	WebMailCacheStorage.prototype.clear = function ()
	{
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
		this.oBodies = {};
	};


	/**
	 * @param {string} sEmail
	 * @param {Function} fCallback
	 * @return {string}
	 */
	WebMailCacheStorage.prototype.getUserPic = function (sEmail, fCallback)
	{
		sEmail = Utils.trim(sEmail);
		fCallback(this.bCapaGravatar && '' !== sEmail ? LinkBuilder.avatarLink(sEmail) : '', sEmail);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 * @return {string}
	 */
	WebMailCacheStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
	{
		return sFolderFullNameRaw + '#' + sUid;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 */
	WebMailCacheStorage.prototype.addRequestedMessage = function (sFolder, sUid)
	{
		this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @return {boolean}
	 */
	WebMailCacheStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
	{
		return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	WebMailCacheStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	WebMailCacheStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
	{
		if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
		{
			this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
			return true;
		}

		return false;
	};

	WebMailCacheStorage.prototype.clearNewMessageCache = function ()
	{
		this.oNewMessage = {};
	};

	/**
	 * @param {string} sFolderHash
	 * @return {string}
	 */
	WebMailCacheStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
	{
		return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
	};

	/**
	 * @param {string} sFolderHash
	 * @param {string} sFolderFullNameRaw
	 */
	WebMailCacheStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
	{
		this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	WebMailCacheStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sFolderHash
	 */
	WebMailCacheStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
	{
		this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	WebMailCacheStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUidNext
	 */
	WebMailCacheStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
	{
		this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {?FolderModel}
	 */
	WebMailCacheStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {?FolderModel} oFolder
	 */
	WebMailCacheStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
	{
		this.oFoldersCache[sFolderFullNameRaw] = oFolder;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 */
	WebMailCacheStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
	{
		this.setFolderToCacheList(sFolderFullNameRaw, null);
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @return {?Array}
	 */
	WebMailCacheStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
	{
		return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
			this.oMessageFlagsCache[sFolderFullName][sUid] : null;
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @param {Array} aFlagsCache
	 */
	WebMailCacheStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
	{
		if (!this.oMessageFlagsCache[sFolderFullName])
		{
			this.oMessageFlagsCache[sFolderFullName] = {};
		}

		this.oMessageFlagsCache[sFolderFullName][sUid] = aFlagsCache;
	};

	/**
	 * @param {string} sFolderFullName
	 */
	WebMailCacheStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
	{
		this.oMessageFlagsCache[sFolderFullName] = {};
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	WebMailCacheStorage.prototype.initMessageFlagsFromCache = function (oMessage)
	{
		if (oMessage)
		{
			var
				self = this,
				aFlags = this.getMessageFlagsFromCache(oMessage.folderFullNameRaw, oMessage.uid),
				mUnseenSubUid = null,
				mFlaggedSubUid = null
			;

			if (aFlags && 0 < aFlags.length)
			{
				oMessage.unseen(!!aFlags[0]);
				oMessage.flagged(!!aFlags[1]);
				oMessage.answered(!!aFlags[2]);
				oMessage.forwarded(!!aFlags[3]);
				oMessage.isReadReceipt(!!aFlags[4]);
			}

			if (0 < oMessage.threads().length)
			{
				mUnseenSubUid = _.find(oMessage.threads(), function (iSubUid) {
					var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
					return aFlags && 0 < aFlags.length && !!aFlags[0];
				});

				mFlaggedSubUid = _.find(oMessage.threads(), function (iSubUid) {
					var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
					return aFlags && 0 < aFlags.length && !!aFlags[1];
				});

				oMessage.hasUnseenSubMessage(mUnseenSubUid && 0 < Utils.pInt(mUnseenSubUid));
				oMessage.hasFlaggedSubMessage(mFlaggedSubUid && 0 < Utils.pInt(mFlaggedSubUid));
			}
		}
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	WebMailCacheStorage.prototype.storeMessageFlagsToCache = function (oMessage)
	{
		if (oMessage)
		{
			this.setMessageFlagsToCache(
				oMessage.folderFullNameRaw,
				oMessage.uid,
				[oMessage.unseen(), oMessage.flagged(), oMessage.answered(), oMessage.forwarded(), oMessage.isReadReceipt()]
			);
		}
	};
	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @param {Array} aFlags
	 */
	WebMailCacheStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
	{
		if (Utils.isArray(aFlags) && 0 < aFlags.length)
		{
			this.setMessageFlagsToCache(sFolder, sUid, aFlags);
		}
	};

	module.exports = new WebMailCacheStorage();

}(module));
},{"../Common/Enums.js":5,"../Common/LinkBuilder.js":7,"../Common/Utils.js":9,"../External/underscore.js":24,"../RL.js":32}],41:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		moment = require('../External/moment.js'),
		$div = require('../External/$div.js'),
		NotificationClass = require('../External/NotificationClass.js'),
		
		Consts = require('../Common/Consts.js'),
		Enums = require('../Common/Enums.js'),
		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		Cache = require('../Storages/WebMailCacheStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),
		
		kn = require('../Knoin/Knoin.js'),

		MessageModel = require('../Models/MessageModel.js'),

		LocalStorage = require('./LocalStorage.js'),
		AbstractData = require('./AbstractData.js')
	;

	/**
	 * @constructor
	 * @extends AbstractData
	 */
	function WebMailDataStorage()
	{
		AbstractData.call(this);

		var
			fRemoveSystemFolderType = function (observable) {
				return function () {
					var oFolder = Cache.getFolderFromCacheList(observable()); // TODO cjs
					if (oFolder)
					{
						oFolder.type(Enums.FolderType.User);
					}
				};
			},
			fSetSystemFolderType = function (iType) {
				return function (sValue) {
					var oFolder = Cache.getFolderFromCacheList(sValue); // TODO cjs
					if (oFolder)
					{
						oFolder.type(iType);
					}
				};
			}
		;

		this.devEmail = '';
		this.devPassword = '';

		this.accountEmail = ko.observable('');
		this.accountIncLogin = ko.observable('');
		this.accountOutLogin = ko.observable('');
		this.projectHash = ko.observable('');
		this.threading = ko.observable(false);

		this.lastFoldersHash = '';
		this.remoteSuggestions = false;

		// system folders
		this.sentFolder = ko.observable('');
		this.draftFolder = ko.observable('');
		this.spamFolder = ko.observable('');
		this.trashFolder = ko.observable('');
		this.archiveFolder = ko.observable('');

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

		this.draftFolderNotEnabled = ko.computed(function () {
			return '' === this.draftFolder() || Consts.Values.UnuseOptionValue === this.draftFolder();
		}, this);

		// personal
		this.displayName = ko.observable('');
		this.signature = ko.observable('');
		this.signatureToAll = ko.observable(false);
		this.replyTo = ko.observable('');

		// security
		this.enableTwoFactor = ko.observable(false);

		// accounts
		this.accounts = ko.observableArray([]);
		this.accountsLoading = ko.observable(false).extend({'throttle': 100});

		// identities
		this.defaultIdentityID = ko.observable('');
		this.identities = ko.observableArray([]);
		this.identitiesLoading = ko.observable(false).extend({'throttle': 100});

		// contacts
		this.contactTags = ko.observableArray([]);
		this.contacts = ko.observableArray([]);
		this.contacts.loading = ko.observable(false).extend({'throttle': 200});
		this.contacts.importing = ko.observable(false).extend({'throttle': 200});
		this.contacts.syncing = ko.observable(false).extend({'throttle': 200});
		this.contacts.exportingVcf = ko.observable(false).extend({'throttle': 200});
		this.contacts.exportingCsv = ko.observable(false).extend({'throttle': 200});

		this.allowContactsSync = ko.observable(false);
		this.enableContactsSync = ko.observable(false);
		this.contactsSyncUrl = ko.observable('');
		this.contactsSyncUser = ko.observable('');
		this.contactsSyncPass = ko.observable('');

		this.allowContactsSync = ko.observable(!!RL.settingsGet('ContactsSyncIsAllowed')); // TODO cjs
		this.enableContactsSync = ko.observable(!!RL.settingsGet('EnableContactsSync'));
		this.contactsSyncUrl = ko.observable(RL.settingsGet('ContactsSyncUrl'));
		this.contactsSyncUser = ko.observable(RL.settingsGet('ContactsSyncUser'));
		this.contactsSyncPass = ko.observable(RL.settingsGet('ContactsSyncPassword'));

		// folders
		this.namespace = '';
		this.folderList = ko.observableArray([]);
		this.folderList.focused = ko.observable(false);

		this.foldersListError = ko.observable('');

		this.foldersLoading = ko.observable(false);
		this.foldersCreating = ko.observable(false);
		this.foldersDeleting = ko.observable(false);
		this.foldersRenaming = ko.observable(false);

		this.foldersChanging = ko.computed(function () {
			var
				bLoading = this.foldersLoading(),
				bCreating = this.foldersCreating(),
				bDeleting = this.foldersDeleting(),
				bRenaming = this.foldersRenaming()
			;
			return bLoading || bCreating || bDeleting || bRenaming;
		}, this);

		this.foldersInboxUnreadCount = ko.observable(0);

		this.currentFolder = ko.observable(null).extend({'toggleSubscribe': [null,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.selected(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.selected(true);
				}
			}
		]});

		this.currentFolderFullNameRaw = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().fullNameRaw : '';
		}, this);

		this.currentFolderFullName = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().fullName : '';
		}, this);

		this.currentFolderFullNameHash = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().fullNameHash : '';
		}, this);

		this.currentFolderName = ko.computed(function () {
			return this.currentFolder() ? this.currentFolder().name() : '';
		}, this);

		this.folderListSystemNames = ko.computed(function () {

			var
				aList = ['INBOX'],
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
				return Cache.getFolderFromCacheList(sName); // TODO cjs
			}));
		}, this);

		this.folderMenuForMove = ko.computed(function () {
			return RL.folderListOptionsBuilder(this.folderListSystem(), this.folderList(), [// TODO cjs
				this.currentFolderFullNameRaw()
			], null, null, null, null, function (oItem) {
				return oItem ? oItem.localName() : '';
			});
		}, this);

		// message list
		this.staticMessageList = [];

		this.messageList = ko.observableArray([]).extend({'rateLimit': 0});

		this.messageListCount = ko.observable(0);
		this.messageListSearch = ko.observable('');
		this.messageListPage = ko.observable(1);

		this.messageListThreadFolder = ko.observable('');
		this.messageListThreadUids = ko.observableArray([]);

		this.messageListThreadFolder.subscribe(function () {
			this.messageListThreadUids([]);
		}, this);

		this.messageListEndFolder = ko.observable('');
		this.messageListEndSearch = ko.observable('');
		this.messageListEndPage = ko.observable(1);

		this.messageListEndHash = ko.computed(function () {
			return this.messageListEndFolder() + '|' + this.messageListEndSearch() + '|' + this.messageListEndPage();
		}, this);

		this.messageListPageCount = ko.computed(function () {
			var iPage = window.Math.ceil(this.messageListCount() / this.messagesPerPage());
			return 0 >= iPage ? 1 : iPage;
		}, this);

		this.mainMessageListSearch = ko.computed({
			'read': this.messageListSearch,
			'write': function (sValue) {
				kn.setHash(LinkBuilder.mailBox( // TODO cjs
					this.currentFolderFullNameHash(), 1, Utils.trim(sValue.toString())
				));
			},
			'owner': this
		});

		this.messageListError = ko.observable('');

		this.messageListLoading = ko.observable(false);
		this.messageListIsNotCompleted = ko.observable(false);
		this.messageListCompleteLoadingThrottle = ko.observable(false).extend({'throttle': 200});

		this.messageListCompleteLoading = ko.computed(function () {
			var
				bOne = this.messageListLoading(),
				bTwo = this.messageListIsNotCompleted()
			;
			return bOne || bTwo;
		}, this);

		this.messageListCompleteLoading.subscribe(function (bValue) {
			this.messageListCompleteLoadingThrottle(bValue);
		}, this);

		this.messageList.subscribe(_.debounce(function (aList) {
			_.each(aList, function (oItem) {
				if (oItem.newForAnimation())
				{
					oItem.newForAnimation(false);
				}
			});
		}, 500));

		// message preview
		this.staticMessageList = new MessageModel();// TODO cjs
		this.message = ko.observable(null);
		this.messageLoading = ko.observable(false);
		this.messageLoadingThrottle = ko.observable(false).extend({'throttle': 50});

		this.message.focused = ko.observable(false);

		this.message.subscribe(function (oMessage) {
			if (!oMessage)
			{
				this.message.focused(false);
				this.messageFullScreenMode(false);
				this.hideMessageBodies();

				if (Enums.Layout.NoPreview === RL.data().layout() &&// TODO cjs
					-1 < window.location.hash.indexOf('message-preview'))
				{
					RL.historyBack();// TODO cjs
				}
			}
			else if (Enums.Layout.NoPreview === this.layout())
			{
				this.message.focused(true);
			}
		}, this);

		this.message.focused.subscribe(function (bValue) {
			if (bValue)
			{
				this.folderList.focused(false);
				this.keyScope(Enums.KeyState.MessageView);
			}
			else if (Enums.KeyState.MessageView === RL.data().keyScope())// TODO cjs
			{
				if (Enums.Layout.NoPreview === RL.data().layout() && this.message())// TODO cjs
				{
					this.keyScope(Enums.KeyState.MessageView);
				}
				else
				{
					this.keyScope(Enums.KeyState.MessageList);
				}
			}
		}, this);

		this.folderList.focused.subscribe(function (bValue) {
			if (bValue)
			{
				RL.data().keyScope(Enums.KeyState.FolderList);// TODO cjs
			}
			else if (Enums.KeyState.FolderList === RL.data().keyScope())// TODO cjs
			{
				RL.data().keyScope(Enums.KeyState.MessageList);// TODO cjs
			}
		});

		this.messageLoading.subscribe(function (bValue) {
			this.messageLoadingThrottle(bValue);
		}, this);

		this.messageFullScreenMode = ko.observable(false);

		this.messageError = ko.observable('');

		this.messagesBodiesDom = ko.observable(null);

		this.messagesBodiesDom.subscribe(function (oDom) {
			if (oDom && !(oDom instanceof $))
			{
				this.messagesBodiesDom($(oDom));
			}
		}, this);

		this.messageActiveDom = ko.observable(null);

		this.isMessageSelected = ko.computed(function () {
			return null !== this.message();
		}, this);

		this.currentMessage = ko.observable(null);

		this.messageListChecked = ko.computed(function () {
			return _.filter(this.messageList(), function (oItem) {
				return oItem.checked();
			});
		}, this).extend({'rateLimit': 0});

		this.hasCheckedMessages = ko.computed(function () {
			return 0 < this.messageListChecked().length;
		}, this).extend({'rateLimit': 0});

		this.messageListCheckedOrSelected = ko.computed(function () {

			var
				aChecked = this.messageListChecked(),
				oSelectedMessage = this.currentMessage()
			;

			return _.union(aChecked, oSelectedMessage ? [oSelectedMessage] : []);

		}, this);

		this.messageListCheckedOrSelectedUidsWithSubMails = ko.computed(function () {
			var aList = [];
			_.each(this.messageListCheckedOrSelected(), function (oMessage) {
				if (oMessage)
				{
					aList.push(oMessage.uid);
					if (0 < oMessage.threadsLen() && 0 === oMessage.parentUid() && oMessage.lastInCollapsedThread())
					{
						aList = _.union(aList, oMessage.threads());
					}
				}
			});
			return aList;
		}, this);

		// quota
		this.userQuota = ko.observable(0);
		this.userUsageSize = ko.observable(0);
		this.userUsageProc = ko.computed(function () {

			var
				iQuota = this.userQuota(),
				iUsed = this.userUsageSize()
			;

			return 0 < iQuota ? window.Math.ceil((iUsed / iQuota) * 100) : 0;

		}, this);

		// other
		this.capaOpenPGP = ko.observable(false);
		this.openpgpkeys = ko.observableArray([]);
		this.openpgpKeyring = null;

		this.openpgpkeysPublic = this.openpgpkeys.filter(function (oItem) {
			return !!(oItem && !oItem.isPrivate);
		});

		this.openpgpkeysPrivate = this.openpgpkeys.filter(function (oItem) {
			return !!(oItem && oItem.isPrivate);
		});

		// google
		this.googleActions = ko.observable(false);
		this.googleLoggined = ko.observable(false);
		this.googleUserName = ko.observable('');

		// facebook
		this.facebookActions = ko.observable(false);
		this.facebookLoggined = ko.observable(false);
		this.facebookUserName = ko.observable('');

		// twitter
		this.twitterActions = ko.observable(false);
		this.twitterLoggined = ko.observable(false);
		this.twitterUserName = ko.observable('');

		this.customThemeType = ko.observable(Enums.CustomThemeType.Light);

		this.purgeMessageBodyCacheThrottle = _.throttle(this.purgeMessageBodyCache, 1000 * 30);
	}

	_.extend(WebMailDataStorage.prototype, AbstractData.prototype);

	WebMailDataStorage.prototype.purgeMessageBodyCache = function()
	{
		var
			iCount = 0,
			oMessagesBodiesDom = null,
			iEnd = Globals.iMessageBodyCacheCount - Consts.Values.MessageBodyCacheLimit
		;

		if (0 < iEnd)
		{
			oMessagesBodiesDom = this.messagesBodiesDom();
			if (oMessagesBodiesDom)
			{
				oMessagesBodiesDom.find('.rl-cache-class').each(function () {
					var oItem = $(this);
					if (iEnd > oItem.data('rl-cache-count'))
					{
						oItem.addClass('rl-cache-purge');
						iCount++;
					}
				});

				if (0 < iCount)
				{
					_.delay(function () {
						oMessagesBodiesDom.find('.rl-cache-purge').remove();
					}, 300);
				}
			}
		}
	};

	WebMailDataStorage.prototype.populateDataOnStart = function()
	{
		AbstractData.prototype.populateDataOnStart.call(this);

		this.accountEmail(RL.settingsGet('Email'));// TODO cjs
		this.accountIncLogin(RL.settingsGet('IncLogin'));
		this.accountOutLogin(RL.settingsGet('OutLogin'));
		this.projectHash(RL.settingsGet('ProjectHash'));

		this.defaultIdentityID(RL.settingsGet('DefaultIdentityID'));

		this.displayName(RL.settingsGet('DisplayName'));
		this.replyTo(RL.settingsGet('ReplyTo'));
		this.signature(RL.settingsGet('Signature'));
		this.signatureToAll(!!RL.settingsGet('SignatureToAll'));
		this.enableTwoFactor(!!RL.settingsGet('EnableTwoFactor'));

		this.lastFoldersHash = LocalStorage.get(Enums.ClientSideKeyName.FoldersLashHash) || '';

		this.remoteSuggestions = !!RL.settingsGet('RemoteSuggestions');

		this.devEmail = RL.settingsGet('DevEmail');
		this.devPassword = RL.settingsGet('DevPassword');
	};

	WebMailDataStorage.prototype.initUidNextAndNewMessages = function (sFolder, sUidNext, aNewMessages)
	{
		if ('INBOX' === sFolder && Utils.isNormal(sUidNext) && sUidNext !== '')
		{
			if (Utils.isArray(aNewMessages) && 0 < aNewMessages.length)
			{
				var
					iIndex = 0,
					iLen = aNewMessages.length,
					fNotificationHelper = function (sImageSrc, sTitle, sText)
					{
						var oNotification = null;
						if (NotificationClass && RL.data().useDesktopNotifications())
						{
							oNotification = new NotificationClass(sTitle, {
								'body': sText,
								'icon': sImageSrc
							});

							if (oNotification)
							{
								if (oNotification.show)
								{
									oNotification.show();
								}

								window.setTimeout((function (oLocalNotifications) {
									return function () {
										if (oLocalNotifications.cancel)
										{
											oLocalNotifications.cancel();
										}
										else if (oLocalNotifications.close)
										{
											oLocalNotifications.close();
										}
									};
								}(oNotification)), 7000);
							}
						}
					}
				;

				_.each(aNewMessages, function (oItem) {
					Cache.addNewMessageCache(sFolder, oItem.Uid);
				});

				if (3 < iLen)
				{
					fNotificationHelper(
						LinkBuilder.notificationMailIcon(),
						RL.data().accountEmail(),
						Utils.i18n('MESSAGE_LIST/NEW_MESSAGE_NOTIFICATION', {
							'COUNT': iLen
						})
					);
				}
				else
				{
					for (; iIndex < iLen; iIndex++)
					{
						fNotificationHelper(
							LinkBuilder.notificationMailIcon(),
							MessageModel.emailsToLine(MessageModel.initEmailsFromJson(aNewMessages[iIndex].From), false),
							aNewMessages[iIndex].Subject
						);
					}
				}
			}

			Cache.setFolderUidNext(sFolder, sUidNext);
		}
	};

	/**
	 * @param {string} sNamespace
	 * @param {Array} aFolders
	 * @return {Array}
	 */
	WebMailDataStorage.prototype.folderResponseParseRec = function (sNamespace, aFolders)
	{
		var
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

				oCacheFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);// TODO cjs
				if (!oCacheFolder)
				{
					oCacheFolder = FolderModel.newInstanceFromJson(oFolder);// TODO cjs
					if (oCacheFolder)
					{
						Cache.setFolderToCacheList(sFolderFullNameRaw, oCacheFolder);// TODO cjs
						Cache.setFolderFullNameRaw(oCacheFolder.fullNameHash, sFolderFullNameRaw);// TODO cjs
					}
				}

				if (oCacheFolder)
				{
					oCacheFolder.collapsed(!Utils.isFolderExpanded(oCacheFolder.fullNameHash));

					if (oFolder.Extended)
					{
						if (oFolder.Extended.Hash)
						{
							Cache.setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);// TODO cjs
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

	/**
	 * @param {*} oData
	 */
	WebMailDataStorage.prototype.setFolders = function (oData)
	{
		var
			aList = [],
			bUpdate = false,
			oRLData = RL.data(),// TODO cjs
			fNormalizeFolder = function (sFolderFullNameRaw) {
				return ('' === sFolderFullNameRaw || Consts.Values.UnuseOptionValue === sFolderFullNameRaw ||
					null !== Cache.getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';// TODO cjs
			}
		;

		if (oData && oData.Result && 'Collection/FolderCollection' === oData.Result['@Object'] &&
			oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
		{
			if (!Utils.isUnd(oData.Result.Namespace))
			{
				oRLData.namespace = oData.Result.Namespace;
			}

			this.threading(!!RL.settingsGet('UseImapThread') && oData.Result.IsThreadsSupported && true);// TODO cjs

			aList = this.folderResponseParseRec(oRLData.namespace, oData.Result['@Collection']);
			oRLData.folderList(aList);

			// TODO cjs
			if (oData.Result['SystemFolders'] &&
				'' === '' + RL.settingsGet('SentFolder') + RL.settingsGet('DraftFolder') +
				RL.settingsGet('SpamFolder') + RL.settingsGet('TrashFolder') + RL.settingsGet('ArchiveFolder') +
				RL.settingsGet('NullFolder'))
			{
				// TODO Magic Numbers
				RL.settingsSet('SentFolder', oData.Result['SystemFolders'][2] || null);
				RL.settingsSet('DraftFolder', oData.Result['SystemFolders'][3] || null);
				RL.settingsSet('SpamFolder', oData.Result['SystemFolders'][4] || null);
				RL.settingsSet('TrashFolder', oData.Result['SystemFolders'][5] || null);
				RL.settingsSet('ArchiveFolder', oData.Result['SystemFolders'][12] || null);

				bUpdate = true;
			}

			// TODO cjs
			oRLData.sentFolder(fNormalizeFolder(RL.settingsGet('SentFolder')));
			oRLData.draftFolder(fNormalizeFolder(RL.settingsGet('DraftFolder')));
			oRLData.spamFolder(fNormalizeFolder(RL.settingsGet('SpamFolder')));
			oRLData.trashFolder(fNormalizeFolder(RL.settingsGet('TrashFolder')));
			oRLData.archiveFolder(fNormalizeFolder(RL.settingsGet('ArchiveFolder')));

			if (bUpdate)
			{
				Remote.saveSystemFolders(Utils.emptyFunction, {
					'SentFolder': oRLData.sentFolder(),
					'DraftFolder': oRLData.draftFolder(),
					'SpamFolder': oRLData.spamFolder(),
					'TrashFolder': oRLData.trashFolder(),
					'ArchiveFolder': oRLData.archiveFolder(),
					'NullFolder': 'NullFolder'
				});
			}

			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, oData.Result.FoldersHash);
		}
	};

	WebMailDataStorage.prototype.hideMessageBodies = function ()
	{
		var oMessagesBodiesDom = this.messagesBodiesDom();
		if (oMessagesBodiesDom)
		{
			oMessagesBodiesDom.find('.b-text-part').hide();
		}
	};

	/**
	 * @param {boolean=} bBoot = false
	 * @returns {Array}
	 */
	WebMailDataStorage.prototype.getNextFolderNames = function (bBoot)
	{
		bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

		var
			aResult = [],
			iLimit = 10,
			iUtc = moment().unix(),
			iTimeout = iUtc - 60 * 5,
			aTimeouts = [],
			fSearchFunction = function (aList) {
				_.each(aList, function (oFolder) {
					if (oFolder && 'INBOX' !== oFolder.fullNameRaw &&
						oFolder.selectable && oFolder.existen &&
						iTimeout > oFolder.interval &&
						(!bBoot || oFolder.subScribed()))
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
			if (a[0] < b[0])
			{
				return -1;
			}
			else if (a[0] > b[0])
			{
				return 1;
			}

			return 0;
		});

		_.find(aTimeouts, function (aItem) {
			var oFolder = Cache.getFolderFromCacheList(aItem[1]);// TODO cjs
			if (oFolder)
			{
				oFolder.interval = iUtc;
				aResult.push(aItem[1]);
			}

			return iLimit <= aResult.length;
		});

		return _.uniq(aResult);
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 * @param {string=} sToFolderFullNameRaw = ''
	 * @param {bCopy=} bCopy = false
	 */
	WebMailDataStorage.prototype.removeMessagesFromList = function (
		sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
	{
		sToFolderFullNameRaw = Utils.isNormal(sToFolderFullNameRaw) ? sToFolderFullNameRaw : '';
		bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;

		aUidForRemove = _.map(aUidForRemove, function (mValue) {
			return Utils.pInt(mValue);
		});

		var
			iUnseenCount = 0,
			oData = RL.data(),// TODO cjs
			aMessageList = oData.messageList(),
			oFromFolder = Cache.getFolderFromCacheList(sFromFolderFullNameRaw),
			oToFolder = '' === sToFolderFullNameRaw ? null : Cache.getFolderFromCacheList(sToFolderFullNameRaw || ''),
			sCurrentFolderFullNameRaw = oData.currentFolderFullNameRaw(),
			oCurrentMessage = oData.message(),
			aMessages = sCurrentFolderFullNameRaw === sFromFolderFullNameRaw ? _.filter(aMessageList, function (oMessage) {
				return oMessage && -1 < Utils.inArray(Utils.pInt(oMessage.uid), aUidForRemove);
			}) : []
		;

		_.each(aMessages, function (oMessage) {
			if (oMessage && oMessage.unseen())
			{
				iUnseenCount++;
			}
		});

		if (oFromFolder && !bCopy)
		{
			oFromFolder.messageCountAll(0 <= oFromFolder.messageCountAll() - aUidForRemove.length ?
				oFromFolder.messageCountAll() - aUidForRemove.length : 0);

			if (0 < iUnseenCount)
			{
				oFromFolder.messageCountUnread(0 <= oFromFolder.messageCountUnread() - iUnseenCount ?
					oFromFolder.messageCountUnread() - iUnseenCount : 0);
			}
		}

		if (oToFolder)
		{
			oToFolder.messageCountAll(oToFolder.messageCountAll() + aUidForRemove.length);
			if (0 < iUnseenCount)
			{
				oToFolder.messageCountUnread(oToFolder.messageCountUnread() + iUnseenCount);
			}

			oToFolder.actionBlink(true);
		}

		if (0 < aMessages.length)
		{
			if (bCopy)
			{
				_.each(aMessages, function (oMessage) {
					oMessage.checked(false);
				});
			}
			else
			{
				oData.messageListIsNotCompleted(true);

				_.each(aMessages, function (oMessage) {
					if (oCurrentMessage && oCurrentMessage.hash === oMessage.hash)
					{
						oCurrentMessage = null;
						oData.message(null);
					}

					oMessage.deleted(true);
				});

				_.delay(function () {
					_.each(aMessages, function (oMessage) {
						oData.messageList.remove(oMessage);
					});
				}, 400);
			}
		}

		if ('' !== sFromFolderFullNameRaw)
		{
			Cache.setFolderHash(sFromFolderFullNameRaw, '');
		}

		if ('' !== sToFolderFullNameRaw)
		{
			Cache.setFolderHash(sToFolderFullNameRaw, '');
		}
	};

	WebMailDataStorage.prototype.setMessage = function (oData, bCached)
	{
		var
			bIsHtml = false,
			bHasExternals = false,
			bHasInternals = false,
			oBody = null,
			oTextBody = null,
			sId = '',
			sResultHtml = '',
			bPgpSigned = false,
			bPgpEncrypted = false,
			oMessagesBodiesDom = this.messagesBodiesDom(),
			oMessage = this.message()
		;

		if (oData && oMessage && oData.Result && 'Object/Message' === oData.Result['@Object'] &&
			oMessage.folderFullNameRaw === oData.Result.Folder && oMessage.uid === oData.Result.Uid)
		{
			this.messageError('');

			oMessage.initUpdateByMessageJson(oData.Result);
			Cache.addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);// TODO cjs

			if (!bCached)
			{
				oMessage.initFlagsByJson(oData.Result);
			}

			oMessagesBodiesDom = oMessagesBodiesDom && oMessagesBodiesDom[0] ? oMessagesBodiesDom : null;
			if (oMessagesBodiesDom)
			{
				sId = 'rl-mgs-' + oMessage.hash.replace(/[^a-zA-Z0-9]/g, '');
				oTextBody = oMessagesBodiesDom.find('#' + sId);
				if (!oTextBody || !oTextBody[0])
				{
					bHasExternals = !!oData.Result.HasExternals;
					bHasInternals = !!oData.Result.HasInternals;

					oBody = $('<div id="' + sId + '" />').hide().addClass('rl-cache-class');
					oBody.data('rl-cache-count', ++Globals.iMessageBodyCacheCount);

					if (Utils.isNormal(oData.Result.Html) && '' !== oData.Result.Html)
					{
						bIsHtml = true;
						sResultHtml = oData.Result.Html.toString();
					}
					else if (Utils.isNormal(oData.Result.Plain) && '' !== oData.Result.Plain)
					{
						bIsHtml = false;
						sResultHtml = Utils.plainToHtml(oData.Result.Plain.toString(), false);

						if ((oMessage.isPgpSigned() || oMessage.isPgpEncrypted()) && RL.data().capaOpenPGP())
						{
							oMessage.plainRaw = Utils.pString(oData.Result.Plain);

							bPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(oMessage.plainRaw);
							if (!bPgpEncrypted)
							{
								bPgpSigned = /-----BEGIN PGP SIGNED MESSAGE-----/.test(oMessage.plainRaw) &&
									/-----BEGIN PGP SIGNATURE-----/.test(oMessage.plainRaw);
							}

							$div.empty();
							if (bPgpSigned && oMessage.isPgpSigned())
							{
								sResultHtml =
									$div.append(
										$('<pre class="b-plain-openpgp signed"></pre>').text(oMessage.plainRaw)
									).html()
								;
							}
							else if (bPgpEncrypted && oMessage.isPgpEncrypted())
							{
								sResultHtml =
									$div.append(
										$('<pre class="b-plain-openpgp encrypted"></pre>').text(oMessage.plainRaw)
									).html()
								;
							}

							$div.empty();

							oMessage.isPgpSigned(bPgpSigned);
							oMessage.isPgpEncrypted(bPgpEncrypted);
						}
					}
					else
					{
						bIsHtml = false;
					}

					oBody
						.html(Utils.linkify(sResultHtml))
						.addClass('b-text-part ' + (bIsHtml ? 'html' : 'plain'))
					;

					oMessage.isHtml(!!bIsHtml);
					oMessage.hasImages(!!bHasExternals);
					oMessage.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
					oMessage.pgpSignedVerifyUser('');

					oMessage.body = oBody;
					if (oMessage.body)
					{
						oMessagesBodiesDom.append(oMessage.body);
					}

					oMessage.storeDataToDom();

					if (bHasInternals)
					{
						oMessage.showInternalImages(true);
					}

					if (oMessage.hasImages() && this.showImages())
					{
						oMessage.showExternalImages(true);
					}

					this.purgeMessageBodyCacheThrottle();
				}
				else
				{
					oMessage.body = oTextBody;
					if (oMessage.body)
					{
						oMessage.body.data('rl-cache-count', ++Globals.iMessageBodyCacheCount);
						oMessage.fetchDataToDom();
					}
				}

				this.messageActiveDom(oMessage.body);

				this.hideMessageBodies();
				oMessage.body.show();

				if (oBody)
				{
					Utils.initBlockquoteSwitcher(oBody);
				}
			}

			Cache.initMessageFlagsFromCache(oMessage);
			if (oMessage.unseen())
			{
				RL.setMessageSeen(oMessage);
			}

			Utils.windowResize();
		}
	};

	/**
	 * @param {Array} aList
	 * @returns {string}
	 */
	WebMailDataStorage.prototype.calculateMessageListHash = function (aList)
	{
		return _.map(aList, function (oMessage) {
			return '' + oMessage.hash + '_' + oMessage.threadsLen() + '_' + oMessage.flagHash();
		}).join('|');
	};

	WebMailDataStorage.prototype.setMessageList = function (oData, bCached)
	{
		if (oData && oData.Result && 'Collection/MessageCollection' === oData.Result['@Object'] &&
			oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
		{
			var
				oRainLoopData = RL.data(),
				mLastCollapsedThreadUids = null,
				iIndex = 0,
				iLen = 0,
				iCount = 0,
				iOffset = 0,
				aList = [],
				iUtc = moment().unix(),
				aStaticList = oRainLoopData.staticMessageList,
				oJsonMessage = null,
				oMessage = null,
				oFolder = null,
				iNewCount = 0,
				bUnreadCountChange = false
			;

			iCount = Utils.pInt(oData.Result.MessageResultCount);
			iOffset = Utils.pInt(oData.Result.Offset);

			if (Utils.isNonEmptyArray(oData.Result.LastCollapsedThreadUids))
			{
				mLastCollapsedThreadUids = oData.Result.LastCollapsedThreadUids;
			}

			oFolder = Cache.getFolderFromCacheList(
				Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');

			if (oFolder && !bCached)
			{
				oFolder.interval = iUtc;

				Cache.setFolderHash(oData.Result.Folder, oData.Result.FolderHash);

				if (Utils.isNormal(oData.Result.MessageCount))
				{
					oFolder.messageCountAll(oData.Result.MessageCount);
				}

				if (Utils.isNormal(oData.Result.MessageUnseenCount))
				{
					if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oData.Result.MessageUnseenCount))
					{
						bUnreadCountChange = true;
					}

					oFolder.messageCountUnread(oData.Result.MessageUnseenCount);
				}

				this.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);
			}

			if (bUnreadCountChange && oFolder)
			{
				Cache.clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
			}

			for (iIndex = 0, iLen = oData.Result['@Collection'].length; iIndex < iLen; iIndex++)
			{
				oJsonMessage = oData.Result['@Collection'][iIndex];
				if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
				{
					oMessage = aStaticList[iIndex];
					if (!oMessage || !oMessage.initByJson(oJsonMessage))
					{
						oMessage = MessageModel.newInstanceFromJson(oJsonMessage);
					}

					if (oMessage)
					{
						if (Cache.hasNewMessageAndRemoveFromCache(oMessage.folderFullNameRaw, oMessage.uid) && 5 >= iNewCount)
						{
							iNewCount++;
							oMessage.newForAnimation(true);
						}

						oMessage.deleted(false);

						if (bCached)
						{
							Cache.initMessageFlagsFromCache(oMessage);
						}
						else
						{
							Cache.storeMessageFlagsToCache(oMessage);
						}

						oMessage.lastInCollapsedThread(mLastCollapsedThreadUids && -1 < Utils.inArray(Utils.pInt(oMessage.uid), mLastCollapsedThreadUids) ? true : false);

						aList.push(oMessage);
					}
				}
			}

			oRainLoopData.messageListCount(iCount);
			oRainLoopData.messageListSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
			oRainLoopData.messageListPage(Math.ceil((iOffset / oRainLoopData.messagesPerPage()) + 1));
			oRainLoopData.messageListEndFolder(Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');
			oRainLoopData.messageListEndSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
			oRainLoopData.messageListEndPage(oRainLoopData.messageListPage());

			oRainLoopData.messageList(aList);
			oRainLoopData.messageListIsNotCompleted(false);

			if (aStaticList.length < aList.length)
			{
				oRainLoopData.staticMessageList = aList;
			}

			Cache.clearNewMessageCache();

			if (oFolder && (bCached || bUnreadCountChange || RL.data().useThreads()))
			{
				RL.folderInformation(oFolder.fullNameRaw, aList);
			}
		}
		else
		{
			RL.data().messageListCount(0);
			RL.data().messageList([]);
			RL.data().messageListError(Utils.getNotification(
				oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantGetMessageList
			));
		}
	};

	WebMailDataStorage.prototype.findPublicKeyByHex = function (sHash)
	{
		return _.find(this.openpgpkeysPublic(), function (oItem) {
			return oItem && sHash === oItem.id;
		});
	};

	WebMailDataStorage.prototype.findPublicKeysByEmail = function (sEmail)
	{
		return _.compact(_.map(this.openpgpkeysPublic(), function (oItem) {

			var oKey = null;
			if (oItem && sEmail === oItem.email)
			{
				try
				{
					oKey = window.openpgp.key.readArmored(oItem.armor);
					if (oKey && !oKey.err && oKey.keys && oKey.keys[0])
					{
						return oKey.keys[0];
					}
				}
				catch (e) {}
			}

			return null;

		}));
	};

	/**
	 * @param {string} sEmail
	 * @param {string=} sPassword
	 * @returns {?}
	 */
	WebMailDataStorage.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
	{
		var
			oPrivateKey = null,
			oKey = _.find(this.openpgpkeysPrivate(), function (oItem) {
				return oItem && sEmail === oItem.email;
			})
		;

		if (oKey)
		{
			try
			{
				oPrivateKey = window.openpgp.key.readArmored(oKey.armor);
				if (oPrivateKey && !oPrivateKey.err && oPrivateKey.keys && oPrivateKey.keys[0])
				{
					oPrivateKey = oPrivateKey.keys[0];
					oPrivateKey.decrypt(Utils.pString(sPassword));
				}
				else
				{
					oPrivateKey = null;
				}
			}
			catch (e)
			{
				oPrivateKey = null;
			}
		}

		return oPrivateKey;
	};

	/**
	 * @param {string=} sPassword
	 * @returns {?}
	 */
	WebMailDataStorage.prototype.findSelfPrivateKey = function (sPassword)
	{
		return this.findPrivateKeyByEmail(this.accountEmail(), sPassword);
	};

	module.exports = new WebMailDataStorage();

}(module));

},{"../Common/Consts.js":4,"../Common/Enums.js":5,"../Common/Globals.js":6,"../Common/LinkBuilder.js":7,"../Common/Utils.js":9,"../External/$div.js":10,"../External/NotificationClass.js":16,"../External/jquery.js":19,"../External/ko.js":21,"../External/moment.js":22,"../External/underscore.js":24,"../External/window.js":25,"../Knoin/Knoin.js":26,"../Models/MessageModel.js":31,"../Storages/WebMailAjaxRemoteStorage.js":39,"../Storages/WebMailCacheStorage.js":40,"./AbstractData.js":35,"./LocalStorage.js":36}],42:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../../External/ko.js'),
		key = require('../../External/key.js'),
		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),
		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsAskViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAsk');

		this.askDesc = ko.observable('');
		this.yesButton = ko.observable('');
		this.noButton = ko.observable('');

		this.yesFocus = ko.observable(false);
		this.noFocus = ko.observable(false);

		this.fYesAction = null;
		this.fNoAction = null;

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.PopupAsk;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsAskViewModel', PopupsAskViewModel);

	PopupsAskViewModel.prototype.clearPopup = function ()
	{
		this.askDesc('');
		this.yesButton(Utils.i18n('POPUPS_ASK/BUTTON_YES'));
		this.noButton(Utils.i18n('POPUPS_ASK/BUTTON_NO'));

		this.yesFocus(false);
		this.noFocus(false);

		this.fYesAction = null;
		this.fNoAction = null;
	};

	PopupsAskViewModel.prototype.yesClick = function ()
	{
		this.cancelCommand();

		if (Utils.isFunc(this.fYesAction))
		{
			this.fYesAction.call(null);
		}
	};

	PopupsAskViewModel.prototype.noClick = function ()
	{
		this.cancelCommand();

		if (Utils.isFunc(this.fNoAction))
		{
			this.fNoAction.call(null);
		}
	};

	/**
	 * @param {string} sAskDesc
	 * @param {Function=} fYesFunc
	 * @param {Function=} fNoFunc
	 * @param {string=} sYesButton
	 * @param {string=} sNoButton
	 */
	PopupsAskViewModel.prototype.onShow = function (sAskDesc, fYesFunc, fNoFunc, sYesButton, sNoButton)
	{
		this.clearPopup();

		this.fYesAction = fYesFunc || null;
		this.fNoAction = fNoFunc || null;

		this.askDesc(sAskDesc || '');
		if (sYesButton)
		{
			this.yesButton(sYesButton);
		}

		if (sYesButton)
		{
			this.yesButton(sNoButton);
		}
	};

	PopupsAskViewModel.prototype.onFocus = function ()
	{
		this.yesFocus(true);
	};

	PopupsAskViewModel.prototype.onBuild = function ()
	{
		key('tab, shift+tab, right, left', Enums.KeyState.PopupAsk, _.bind(function () {
			if (this.yesFocus())
			{
				this.noFocus(true);
			}
			else
			{
				this.yesFocus(true);
			}
			return false;
		}, this));

		key('esc', Enums.KeyState.PopupAsk, _.bind(function () {
			this.noClick();
			return false;
		}, this));
	};

	module.exports = new PopupsAskViewModel();

}(module));
},{"../../Common/Enums.js":5,"../../Common/Utils.js":9,"../../External/key.js":20,"../../External/ko.js":21,"../../Knoin/Knoin.js":26,"../../Knoin/KnoinAbstractViewModel.js":28}]},{},[1]);
