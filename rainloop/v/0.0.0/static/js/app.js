/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (require) {
	'use strict';
	require('App:Boot')(require('App:RainLoop'));
}(require));
},{"App:Boot":4,"App:RainLoop":3}],2:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),

		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),
		Events = require('Events'),

		Settings = require('Storage:Settings'),

		KnoinAbstractBoot = require('Knoin:AbstractBoot')
	;

	/**
	 * @constructor
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 * @extends KnoinAbstractBoot
	 */
	function AbstractApp(Remote)
	{
		KnoinAbstractBoot.call(this);

		this.isLocalAutocomplete = true;

		this.iframe = $('<iframe style="display:none" src="javascript:;" />').appendTo('body');

		Globals.$win.on('error', function (oEvent) {
			if (oEvent && oEvent.originalEvent && oEvent.originalEvent.message &&
				-1 === Utils.inArray(oEvent.originalEvent.message, [
					'Script error.', 'Uncaught Error: Error calling method on NPObject.'
				]))
			{
				Remote.jsError(
					Utils.emptyFunction,
					oEvent.originalEvent.message,
					oEvent.originalEvent.filename,
					oEvent.originalEvent.lineno,
					window.location && window.location.toString ? window.location.toString() : '',
					Globals.$html.attr('class'),
					Utils.microtime() - Globals.now
				);
			}
		});

		Globals.$doc.on('keydown', function (oEvent) {
			if (oEvent && oEvent.ctrlKey)
			{
				Globals.$html.addClass('rl-ctrl-key-pressed');
			}
		}).on('keyup', function (oEvent) {
			if (oEvent && !oEvent.ctrlKey)
			{
				Globals.$html.removeClass('rl-ctrl-key-pressed');
			}
		});
	}

	_.extend(AbstractApp.prototype, KnoinAbstractBoot.prototype);

	AbstractApp.prototype.remote = function ()
	{
		return null;
	};

	AbstractApp.prototype.data = function ()
	{
		return null;
	};

	AbstractApp.prototype.setupSettings = function ()
	{
		return true;
	};

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
	 * @param {string} sTitle
	 */
	AbstractApp.prototype.setTitle = function (sTitle)
	{
		sTitle = ((Utils.isNormal(sTitle) && 0 < sTitle.length) ? sTitle + ' - ' : '') +
			Settings.settingsGet('Title') || '';

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
			kn = require('App:Knoin'),
			sCustomLogoutLink = Utils.pString(Settings.settingsGet('CustomLogoutLink')),
			bInIframe = !!Settings.settingsGet('InIframe')
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

	AbstractApp.prototype.bootstart = function ()
	{
		Events.pub('rl.bootstart');

		var ssm = require('ssm');

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
				Globals.$html.addClass('ssm-state-mobile');
				Events.pub('ssm.mobile-enter');
			},
			'onLeave': function() {
				Globals.$html.removeClass('ssm-state-mobile');
				Events.pub('ssm.mobile-leave');
			}
		});

		ssm.addState({
			'id': 'tablet',
			'minWidth': 768,
			'maxWidth': 999,
			'onEnter': function() {
				Globals.$html.addClass('ssm-state-tablet');
			},
			'onLeave': function() {
				Globals.$html.removeClass('ssm-state-tablet');
			}
		});

		ssm.addState({
			'id': 'desktop',
			'minWidth': 1000,
			'maxWidth': 1400,
			'onEnter': function() {
				Globals.$html.addClass('ssm-state-desktop');
			},
			'onLeave': function() {
				Globals.$html.removeClass('ssm-state-desktop');
			}
		});

		ssm.addState({
			'id': 'desktop-large',
			'minWidth': 1400,
			'onEnter': function() {
				Globals.$html.addClass('ssm-state-desktop-large');
			},
			'onLeave': function() {
				Globals.$html.removeClass('ssm-state-desktop-large');
			}
		});

		Events.sub('ssm.mobile-enter', function () {
			Globals.leftPanelDisabled(true);
		});

		Events.sub('ssm.mobile-leave', function () {
			Globals.leftPanelDisabled(false);
		});

		Globals.leftPanelDisabled.subscribe(function (bValue) {
			Globals.$html.toggleClass('rl-left-panel-disabled', bValue);
		});

		ssm.ready();
	};

	module.exports = AbstractApp;

}(module, require));
},{"$":20,"App:Knoin":27,"Events":8,"Globals":9,"Knoin:AbstractBoot":28,"LinkBuilder":11,"Storage:Settings":69,"Utils":14,"_":25,"ssm":24,"window":26}],3:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		moment = require('moment'),

		Enums = require('Enums'),
		Globals = require('Globals'),
		Consts = require('Consts'),
		Plugins = require('Plugins'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),
		Events = require('Events'),

		kn = require('App:Knoin'),

		LocalStorage = require('Storage:LocalStorage'),
		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Cache = require('Storage:RainLoop:Cache'),
		Remote = require('Storage:RainLoop:Remote'),

		EmailModel = require('Model:Email'),
		FolderModel = require('Model:Folder'),
		MessageModel = require('Model:Message'),
		AccountModel = require('Model:Account'),
		IdentityModel = require('Model:Identity'),
		OpenPgpKeyModel = require('Model:OpenPgpKey'),

		AbstractApp = require('App:Abstract')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function RainLoopApp()
	{
		AbstractApp.call(this, Remote);

		this.oMoveCache = {};

		this.quotaDebounce = _.debounce(this.quota, 1000 * 30);
		this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

		this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

		window.setInterval(function () {
			Events.pub('interval.30s');
		}, 30000);

		window.setInterval(function () {
			Events.pub('interval.1m');
		}, 60000);

		window.setInterval(function () {
			Events.pub('interval.2m');
		}, 60000 * 2);

		window.setInterval(function () {
			Events.pub('interval.3m');
		}, 60000 * 3);

		window.setInterval(function () {
			Events.pub('interval.5m');
		}, 60000 * 5);

		window.setInterval(function () {
			Events.pub('interval.10m');
		}, 60000 * 10);

		window.setTimeout(function () {
			window.setInterval(function () {
				Events.pub('interval.10m-after5m');
			}, 60000 * 10);
		}, 60000 * 5);

		$.wakeUp(function () {

			Remote.jsVersion(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult && oData && !oData.Result)
				{
					if (window.parent && !!Settings.settingsGet('InIframe'))
					{
						window.parent.location.reload();
					}
					else
					{
						window.location.reload();
					}
				}
			}, Settings.settingsGet('Version'));

		}, {}, 60 * 60 * 1000);


		this.socialUsers = _.bind(this.socialUsers, this);
	}

	_.extend(RainLoopApp.prototype, AbstractApp.prototype);

	RainLoopApp.prototype.remote = function ()
	{
		return Remote;
	};

	RainLoopApp.prototype.data = function ()
	{
		return Data;
	};

	RainLoopApp.prototype.setupSettings = function ()
	{
		kn.addSettingsViewModel(require('Settings:RainLoop:General'),
			'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

		if (Settings.settingsGet('ContactsIsAllowed'))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Contacts'),
				'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
		}

		if (Settings.capa(Enums.Capa.AdditionalAccounts))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Accounts'),
				'SettingsAccounts', 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME', 'accounts');
		}

		if (Settings.capa(Enums.Capa.AdditionalIdentities))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Identities'),
				'SettingsIdentities', 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME', 'identities');
		}
		else
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Identity'),
				'SettingsIdentity', 'SETTINGS_LABELS/LABEL_IDENTITY_NAME', 'identity');
		}

		if (Settings.capa(Enums.Capa.Filters))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Filters'),
				'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
		}

		if (Settings.capa(Enums.Capa.TwoFactor))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Security'),
				'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
		}

		if (Settings.settingsGet('AllowGoogleSocial') ||
			Settings.settingsGet('AllowFacebookSocial') ||
			Settings.settingsGet('AllowTwitterSocial'))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Social'),
				'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
		}

		if (Settings.settingsGet('ChangePasswordIsAllowed'))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:ChangePassword'),
				'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');
		}

		kn.addSettingsViewModel(require('Settings:RainLoop:Folders'),
			'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');

		if (Settings.capa(Enums.Capa.Themes))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:Themes'),
				'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
		}

		if (Settings.capa(Enums.Capa.OpenPGP))
		{
			kn.addSettingsViewModel(require('Settings:RainLoop:OpenPGP'),
				'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');
		}

		return true;
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
			self = this,
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
				self.setMessageList(oData, bCached);
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
		this.reloadMessageList(bEmptyList);
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

			this.reloadMessageListHelper(0 === Data.messageList().length);
			this.quotaDebounce();
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
			kn.showScreenPopup(require('View:Popup:FolderSystem'), [nSetSystemFoldersNotification]);
		}
		else if (!bUseFolder || (Enums.FolderType.Trash === iDeleteType &&
			(sFromFolderFullNameRaw === Data.spamFolder() || sFromFolderFullNameRaw === Data.trashFolder())))
		{
			kn.showScreenPopup(require('View:Popup:Ask'), [Utils.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), function () {

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
		Data.foldersLoading(true);
		Remote.folders(_.bind(function (sResult, oData) {

			Data.foldersLoading(false);
			if (Enums.StorageResultType.Success === sResult)
			{
				this.setFolders(oData);
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
					sParentEmail = Settings.settingsGet('ParentEmail'),
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
		Remote.quota(function (sResult, oData) {
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
			var self = this;
			Remote.folderInformation(function (sResult, oData) {
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
									self.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							Data.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

							if (oData.Result.Hash !== sHash || '' === sHash)
							{
								if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
								{
									self.reloadMessageList();
								}
								else if ('INBOX' === oFolder.fullNameRaw)
								{
									self.recacheInboxMessageList();
								}
							}
							else if (bUnreadCountChange)
							{
								if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
								{
									aList = Data.messageList();
									if (Utils.isNonEmptyArray(aList))
									{
										self.folderInformation(oFolder.fullNameRaw, aList);
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
			self = this,
			iUtc = moment().unix(),
			aFolders = Data.getNextFolderNames(bBoot)
		;

		if (Utils.isNonEmptyArray(aFolders))
		{
			Remote.folderInformationMultiply(function (sResult, oData) {
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
										self.reloadMessageList();
									}
								}
								else if (bUnreadCountChange)
								{
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										aList = Data.messageList();
										if (Utils.isNonEmptyArray(aList))
										{
											self.folderInformation(oFolder.fullNameRaw, aList);
										}
									}
								}
							}
						});

						if (bBoot)
						{
							self.folderInformationMultiply(true);
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
			this.reloadFlagsCurrentMessageListAndMessageFromCache();
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
		Remote.googleDisconnect(this.socialUsers);
	};

	RainLoopApp.prototype.facebookDisconnect = function ()
	{
		Data.facebookActions(true);
		Remote.facebookDisconnect(this.socialUsers);
	};

	RainLoopApp.prototype.twitterDisconnect = function ()
	{
		Data.twitterActions(true);
		Remote.twitterDisconnect(this.socialUsers);
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

	RainLoopApp.prototype.setMessageList = function (oData, bCached)
	{
		if (oData && oData.Result && 'Collection/MessageCollection' === oData.Result['@Object'] &&
			oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
		{
			var
				mLastCollapsedThreadUids = null,
				iIndex = 0,
				iLen = 0,
				iCount = 0,
				iOffset = 0,
				aList = [],
				iUtc = moment().unix(),
				aStaticList = Data.staticMessageList,
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

				Data.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);
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

			Data.messageListCount(iCount);
			Data.messageListSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
			Data.messageListPage(window.Math.ceil((iOffset / Data.messagesPerPage()) + 1));
			Data.messageListEndFolder(Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');
			Data.messageListEndSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
			Data.messageListEndPage(Data.messageListPage());

			Data.messageList(aList);
			Data.messageListIsNotCompleted(false);

			if (aStaticList.length < aList.length)
			{
				Data.staticMessageList = aList;
			}

			Cache.clearNewMessageCache();

			if (oFolder && (bCached || bUnreadCountChange || Data.useThreads()))
			{
				this.folderInformation(oFolder.fullNameRaw, aList);
			}
		}
		else
		{
			Data.messageListCount(0);
			Data.messageList([]);
			Data.messageListError(Utils.getNotification(
				oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantGetMessageList
			));
		}
	};

	/**
	 * @param {string} sNamespace
	 * @param {Array} aFolders
	 * @return {Array}
	 */
	RainLoopApp.prototype.folderResponseParseRec = function (sNamespace, aFolders)
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
						Cache.setFolderFullNameRaw(oCacheFolder.fullNameHash, sFolderFullNameRaw);
					}
				}

				if (oCacheFolder)
				{
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

	/**
	 * @param {*} oData
	 */
	RainLoopApp.prototype.setFolders = function (oData)
	{
		var
			aList = [],
			bUpdate = false,
			fNormalizeFolder = function (sFolderFullNameRaw) {
				return ('' === sFolderFullNameRaw || Consts.Values.UnuseOptionValue === sFolderFullNameRaw ||
					null !== Cache.getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';
			}
		;

		if (oData && oData.Result && 'Collection/FolderCollection' === oData.Result['@Object'] &&
			oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
		{
			if (!Utils.isUnd(oData.Result.Namespace))
			{
				Data.namespace = oData.Result.Namespace;
			}

			Data.threading(!!Settings.settingsGet('UseImapThread') && oData.Result.IsThreadsSupported && true);

			aList = this.folderResponseParseRec(Data.namespace, oData.Result['@Collection']);
			Data.folderList(aList);

			if (oData.Result['SystemFolders'] &&
				'' === '' + Settings.settingsGet('SentFolder') + Settings.settingsGet('DraftFolder') +
				Settings.settingsGet('SpamFolder') + Settings.settingsGet('TrashFolder') + Settings.settingsGet('ArchiveFolder') +
				Settings.settingsGet('NullFolder'))
			{
				// TODO Magic Numbers
				Settings.settingsSet('SentFolder', oData.Result['SystemFolders'][2] || null);
				Settings.settingsSet('DraftFolder', oData.Result['SystemFolders'][3] || null);
				Settings.settingsSet('SpamFolder', oData.Result['SystemFolders'][4] || null);
				Settings.settingsSet('TrashFolder', oData.Result['SystemFolders'][5] || null);
				Settings.settingsSet('ArchiveFolder', oData.Result['SystemFolders'][12] || null);

				bUpdate = true;
			}

			Data.sentFolder(fNormalizeFolder(Settings.settingsGet('SentFolder')));
			Data.draftFolder(fNormalizeFolder(Settings.settingsGet('DraftFolder')));
			Data.spamFolder(fNormalizeFolder(Settings.settingsGet('SpamFolder')));
			Data.trashFolder(fNormalizeFolder(Settings.settingsGet('TrashFolder')));
			Data.archiveFolder(fNormalizeFolder(Settings.settingsGet('ArchiveFolder')));

			if (bUpdate)
			{
				Remote.saveSystemFolders(Utils.emptyFunction, {
					'SentFolder': Data.sentFolder(),
					'DraftFolder': Data.draftFolder(),
					'SpamFolder': Data.spamFolder(),
					'TrashFolder': Data.trashFolder(),
					'ArchiveFolder': Data.archiveFolder(),
					'NullFolder': 'NullFolder'
				});
			}

			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, oData.Result.FoldersHash);
		}
	};

	/**
	 * @param {string} sFullNameHash
	 * @return {boolean}
	 */
	RainLoopApp.prototype.isFolderExpanded = function (sFullNameHash)
	{
		var aExpandedList = LocalStorage.get(Enums.ClientSideKeyName.ExpandedFolders);
		return _.isArray(aExpandedList) && -1 !== _.indexOf(aExpandedList, sFullNameHash);
	};

	/**
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	RainLoopApp.prototype.setExpandedFolder = function (sFullNameHash, bExpanded)
	{
		var aExpandedList = LocalStorage.get(Enums.ClientSideKeyName.ExpandedFolders);
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

	RainLoopApp.prototype.initLayoutResizer = function (sLeft, sRight, sClientSideKeyName)
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

		Events.sub('left-panel.off', function () {
			fDisable(true);
		});

		Events.sub('left-panel.on', function () {
			fDisable(false);
		});
	};

	RainLoopApp.prototype.bootstartLoginScreen = function ()
	{
		var sCustomLoginLink = Utils.pString(Settings.settingsGet('CustomLoginLink'));
		if (!sCustomLoginLink)
		{
			kn.hideLoading();

			kn.startScreens([
				require('Screen:RainLoop:Login')
			]);

			Plugins.runHook('rl-start-login-screens');
			Events.pub('rl.bootstart-login-screens');
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
	};

	RainLoopApp.prototype.bootstart = function ()
	{
		AbstractApp.prototype.bootstart.call(this);

		Data.populateDataOnStart();

		var
			self = this,
			sJsHash = Settings.settingsGet('JsHash'),
			iContactsSyncInterval = Utils.pInt(Settings.settingsGet('ContactsSyncInterval')),
			bGoogle = Settings.settingsGet('AllowGoogleSocial'),
			bFacebook = Settings.settingsGet('AllowFacebookSocial'),
			bTwitter = Settings.settingsGet('AllowTwitterSocial')
		;

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

		Globals.leftPanelDisabled.subscribe(function (bValue) {
			Events.pub('left-panel.' + (bValue ? 'off' : 'on'));
		});

		if (!!Settings.settingsGet('Auth'))
		{
			this.setTitle(Utils.i18n('TITLES/LOADING'));

			this.folders(_.bind(function (bValue) {

				kn.hideLoading();

				if (bValue)
				{
					if (window.$LAB && window.crypto && window.crypto.getRandomValues && Settings.capa(Enums.Capa.OpenPGP))
					{
						window.$LAB.script(window.openpgp ? '' : LinkBuilder.openPgpJs()).wait(function () {
							if (window.openpgp)
							{
								Data.openpgpKeyring = new window.openpgp.Keyring();
								Data.capaOpenPGP(true);

								Events.pub('openpgp.init');

								self.reloadOpenPgpKeys();
							}
						});
					}
					else
					{
						Data.capaOpenPGP(false);
					}

					kn.startScreens([
						require('Screen:RainLoop:MailBox'),
						require('Screen:RainLoop:Settings'),
						require('Screen:RainLoop:About')
					]);

					if (bGoogle || bFacebook || bTwitter)
					{
						self.socialUsers(true);
					}

					Events.sub('interval.2m', function () {
						self.folderInformation('INBOX');
					});

					Events.sub('interval.2m', function () {
						var sF = Data.currentFolderFullNameRaw();
						if ('INBOX' !== sF)
						{
							self.folderInformation(sF);
						}
					});

					Events.sub('interval.3m', function () {
						self.folderInformationMultiply();
					});

					Events.sub('interval.5m', function () {
						self.quota();
					});

					Events.sub('interval.10m', function () {
						self.folders();
					});

					iContactsSyncInterval = 5 <= iContactsSyncInterval ? iContactsSyncInterval : 20;
					iContactsSyncInterval = 320 >= iContactsSyncInterval ? iContactsSyncInterval : 320;

					window.setInterval(function () {
						self.contactsSync();
					}, iContactsSyncInterval * 60000 + 5000);

					_.delay(function () {
						self.contactsSync();
					}, 5000);

					_.delay(function () {
						self.folderInformationMultiply(true);
					}, 500);

					Plugins.runHook('rl-start-user-screens');
					Events.pub('rl.bootstart-user-screens');

					if (!!Settings.settingsGet('AccountSignMe') && window.navigator.registerProtocolHandler)
					{
						_.delay(function () {
							try {
								window.navigator.registerProtocolHandler('mailto',
									window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
									'' + (Settings.settingsGet('Title') || 'RainLoop'));
							} catch(e) {}

							if (Settings.settingsGet('MailToEmail'))
							{
								Utils.mailToHelper(Settings.settingsGet('MailToEmail'), require('View:Popup:Compose'));
							}
						}, 500);
					}

					if (!Globals.bMobileDevice)
					{
						_.defer(function () {
							self.initLayoutResizer('#rl-left', '#rl-right', Enums.ClientSideKeyName.FolderListSize);
						});
					}
				}
				else
				{
					self.bootstartLoginScreen();
				}

				if (window.SimplePace)
				{
					window.SimplePace.set(100);
				}

			}, this));
		}
		else
		{
			this.bootstartLoginScreen();

			if (window.SimplePace)
			{
				window.SimplePace.set(100);
			}
		}

		if (bGoogle)
		{
			window['rl_' + sJsHash + '_google_service'] = function () {
				Data.googleActions(true);
				self.socialUsers();
			};
		}

		if (bFacebook)
		{
			window['rl_' + sJsHash + '_facebook_service'] = function () {
				Data.facebookActions(true);
				self.socialUsers();
			};
		}

		if (bTwitter)
		{
			window['rl_' + sJsHash + '_twitter_service'] = function () {
				Data.twitterActions(true);
				self.socialUsers();
			};
		}

		Events.sub('interval.1m', function () {
			Globals.momentTrigger(!Globals.momentTrigger());
		});

		Plugins.runHook('rl-start-screens');
		Events.pub('rl.bootstart-end');
	};

	module.exports = new RainLoopApp();

}(module, require));
},{"$":20,"App:Abstract":2,"App:Knoin":27,"Consts":6,"Enums":7,"Events":8,"Globals":9,"LinkBuilder":11,"Model:Account":31,"Model:Email":37,"Model:Folder":40,"Model:Identity":41,"Model:Message":42,"Model:OpenPgpKey":43,"Plugins":12,"Screen:RainLoop:About":44,"Screen:RainLoop:Login":46,"Screen:RainLoop:MailBox":47,"Screen:RainLoop:Settings":48,"Settings:RainLoop:Accounts":49,"Settings:RainLoop:ChangePassword":50,"Settings:RainLoop:Contacts":51,"Settings:RainLoop:Filters":52,"Settings:RainLoop:Folders":53,"Settings:RainLoop:General":54,"Settings:RainLoop:Identities":55,"Settings:RainLoop:Identity":56,"Settings:RainLoop:OpenPGP":57,"Settings:RainLoop:Security":58,"Settings:RainLoop:Social":59,"Settings:RainLoop:Themes":60,"Storage:LocalStorage":65,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:Popup:Ask":80,"View:Popup:Compose":82,"View:Popup:FolderSystem":87,"_":25,"moment":23,"window":26}],4:[function(require,module,exports){

(function (module, require) {

	'use strict';

	module.exports = function (App) {

		var
			window = require('window'),
			_ = require('_'),
			$ = require('$'),

			Globals = require('Globals'),
			Plugins = require('Plugins'),
			Utils = require('Utils'),
			Enums = require('Enums'),

			EmailModel = require('Model:Email')
		;

		Globals.__APP = App;

		App.setupSettings();

		Plugins.__boot = App;
		Plugins.__remote = App.remote();
		Plugins.__data = App.data();

		Globals.$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

		Globals.$win.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);

		Globals.$win.unload(function () {
			Globals.bUnload = true;
		});

		Globals.$html.on('click.dropdown.data-api', function () {
			Utils.detectDropdownVisibility();
		});

		// export
		window['rl'] = window['rl'] || {};
		window['rl']['addHook'] = _.bind(Plugins.addHook, Plugins);
		window['rl']['settingsGet'] = _.bind(Plugins.mainSettingsGet, Plugins);
		window['rl']['remoteRequest'] = _.bind(Plugins.remoteRequest, Plugins);
		window['rl']['pluginSettingsGet'] = _.bind(Plugins.settingsGet, Plugins);
		window['rl']['createCommand'] = Utils.createCommand;

		window['rl']['EmailModel'] = EmailModel;
		window['rl']['Enums'] = Enums;

		window['__APP_BOOT'] = function (fCall) {

			// boot
			$(function () {

				if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
				{
					$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

					_.delay(function () {

						App.bootstart();
						Globals.$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');

					}, 10);
				}
				else
				{
					fCall(false);
				}

				window['__APP_BOOT'] = null;
			});
		};

	};

}(module, require));
},{"$":20,"Enums":7,"Globals":9,"Model:Email":37,"Plugins":12,"Utils":14,"_":25,"window":26}],5:[function(require,module,exports){
// Base64 encode / decode
// http://www.webtoolkit.info/

(function (module) {

	'use strict';

	/*jslint bitwise: true*/
	var Base64 = {

		// private property
		_keyStr : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

		// public method for urlsafe encoding
		urlsafe_encode : function (input) {
			return Base64.encode(input).replace(/[+]/g, '-').replace(/[\/]/g, '_').replace(/[=]/g, '.');
		},

		// public method for encoding
		encode : function (input) {
			var
				output = '',
				chr1, chr2, chr3, enc1, enc2, enc3, enc4,
				i = 0
			;

			input = Base64._utf8_encode(input);

			while (i < input.length)
			{
				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2))
				{
					enc3 = enc4 = 64;
				}
				else if (isNaN(chr3))
				{
					enc4 = 64;
				}

				output = output +
					this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
					this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
			}

			return output;
		},

		// public method for decoding
		decode : function (input) {
			var
				output = '',
				chr1, chr2, chr3, enc1, enc2, enc3, enc4,
				i = 0
			;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

			while (i < input.length)
			{
				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 !== 64)
				{
					output = output + String.fromCharCode(chr2);
				}

				if (enc4 !== 64)
				{
					output = output + String.fromCharCode(chr3);
				}
			}

			return Base64._utf8_decode(output);
		},

		// private method for UTF-8 encoding
		_utf8_encode : function (string) {

			string = string.replace(/\r\n/g, "\n");

			var
				utftext = '',
				n = 0,
				l = string.length,
				c = 0
			;

			for (; n < l; n++) {

				c = string.charCodeAt(n);

				if (c < 128)
				{
					utftext += String.fromCharCode(c);
				}
				else if ((c > 127) && (c < 2048))
				{
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else
				{
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
			}

			return utftext;
		},

		// private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var
				string = '',
				i = 0,
				c = 0,
				c2 = 0,
				c3 = 0
			;

			while ( i < utftext.length )
			{
				c = utftext.charCodeAt(i);

				if (c < 128)
				{
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224))
				{
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else
				{
					c2 = utftext.charCodeAt(i+1);
					c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
			}

			return string;
		}
	};

	module.exports = Base64;
	/*jslint bitwise: false*/

}(module, require));
},{}],6:[function(require,module,exports){

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
},{}],7:[function(require,module,exports){

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
		'Forward': 'Forward'
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

}(module, require));
},{}],8:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Utils'),
		Plugins = require('Plugins')
	;

	/**
	 * @constructor
	 */
	function Events()
	{
		this.oSubs = {};
	}

	Events.prototype.oSubs = {};

	/**
	 * @param {string} sName
	 * @param {Function} fFunc
	 * @param {Object=} oContext
	 * @return {Events}
	 */
	Events.prototype.sub = function (sName, fFunc, oContext)
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
	 * @return {Events}
	 */
	Events.prototype.pub = function (sName, aArgs)
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

	module.exports = new Events();

}(module, require));
},{"Plugins":12,"Utils":14,"_":25}],9:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		Globals = {},

		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums')
	;

	Globals.$win = $(window);
	Globals.$doc = $(window.document);
	Globals.$html = $('html');
	Globals.$div = $('<div></div>');

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
	 * @type {boolean}
	 */
	Globals.useKeyboardShortcuts = ko.observable(true);

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
	Globals.bAnimationSupported = !Globals.bMobileDevice && Globals.$html.hasClass('csstransitions');

	/**
	 * @type {boolean}
	 */
	Globals.bXMLHttpRequestSupported = !!window.XMLHttpRequest;

	/**
	 * @type {string}
	 */
	Globals.sAnimationType = '';

	/**
	 * @type {*}
	 */
	Globals.__APP = null;

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
		'ja': 'ja',
		'ja-jp': 'ja',
		'ko': 'ko',
		'ko-kr': 'ko',
		'lv': 'lv',
		'nl': 'nl',
		'no': 'no',
		'pl': 'pl',
		'pt': 'pt',
		'pt-pt': 'pt',
		'pt-br': 'pt-br',
		'ro': 'ro',
		'ru': 'ru',
		'sk': 'sk',
		'tr': 'tr',
		'ua': 'ru',
		'zh': 'zh',
		'zh-cn': 'zh-cn'
	};

	if (Globals.bAllowPdfPreview && window.navigator && window.navigator.mimeTypes)
	{
		Globals.bAllowPdfPreview = !!_.find(window.navigator.mimeTypes, function (oType) {
			return oType && 'application/pdf' === oType.type;
		});
	}

	Globals.oI18N = window['rainloopI18N'] || {};

	Globals.oNotificationI18N = {};

	Globals.aBootstrapDropdowns = [];

	Globals.aViewModels = {
		'settings': [],
		'settings-removed': [],
		'settings-disabled': []
	};

	Globals.leftPanelDisabled = ko.observable(false);

	// popups
	Globals.popupVisibilityNames = ko.observableArray([]);

	Globals.popupVisibility = ko.computed(function () {
		return 0 < Globals.popupVisibilityNames().length;
	}, this);

	// keys
	Globals.keyScopeReal = ko.observable(Enums.KeyState.All);
	Globals.keyScopeFake = ko.observable(Enums.KeyState.All);

	Globals.keyScope = ko.computed({
		'owner': this,
		'read': function () {
			return Globals.keyScopeFake();
		},
		'write': function (sValue) {

			if (Enums.KeyState.Menu !== sValue)
			{
				if (Enums.KeyState.Compose === sValue)
				{
					// disableKeyFilter
					key.filter = function () {
						return Globals.useKeyboardShortcuts();
					};
				}
				else
				{
					// restoreKeyFilter
					key.filter = function (event) {

						if (Globals.useKeyboardShortcuts())
						{
							var
								oElement = event.target || event.srcElement,
								sTagName = oElement ? oElement.tagName : ''
							;

							sTagName = sTagName.toUpperCase();
							return !(sTagName === 'INPUT' || sTagName === 'SELECT' || sTagName === 'TEXTAREA' ||
								(oElement && sTagName === 'DIV' && 'editorHtmlArea' === oElement.className && oElement.contentEditable)
							);
						}

						return false;
					};
				}

				Globals.keyScopeFake(sValue);
				if (Globals.dropdownVisibility())
				{
					sValue = Enums.KeyState.Menu;
				}
			}

			Globals.keyScopeReal(sValue);
		}
	});

	Globals.keyScopeReal.subscribe(function (sValue) {
//		window.console.log(sValue);
		key.setScope(sValue);
	});

	Globals.dropdownVisibility.subscribe(function (bValue) {
		if (bValue)
		{
			Globals.tooltipTrigger(!Globals.tooltipTrigger());
			Globals.keyScope(Enums.KeyState.Menu);
		}
		else if (Enums.KeyState.Menu === key.getScope())
		{
			Globals.keyScope(Globals.keyScopeFake());
		}
	});

	module.exports = Globals;

}(module, require));
},{"$":20,"Enums":7,"_":25,"key":21,"ko":22,"window":26}],10:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),

		Globals = require('Globals'),
		Settings = require('Storage:Settings')
	;

	/**
	 * @constructor
	 * @param {Object} oElement
	 * @param {Function=} fOnBlur
	 * @param {Function=} fOnReady
	 * @param {Function=} fOnModeChange
	 */
	function HtmlEditor(oElement, fOnBlur, fOnReady, fOnModeChange)
	{
		this.editor = null;
		this.iBlurTimer = 0;
		this.fOnBlur = fOnBlur || null;
		this.fOnReady = fOnReady || null;
		this.fOnModeChange = fOnModeChange || null;

		this.$element = $(oElement);

		this.resize = _.throttle(_.bind(this.resize, this), 100);

		this.init();
	}

	HtmlEditor.prototype.blurTrigger = function ()
	{
		if (this.fOnBlur)
		{
			var self = this;
			window.clearTimeout(this.iBlurTimer);
			this.iBlurTimer = window.setTimeout(function () {
				self.fOnBlur();
			}, 200);
		}
	};

	HtmlEditor.prototype.focusTrigger = function ()
	{
		if (this.fOnBlur)
		{
			window.clearTimeout(this.iBlurTimer);
		}
	};

	/**
	 * @return {boolean}
	 */
	HtmlEditor.prototype.isHtml = function ()
	{
		return this.editor ? 'wysiwyg' === this.editor.mode : false;
	};

	/**
	 * @return {boolean}
	 */
	HtmlEditor.prototype.checkDirty = function ()
	{
		return this.editor ? this.editor.checkDirty() : false;
	};

	HtmlEditor.prototype.resetDirty = function ()
	{
		if (this.editor)
		{
			this.editor.resetDirty();
		}
	};

	/**
	 * @return {string}
	 */
	HtmlEditor.prototype.getData = function (bWrapIsHtml)
	{
		if (this.editor)
		{
			if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
			{
				return this.editor.__plain.getRawData();
			}

			return bWrapIsHtml ?
				'<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
					this.editor.getData() + '</div>' : this.editor.getData();
		}

		return '';
	};

	HtmlEditor.prototype.modeToggle = function (bPlain)
	{
		if (this.editor)
		{
			if (bPlain)
			{
				if ('plain' === this.editor.mode)
				{
					this.editor.setMode('wysiwyg');
				}
			}
			else
			{
				if ('wysiwyg' === this.editor.mode)
				{
					this.editor.setMode('plain');
				}
			}

			this.resize();
		}
	};

	HtmlEditor.prototype.setHtml = function (sHtml, bFocus)
	{
		if (this.editor)
		{
			this.modeToggle(true);
			this.editor.setData(sHtml);

			if (bFocus)
			{
				this.focus();
			}
		}
	};

	HtmlEditor.prototype.setPlain = function (sPlain, bFocus)
	{
		if (this.editor)
		{
			this.modeToggle(false);
			if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
			{
				return this.editor.__plain.setRawData(sPlain);
			}
			else
			{
				this.editor.setData(sPlain);
			}

			if (bFocus)
			{
				this.focus();
			}
		}
	};

	HtmlEditor.prototype.init = function ()
	{
		if (this.$element && this.$element[0])
		{
			var
				self = this,
				fInit = function () {

					var
						oConfig = Globals.oHtmlEditorDefaultConfig,
						sLanguage = Settings.settingsGet('Language'),
						bSource = !!Settings.settingsGet('AllowHtmlEditorSourceButton')
					;

					if (bSource && oConfig.toolbarGroups && !oConfig.toolbarGroups.__SourceInited)
					{
						oConfig.toolbarGroups.__SourceInited = true;
						oConfig.toolbarGroups.push({name: 'document', groups: ['mode', 'document', 'doctools']});
					}

					oConfig.enterMode = window.CKEDITOR.ENTER_BR;
					oConfig.shiftEnterMode = window.CKEDITOR.ENTER_BR;

					oConfig.language = Globals.oHtmlEditorLangsMap[sLanguage] || 'en';
					if (window.CKEDITOR.env)
					{
						window.CKEDITOR.env.isCompatible = true;
					}

					self.editor = window.CKEDITOR.appendTo(self.$element[0], oConfig);

					self.editor.on('key', function(oEvent) {
						if (oEvent && oEvent.data && 9 /* Tab */ === oEvent.data.keyCode)
						{
							return false;
						}
					});

					self.editor.on('blur', function() {
						self.blurTrigger();
					});

					self.editor.on('mode', function() {

						self.blurTrigger();

						if (self.fOnModeChange)
						{
							self.fOnModeChange('plain' !== self.editor.mode);
						}
					});

					self.editor.on('focus', function() {
						self.focusTrigger();
					});

					if (self.fOnReady)
					{
						self.editor.on('instanceReady', function () {

							self.editor.setKeystroke(window.CKEDITOR.CTRL + 65 /* A */, 'selectAll');

							self.fOnReady();
							self.__resizable = true;
							self.resize();
						});
					}
				}
			;

			if (window.CKEDITOR)
			{
				fInit();
			}
			else
			{
				window.__initEditor = fInit;
			}
		}
	};

	HtmlEditor.prototype.focus = function ()
	{
		if (this.editor)
		{
			this.editor.focus();
		}
	};

	HtmlEditor.prototype.blur = function ()
	{
		if (this.editor)
		{
			this.editor.focusManager.blur(true);
		}
	};

	HtmlEditor.prototype.resize = function ()
	{
		if (this.editor && this.__resizable)
		{
			try
			{
				this.editor.resize(this.$element.width(), this.$element.innerHeight());
			}
			catch (e) {}
		}
	};

	HtmlEditor.prototype.clear = function (bFocus)
	{
		this.setHtml('', bFocus);
	};


	module.exports = HtmlEditor;

}(module, require));
},{"Globals":9,"Storage:Settings":69,"_":25,"window":26}],11:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function LinkBuilder()
	{
		var Settings = require('Storage:Settings');

		this.sBase = '#/';
		this.sServer = './?';
		this.sVersion = Settings.settingsGet('Version');
		this.sSpecSuffix = Settings.settingsGet('AuthAccountHash') || '0';
		this.sStaticPrefix = Settings.settingsGet('StaticPrefix') || 'rainloop/v/' + this.sVersion + '/static/';
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
	 * @return {string}
	 */
	LinkBuilder.prototype.about = function ()
	{
		return this.sBase + 'about';
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

}(module, require));
},{"Storage:Settings":69,"Utils":14,"window":26}],12:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function Plugins()
	{
		this.__boot = null;
		this.__data = null;
		this.__remote = null;

		this.oSettings = require('Storage:Settings');

		this.oViewModelsHooks = {};
		this.oSimpleHooks = {};
	}

	Plugins.prototype.__boot = null;
	Plugins.prototype.__data = null;
	Plugins.prototype.__remote = null;

	/**
	 * @type {Object}
	 */
	Plugins.prototype.oViewModelsHooks = {};

	/**
	 * @type {Object}
	 */
	Plugins.prototype.oSimpleHooks = {};

	/**
	 * @param {string} sName
	 * @param {Function} fCallback
	 */
	Plugins.prototype.addHook = function (sName, fCallback)
	{
		if (Utils.isFunc(fCallback))
		{
			if (!Utils.isArray(this.oSimpleHooks[sName]))
			{
				this.oSimpleHooks[sName] = [];
			}

			this.oSimpleHooks[sName].push(fCallback);
		}
	};

	/**
	 * @param {string} sName
	 * @param {Array=} aArguments
	 */
	Plugins.prototype.runHook = function (sName, aArguments)
	{
		if (Utils.isArray(this.oSimpleHooks[sName]))
		{
			aArguments = aArguments || [];

			_.each(this.oSimpleHooks[sName], function (fCallback) {
				fCallback.apply(null, aArguments);
			});
		}
	};

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.prototype.mainSettingsGet = function (sName)
	{
		return this.oSettings.settingsGet(sName);
	};

	/**
	 * @param {Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	Plugins.prototype.remoteRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
	{
		if (this.__remote)
		{
			this.__remote.defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
		}
	};

	/**
	 * @param {string} sPluginSection
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.prototype.settingsGet = function (sPluginSection, sName)
	{
		var oPlugin = this.oSettings.settingsGet('Plugins');
		oPlugin = oPlugin && !Utils.isUnd(oPlugin[sPluginSection]) ? oPlugin[sPluginSection] : null;
		return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
	};

	module.exports = new Plugins();

}(module, require));
},{"Storage:Settings":69,"Utils":14,"_":25}],13:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums'),
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 * @param {koProperty} oKoList
	 * @param {koProperty} oKoSelectedItem
	 * @param {string} sItemSelector
	 * @param {string} sItemSelectedSelector
	 * @param {string} sItemCheckedSelector
	 * @param {string} sItemFocusedSelector
	 */
	function Selector(oKoList, oKoSelectedItem,
		sItemSelector, sItemSelectedSelector, sItemCheckedSelector, sItemFocusedSelector)
	{
		this.list = oKoList;

		this.listChecked = ko.computed(function () {
			return _.filter(this.list(), function (oItem) {
				return oItem.checked();
			});
		}, this).extend({'rateLimit': 0});

		this.isListChecked = ko.computed(function () {
			return 0 < this.listChecked().length;
		}, this);

		this.focusedItem = ko.observable(null);
		this.selectedItem = oKoSelectedItem;
		this.selectedItemUseCallback = true;

		this.itemSelectedThrottle = _.debounce(_.bind(this.itemSelected, this), 300);

		this.listChecked.subscribe(function (aItems) {
			if (0 < aItems.length)
			{
				if (null === this.selectedItem())
				{
					this.selectedItem.valueHasMutated();
				}
				else
				{
					this.selectedItem(null);
				}
			}
			else if (this.bAutoSelect && this.focusedItem())
			{
				this.selectedItem(this.focusedItem());
			}
		}, this);

		this.selectedItem.subscribe(function (oItem) {

			if (oItem)
			{
				if (this.isListChecked())
				{
					_.each(this.listChecked(), function (oSubItem) {
						oSubItem.checked(false);
					});
				}

				if (this.selectedItemUseCallback)
				{
					this.itemSelectedThrottle(oItem);
				}
			}
			else if (this.selectedItemUseCallback)
			{
				this.itemSelected(null);
			}

		}, this);

		this.selectedItem.extend({'toggleSubscribe': [null,
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

		this.focusedItem.extend({'toggleSubscribe': [null,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.focused(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.focused(true);
				}
			}
		]});

		this.oContentVisible = null;
		this.oContentScrollable = null;

		this.sItemSelector = sItemSelector;
		this.sItemSelectedSelector = sItemSelectedSelector;
		this.sItemCheckedSelector = sItemCheckedSelector;
		this.sItemFocusedSelector = sItemFocusedSelector;

		this.sLastUid = '';
		this.bAutoSelect = true;
		this.oCallbacks = {};

		this.emptyFunction = function () {};

		this.focusedItem.subscribe(function (oItem) {
			if (oItem)
			{
				this.sLastUid = this.getItemUid(oItem);
			}
		}, this);

		var
			aCache = [],
			aCheckedCache = [],
			mFocused = null,
			mSelected = null
		;

		this.list.subscribe(function (aItems) {

			var self = this;
			if (Utils.isArray(aItems))
			{
				_.each(aItems, function (oItem) {
					if (oItem)
					{
						var sUid = self.getItemUid(oItem);

						aCache.push(sUid);
						if (oItem.checked())
						{
							aCheckedCache.push(sUid);
						}
						if (null === mFocused && oItem.focused())
						{
							mFocused = sUid;
						}
						if (null === mSelected && oItem.selected())
						{
							mSelected = sUid;
						}
					}
				});
			}
		}, this, 'beforeChange');

		this.list.subscribe(function (aItems) {

			var
				self = this,
				oTemp = null,
				bGetNext = false,
				aUids = [],
				mNextFocused = mFocused,
				bChecked = false,
				bSelected = false,
				iLen = 0
			;

			this.selectedItemUseCallback = false;

			this.focusedItem(null);
			this.selectedItem(null);

			if (Utils.isArray(aItems))
			{
				iLen = aCheckedCache.length;

				_.each(aItems, function (oItem) {

					var sUid = self.getItemUid(oItem);
					aUids.push(sUid);

					if (null !== mFocused && mFocused === sUid)
					{
						self.focusedItem(oItem);
						mFocused = null;
					}

					if (0 < iLen && -1 < Utils.inArray(sUid, aCheckedCache))
					{
						bChecked = true;
						oItem.checked(true);
						iLen--;
					}

					if (!bChecked && null !== mSelected && mSelected === sUid)
					{
						bSelected = true;
						self.selectedItem(oItem);
						mSelected = null;
					}
				});

				this.selectedItemUseCallback = true;

				if (!bChecked && !bSelected && this.bAutoSelect)
				{
					if (self.focusedItem())
					{
						self.selectedItem(self.focusedItem());
					}
					else if (0 < aItems.length)
					{
						if (null !== mNextFocused)
						{
							bGetNext = false;
							mNextFocused = _.find(aCache, function (sUid) {
								if (bGetNext && -1 < Utils.inArray(sUid, aUids))
								{
									return sUid;
								}
								else if (mNextFocused === sUid)
								{
									bGetNext = true;
								}
								return false;
							});

							if (mNextFocused)
							{
								oTemp = _.find(aItems, function (oItem) {
									return mNextFocused === self.getItemUid(oItem);
								});
							}
						}

						self.selectedItem(oTemp || null);
						self.focusedItem(self.selectedItem());
					}
				}
			}

			aCache = [];
			aCheckedCache = [];
			mFocused = null;
			mSelected = null;

		}, this);
	}

	Selector.prototype.itemSelected = function (oItem)
	{
		if (this.isListChecked())
		{
			if (!oItem)
			{
				(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem || null);
			}
		}
		else
		{
			if (oItem)
			{
				(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem);
			}
		}
	};

	Selector.prototype.goDown = function (bForceSelect)
	{
		this.newSelectPosition(Enums.EventKeyCode.Down, false, bForceSelect);
	};

	Selector.prototype.goUp = function (bForceSelect)
	{
		this.newSelectPosition(Enums.EventKeyCode.Up, false, bForceSelect);
	};

	Selector.prototype.init = function (oContentVisible, oContentScrollable, sKeyScope)
	{
		this.oContentVisible = oContentVisible;
		this.oContentScrollable = oContentScrollable;

		sKeyScope = sKeyScope || 'all';

		if (this.oContentVisible && this.oContentScrollable)
		{
			var
				self = this
			;

			$(this.oContentVisible)
				.on('selectstart', function (oEvent) {
					if (oEvent && oEvent.preventDefault)
					{
						oEvent.preventDefault();
					}
				})
				.on('click', this.sItemSelector, function (oEvent) {
					self.actionClick(ko.dataFor(this), oEvent);
				})
				.on('click', this.sItemCheckedSelector, function (oEvent) {
					var oItem = ko.dataFor(this);
					if (oItem)
					{
						if (oEvent && oEvent.shiftKey)
						{
							self.actionClick(oItem, oEvent);
						}
						else
						{
							self.focusedItem(oItem);
							oItem.checked(!oItem.checked());
						}
					}
				})
			;

			key('enter', sKeyScope, function () {
				if (self.focusedItem() && !self.focusedItem().selected())
				{
					self.actionClick(self.focusedItem());
					return false;
				}

				return true;
			});

			key('ctrl+up, command+up, ctrl+down, command+down', sKeyScope, function () {
				return false;
			});

			key('up, shift+up, down, shift+down, home, end, pageup, pagedown, insert, space', sKeyScope, function (event, handler) {
				if (event && handler && handler.shortcut)
				{
					// TODO
					var iKey = 0;
					switch (handler.shortcut)
					{
						case 'up':
						case 'shift+up':
							iKey = Enums.EventKeyCode.Up;
							break;
						case 'down':
						case 'shift+down':
							iKey = Enums.EventKeyCode.Down;
							break;
						case 'insert':
							iKey = Enums.EventKeyCode.Insert;
							break;
						case 'space':
							iKey = Enums.EventKeyCode.Space;
							break;
						case 'home':
							iKey = Enums.EventKeyCode.Home;
							break;
						case 'end':
							iKey = Enums.EventKeyCode.End;
							break;
						case 'pageup':
							iKey = Enums.EventKeyCode.PageUp;
							break;
						case 'pagedown':
							iKey = Enums.EventKeyCode.PageDown;
							break;
					}

					if (0 < iKey)
					{
						self.newSelectPosition(iKey, key.shift);
						return false;
					}
				}
			});
		}
	};

	Selector.prototype.autoSelect = function (bValue)
	{
		this.bAutoSelect = !!bValue;
	};

	/**
	 * @param {Object} oItem
	 * @returns {string}
	 */
	Selector.prototype.getItemUid = function (oItem)
	{
		var
			sUid = '',
			fGetItemUidCallback = this.oCallbacks['onItemGetUid'] || null
		;

		if (fGetItemUidCallback && oItem)
		{
			sUid = fGetItemUidCallback(oItem);
		}

		return sUid.toString();
	};

	/**
	 * @param {number} iEventKeyCode
	 * @param {boolean} bShiftKey
	 * @param {boolean=} bForceSelect = false
	 */
	Selector.prototype.newSelectPosition = function (iEventKeyCode, bShiftKey, bForceSelect)
	{
		var
			iIndex = 0,
			iPageStep = 10,
			bNext = false,
			bStop = false,
			oResult = null,
			aList = this.list(),
			iListLen = aList ? aList.length : 0,
			oFocused = this.focusedItem()
		;

		if (0 < iListLen)
		{
			if (!oFocused)
			{
				if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode || Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.PageUp === iEventKeyCode)
				{
					oResult = aList[0];
				}
				else if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode || Enums.EventKeyCode.PageDown === iEventKeyCode)
				{
					oResult = aList[aList.length - 1];
				}
			}
			else if (oFocused)
			{
				if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode ||  Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
				{
					_.each(aList, function (oItem) {
						if (!bStop)
						{
							switch (iEventKeyCode) {
							case Enums.EventKeyCode.Up:
								if (oFocused === oItem)
								{
									bStop = true;
								}
								else
								{
									oResult = oItem;
								}
								break;
							case Enums.EventKeyCode.Down:
							case Enums.EventKeyCode.Insert:
								if (bNext)
								{
									oResult = oItem;
									bStop = true;
								}
								else if (oFocused === oItem)
								{
									bNext = true;
								}
								break;
							}
						}
					});
				}
				else if (Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode)
				{
					if (Enums.EventKeyCode.Home === iEventKeyCode)
					{
						oResult = aList[0];
					}
					else if (Enums.EventKeyCode.End === iEventKeyCode)
					{
						oResult = aList[aList.length - 1];
					}
				}
				else if (Enums.EventKeyCode.PageDown === iEventKeyCode)
				{
					for (; iIndex < iListLen; iIndex++)
					{
						if (oFocused === aList[iIndex])
						{
							iIndex += iPageStep;
							iIndex = iListLen - 1 < iIndex ? iListLen - 1 : iIndex;
							oResult = aList[iIndex];
							break;
						}
					}
				}
				else if (Enums.EventKeyCode.PageUp === iEventKeyCode)
				{
					for (iIndex = iListLen; iIndex >= 0; iIndex--)
					{
						if (oFocused === aList[iIndex])
						{
							iIndex -= iPageStep;
							iIndex = 0 > iIndex ? 0 : iIndex;
							oResult = aList[iIndex];
							break;
						}
					}
				}
			}
		}

		if (oResult)
		{
			this.focusedItem(oResult);

			if (oFocused)
			{
				if (bShiftKey)
				{
					if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode)
					{
						oFocused.checked(!oFocused.checked());
					}
				}
				else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
				{
					oFocused.checked(!oFocused.checked());
				}
			}

			if ((this.bAutoSelect || !!bForceSelect) &&
				!this.isListChecked() && Enums.EventKeyCode.Space !== iEventKeyCode)
			{
				this.selectedItem(oResult);
			}

			this.scrollToFocused();
		}
		else if (oFocused)
		{
			if (bShiftKey && (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode))
			{
				oFocused.checked(!oFocused.checked());
			}
			else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
			{
				oFocused.checked(!oFocused.checked());
			}

			this.focusedItem(oFocused);
		}
	};

	/**
	 * @return {boolean}
	 */
	Selector.prototype.scrollToFocused = function ()
	{
		if (!this.oContentVisible || !this.oContentScrollable)
		{
			return false;
		}

		var
			iOffset = 20,
			oFocused = $(this.sItemFocusedSelector, this.oContentScrollable),
			oPos = oFocused.position(),
			iVisibleHeight = this.oContentVisible.height(),
			iFocusedHeight = oFocused.outerHeight()
		;

		if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
		{
			if (oPos.top < 0)
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
			}
			else
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
			}

			return true;
		}

		return false;
	};

	/**
	 * @param {boolean=} bFast = false
	 * @return {boolean}
	 */
	Selector.prototype.scrollToTop = function (bFast)
	{
		if (!this.oContentVisible || !this.oContentScrollable)
		{
			return false;
		}

		if (bFast)
		{
			this.oContentScrollable.scrollTop(0);
		}
		else
		{
			this.oContentScrollable.stop().animate({'scrollTop': 0}, 200);
		}

		return true;
	};

	Selector.prototype.eventClickFunction = function (oItem, oEvent)
	{
		var
			sUid = this.getItemUid(oItem),
			iIndex = 0,
			iLength = 0,
			oListItem = null,
			sLineUid = '',
			bChangeRange = false,
			bIsInRange = false,
			aList = [],
			bChecked = false
		;

		if (oEvent && oEvent.shiftKey)
		{
			if ('' !== sUid && '' !== this.sLastUid && sUid !== this.sLastUid)
			{
				aList = this.list();
				bChecked = oItem.checked();

				for (iIndex = 0, iLength = aList.length; iIndex < iLength; iIndex++)
				{
					oListItem = aList[iIndex];
					sLineUid = this.getItemUid(oListItem);

					bChangeRange = false;
					if (sLineUid === this.sLastUid || sLineUid === sUid)
					{
						bChangeRange = true;
					}

					if (bChangeRange)
					{
						bIsInRange = !bIsInRange;
					}

					if (bIsInRange || bChangeRange)
					{
						oListItem.checked(bChecked);
					}
				}
			}
		}

		this.sLastUid = '' === sUid ? '' : sUid;
	};

	/**
	 * @param {Object} oItem
	 * @param {Object=} oEvent
	 */
	Selector.prototype.actionClick = function (oItem, oEvent)
	{
		if (oItem)
		{
			var
				bClick = true,
				sUid = this.getItemUid(oItem)
			;

			if (oEvent)
			{
				if (oEvent.shiftKey && !oEvent.ctrlKey && !oEvent.altKey)
				{
					bClick = false;
					if ('' === this.sLastUid)
					{
						this.sLastUid = sUid;
					}

					oItem.checked(!oItem.checked());
					this.eventClickFunction(oItem, oEvent);

					this.focusedItem(oItem);
				}
				else if (oEvent.ctrlKey && !oEvent.shiftKey && !oEvent.altKey)
				{
					bClick = false;
					this.focusedItem(oItem);

					if (this.selectedItem() && oItem !== this.selectedItem())
					{
						this.selectedItem().checked(true);
					}

					oItem.checked(!oItem.checked());
				}
			}

			if (bClick)
			{
				this.focusedItem(oItem);
				this.selectedItem(oItem);

				this.scrollToFocused();
			}
		}
	};

	Selector.prototype.on = function (sEventName, fCallback)
	{
		this.oCallbacks[sEventName] = fCallback;
	};

	module.exports = Selector;

}(module, require));
},{"$":20,"Enums":7,"Utils":14,"_":25,"key":21,"ko":22}],14:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		Utils = {},

		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Globals = require('Globals')
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
			Globals.$win.resize();
		}
		else
		{
			window.setTimeout(function () {
				Globals.$win.resize();
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
	 * @return {*|null}
	 */
	Utils.notificationClass = function ()
	{
		return window.Notification && window.Notification.requestPermission ? window.Notification : null;
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
	 * @param {string} sMailToUrl
	 * @param {Function} PopupComposeVoreModel
	 * @returns {boolean}
	 */
	Utils.mailToHelper = function (sMailToUrl, PopupComposeVoreModel)
	{
		if (sMailToUrl && 'mailto:' === sMailToUrl.toString().substr(0, 7).toLowerCase())
		{
			sMailToUrl = sMailToUrl.toString().substr(7);

			var
				oParams = {},
				oEmailModel = null,
				sEmail = sMailToUrl.replace(/\?.+$/, ''),
				sQueryString = sMailToUrl.replace(/^[^\?]*\?/, ''),
				EmailModel = require('Model:Email')
			;

			oEmailModel = new EmailModel();
			oEmailModel.parse(window.decodeURIComponent(sEmail));

			if (oEmailModel && oEmailModel.email)
			{
				oParams = Utils.simpleQueryParser(sQueryString);

				require('App:Knoin').showScreenPopup(PopupComposeVoreModel, [Enums.ComposeType.Empty, null, [oEmailModel],
					Utils.isUnd(oParams.subject) ? null : Utils.pString(oParams.subject),
					Utils.isUnd(oParams.body) ? null : Utils.plainToHtml(Utils.pString(oParams.body))
				]);
			}

			return true;
		}

		return false;
	};

	/**
	 * @param {string} sValue
	 * @param {string} sHash
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
			sPart = null,
			aParts = sPath.split('.'),
			oCur = oObjectToExportTo || window
		;

		for (; aParts.length && (sPart = aParts.shift());)
		{
			if (!aParts.length && !Utils.isUnd(oObject))
			{
				oCur[sPart] = oObject;
			}
			else if (oCur[sPart])
			{
				oCur = oCur[sPart];
			}
			else
			{
				oCur = oCur[sPart] = {};
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

			Utils.i18nToNode(Globals.$doc);

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
		if (window.document.activeElement)
		{
			if (Utils.isUnd(window.document.activeElement.__inFocusCache))
			{
				window.document.activeElement.__inFocusCache = $(window.document.activeElement).is('input,textarea,iframe,.cke_editable');
			}

			return !!window.document.activeElement.__inFocusCache;
		}

		return false;
	};

	Utils.removeInFocus = function ()
	{
		if (window.document && window.document.activeElement && window.document.activeElement.blur)
		{
			var oA = $(window.document.activeElement);
			if (oA.is('input,textarea'))
			{
				window.document.activeElement.blur();
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
		else if (window.document && window.document.selection && window.document.selection.empty)
		{
			window.document.selection.empty();
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
		sSubject = Utils.trim(sSubject.replace(/[\s]+/g, ' '));

		var
			bDrop = false,
			aSubject = [],
			bRe = 'RE' === sPrefix,
			bFwd = 'FWD' === sPrefix,
			bPrefixIsRe = !bFwd
		;

		if ('' !== sSubject)
		{
			_.each(sSubject.split(':'), function (sPart) {
				var sTrimmedPart = Utils.trim(sPart);
				if (!bDrop && (/^(RE|FWD)$/i.test(sTrimmedPart) || /^(RE|FWD)[\[\(][\d]+[\]\)]$/i.test(sTrimmedPart)))
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
					aSubject.push(sPart);
					bDrop = true;
				}
			});
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
			Utils.trim(aSubject.join(':'))
		);
	};

	/**
	 * @param {number} iNum
	 * @param {number} iDec
	 * @return {number}
	 */
	Utils.roundNumber = function (iNum, iDec)
	{
		return window.Math.round(iNum * window.Math.pow(10, iDec)) / window.Math.pow(10, iDec);
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

				if (fResult && fResult.canExecute && fResult.canExecute())
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
				Globals.$html.removeClass('rl-anim rl-anim-full').addClass('no-rl-anim');

				Globals.sAnimationType = Enums.InterfaceAnimation.None;
			}
			else
			{
				switch (sValue)
				{
					case Enums.InterfaceAnimation.Full:
						Globals.$html.removeClass('no-rl-anim').addClass('rl-anim rl-anim-full');
						Globals.sAnimationType = sValue;
						break;
					case Enums.InterfaceAnimation.Normal:
						Globals.$html.removeClass('no-rl-anim rl-anim-full').addClass('rl-anim');
						Globals.sAnimationType = sValue;
						break;
				}
			}
		});

		oData.interfaceAnimation.valueHasMutated();

		oData.desktopNotificationsPermisions = ko.computed(function () {

			oData.desktopNotifications();

			var
				NotificationClass = Utils.notificationClass(),
				iResult = Enums.DesktopNotifications.NotSupported
			;

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
					var
						NotificationClass = Utils.notificationClass(),
						iPermission = oData.desktopNotificationsPermisions()
					;

					if (NotificationClass && Enums.DesktopNotifications.Allowed === iPermission)
					{
						oData.desktopNotifications(true);
					}
					else if (NotificationClass && Enums.DesktopNotifications.NotAllowed === iPermission)
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
	 * @param {string} sTheme
	 * @return {string}
	 */
	Utils.convertThemeName = function (sTheme)
	{
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
		}

		return Utils.trim(sTheme.replace(/[^a-zA-Z0-9]+/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
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
			sLanguage.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_'), null, sLanguage);
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

	/**
	 * @param {string} sPlain
	 * @return {string}
	 */
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

	Utils.defautOptionsAfterRender = function (oDomOption, oItem)
	{
		if (oItem && !Utils.isUnd(oItem.disabled) && oDomOption)
		{
			$(oDomOption)
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

				if (oViewModel && $('#rl-content', oBody)[0])
				{
					ko.applyBindings(oViewModel, $('#rl-content', oBody)[0]);
				}

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

	/**
	 * @param {Function} fCallback
	 * @param {?} koTrigger
	 * @param {?} oContext = null
	 * @param {number=} iTimer = 1000
	 * @return {Function}
	 */
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
					return (arguments && 2 < arguments.length) ? arguments[1] + $.trim(arguments[2].replace(/[\s]/g, '')) + ' ' : '';
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

		sText = Globals.$div.html(sText).text();

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
			sHtml = Globals.$div.html(sHtml.replace(/&amp;/ig, 'amp_amp_12345_amp_amp'))
				.linkify()
				.find('.linkified').removeClass('linkified').end()
				.html()
				.replace(/amp_amp_12345_amp_amp/g, '&amp;')
			;
		}

		return sHtml;
	};

	/**
	 * @param {string} sUrl
	 * @param {number} iValue
	 * @param {Function} fCallback
	 */
	Utils.resizeAndCrop = function (sUrl, iValue, fCallback)
	{
		var oTempImg = new window.Image();
		oTempImg.onload = function() {

			var
				aDiff = [0, 0],
				oCanvas = window.document.createElement('canvas'),
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
	Utils.folderListOptionsBuilder = function (aSystem, aList, aDisabled, aHeaderLines, iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
	{
		var
			/**
			 * @type {?FolderModel}
			 */
			oItem = null,
			bSep = false,
			iIndex = 0,
			iLen = 0,
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
				aResult = aResult.concat(Utils.folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
					iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
			}
		}

		return aResult;
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
				 * @param {boolean=} bPush = true
				 * @param {string=} sCustomName = ''
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
					fAdd(window.Math.round((iPrev - 1) / 2), false, '...');
				}

				if (iPageCount - 2 === iNext)
				{
					fAdd(iPageCount - 1, true);
				}
				else if (iPageCount - 2 > iNext)
				{
					fAdd(window.Math.round((iPageCount + iNext) / 2), true, '...');
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
		var sel, range;
		if (window.getSelection)
		{
			sel = window.getSelection();
			sel.removeAllRanges();
			range = window.document.createRange();
			range.selectNodeContents(element);
			sel.addRange(range);
		}
		else if (window.document.selection)
		{
			range = window.document.body.createTextRange();
			range.moveToElementText(element);
			range.select();
		}
	};

	Utils.detectDropdownVisibility = _.debounce(function () {
		Globals.dropdownVisibility(!!_.find(Globals.aBootstrapDropdowns, function (oItem) {
			return oItem.hasClass('open');
		}));
	}, 50);

	/**
	 * @param {boolean=} bDelay = false
	 */
	Utils.triggerAutocompleteInputChange = function (bDelay) {

		var fFunc = function () {
			$('.checkAutocomplete').trigger('change');
		};

		if (Utils.isUnd(bDelay) ? false : !!bDelay)
		{
			_.delay(fFunc, 100);
		}
		else
		{
			fFunc();
		}
	};

	module.exports = Utils;

}(module, require));
},{"$":20,"App:Knoin":27,"Consts":6,"Enums":7,"Globals":9,"Model:Email":37,"_":25,"ko":22,"window":26}],15:[function(require,module,exports){
module.exports = JSON;
},{}],16:[function(require,module,exports){
module.exports = Jua;
},{}],17:[function(require,module,exports){
module.exports = crossroads;
},{}],18:[function(require,module,exports){
module.exports = hasher;
},{}],19:[function(require,module,exports){
module.exports = ifvisible;
},{}],20:[function(require,module,exports){
module.exports = $;
},{}],21:[function(require,module,exports){
module.exports = key;
},{}],22:[function(require,module,exports){

(function (module, ko) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$')
	;

	ko.bindingHandlers.tooltip = {
		'init': function (oElement, fValueAccessor) {

			var
				Globals = require('Globals'),
				Utils = require('Utils')
			;

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
				Globals = require('Globals'),
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

			var
				$oEl = $(oElement),
				Globals = require('Globals')
			;

			$oEl.tooltip({
				'container': 'body',
				'trigger': 'hover manual',
				'title': function () {
					return $oEl.data('tooltip3-data') || '';
				}
			});

			$(window.document).click(function () {
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
			var Globals = require('Globals');
			Globals.aBootstrapDropdowns.push($(oElement));
		}
	};

	ko.bindingHandlers.openDropdownTrigger = {
		'update': function (oElement, fValueAccessor) {
			if (ko.utils.unwrapObservable(fValueAccessor()))
			{
				var
					$el = $(oElement),
					Utils = require('Utils')
				;

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
			var Utils = require('Utils');
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
			var Utils = require('Utils');
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

			var
				Globals = require('Globals'),
				Utils = require('Utils')
			;

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
			var Utils = require('Utils');
			Utils.i18nToNode(oElement);
		}
	};

	ko.bindingHandlers.i18nUpdate = {
		'update': function (oElement, fValueAccessor) {
			var Utils = require('Utils');
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
				Utils = require('Utils'),
				Globals = require('Globals'),
				aValues = ko.utils.unwrapObservable(fValueAccessor()),
				iValue = Utils.pInt(aValues[1]),
				iSize = 0,
				iOffset = $(oElement).offset().top
			;

			if (0 < iOffset)
			{
				iOffset += Utils.pInt(aValues[2]);
				iSize = Globals.$win.height() - iOffset;

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
			var
				Globals = require('Globals'),
				Utils = require('Utils')
			;
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
			var Globals = require('Globals');
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
			var Globals = require('Globals');
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
		'init': function(oElement, fValueAccessor, fAllBindingsAccessor) {

			var
				Utils = require('Utils'),
				EmailModel = require('Model:Email'),

				$oEl = $(oElement),
				fValue = fValueAccessor(),
				fAllBindings = fAllBindingsAccessor(),
				fAutoCompleteSource = fAllBindings['autoCompleteSource'] || null,
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
				'autoCompleteSource': fAutoCompleteSource,
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
		'init': function(oElement, fValueAccessor, fAllBindingsAccessor) {

			var
				Utils = require('Utils'),
				ContactTagModel = require('Model:ContactTag'),

				$oEl = $(oElement),
				fValue = fValueAccessor(),
				fAllBindings = fAllBindingsAccessor(),
				fAutoCompleteSource = fAllBindings['autoCompleteSource'] || null,
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
				'autoCompleteSource': fAutoCompleteSource,
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
		var
			Utils = require('Utils'),
			oResult = ko.computed({
				'read': oTarget,
				'write': function (sNewValue) {
					oTarget(Utils.trim(sNewValue.toString()));
				},
				'owner': this
			})
		;

		oResult(oTarget());
		return oResult;
	};

	ko.extenders.posInterer = function (oTarget, iDefault)
	{
		var
			Utils = require('Utils'),
			oResult = ko.computed({
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
			})
		;

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
		var Utils = require('Utils');

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
		var Utils = require('Utils');

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
		var Utils = require('Utils');

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
		var Utils = require('Utils');

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

}(module, ko));

},{"$":20,"Globals":9,"Model:ContactTag":36,"Model:Email":37,"Utils":14,"_":25,"window":26}],23:[function(require,module,exports){
module.exports = moment;
},{}],24:[function(require,module,exports){
module.exports = ssm;
},{}],25:[function(require,module,exports){
module.exports = _;
},{}],26:[function(require,module,exports){
module.exports = window;
},{}],27:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		hasher = require('hasher'),
		crossroads = require('crossroads'),

		Globals = require('Globals'),
		Plugins = require('Plugins'),
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function Knoin()
	{
		this.oScreens = {};
		this.sDefaultScreenName = '';
		this.oCurrentScreen = null;
	}

	Knoin.prototype.oScreens = {};
	Knoin.prototype.sDefaultScreenName = '';
	Knoin.prototype.oCurrentScreen = null;

	Knoin.prototype.hideLoading = function ()
	{
		$('#rl-loading').hide();
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
	 * @param {string|Array} mName
	 * @param {Function} ViewModelClass
	 */
	Knoin.prototype.extendAsViewModel = function (mName, ViewModelClass)
	{
		if (ViewModelClass)
		{
			if (Utils.isArray(mName))
			{
				ViewModelClass.__names = mName;
			}
			else
			{
				ViewModelClass.__names = [mName];
			}

			ViewModelClass.__name = ViewModelClass.__names[0];
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
				kn = this,
				oViewModel = new ViewModelClass(oScreen),
				sPosition = oViewModel.viewModelPosition(),
				oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
				oViewModelDom = null
			;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = oViewModel;

			oViewModel.viewModelName = ViewModelClass.__name;
			oViewModel.viewModelNames = ViewModelClass.__names;

			if (oViewModelPlace && 1 === oViewModelPlace.length)
			{
				oViewModelDom = $('<div></div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide();
				oViewModelDom.appendTo(oViewModelPlace);

				oViewModel.viewModelDom = oViewModelDom;
				ViewModelClass.__dom = oViewModelDom;

				if ('Popups' === sPosition)
				{
					oViewModel.cancelCommand = oViewModel.closeCommand = Utils.createCommand(oViewModel, function () {
						kn.hideScreenPopup(ViewModelClass);
					});

					oViewModel.modalVisibility.subscribe(function (bValue) {

						var self = this;
						if (bValue)
						{
							this.viewModelDom.show();
							this.storeAndSetKeyScope();

							Globals.popupVisibilityNames.push(this.viewModelName);
							oViewModel.viewModelDom.css('z-index', 3000 + Globals.popupVisibilityNames().length + 10);

							Utils.delegateRun(this, 'onFocus', [], 500);
						}
						else
						{
							Utils.delegateRun(this, 'onHide');
							this.restoreKeyScope();

							_.each(this.viewModelNames, function (sName) {
								Plugins.runHook('view-model-on-hide', [sName, self]);
							});

							Globals.popupVisibilityNames.remove(this.viewModelName);
							oViewModel.viewModelDom.css('z-index', 2000);

							Globals.tooltipTrigger(!Globals.tooltipTrigger());

							_.delay(function () {
								self.viewModelDom.hide();
							}, 300);
						}

					}, oViewModel);
				}

				_.each(ViewModelClass.__names, function (sName) {
					Plugins.runHook('view-model-pre-build', [sName, oViewModel, oViewModelDom]);
				});

				ko.applyBindingAccessorsToNode(oViewModelDom[0], {
					'i18nInit': true,
					'template': function () { return {'name': oViewModel.viewModelTemplate()};}
				}, oViewModel);

				Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
				if (oViewModel && 'Popups' === sPosition)
				{
					oViewModel.registerPopupKeyDown();
				}

				_.each(ViewModelClass.__names, function (sName) {
					Plugins.runHook('view-model-post-build', [sName, oViewModel, oViewModelDom]);
				});
			}
			else
			{
				Utils.log('Cannot find view model position: ' + sPosition);
			}
		}

		return ViewModelClass ? ViewModelClass.__vm : null;
	};

	/**
	 * @param {Function} ViewModelClassToHide
	 */
	Knoin.prototype.hideScreenPopup = function (ViewModelClassToHide)
	{
		if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
		{
			ViewModelClassToHide.__vm.modalVisibility(false);
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

				_.each(ViewModelClassToShow.__names, function (sName) {
					Plugins.runHook('view-model-on-show', [sName, ViewModelClassToShow.__vm, aParameters || []]);
				});
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

						Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]);

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

									_.each(ViewModelClass.__names, function (sName) {
										Plugins.runHook('view-model-on-show', [sName, ViewModelClass.__vm]);
									});
								}

							}, self);
						}
					}
					// --

					oCross = oScreen.__cross ? oScreen.__cross() : null;
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

				Plugins.runHook('screen-pre-start', [oScreen.screenName(), oScreen]);
				Utils.delegateRun(oScreen, 'onStart');
				Plugins.runHook('screen-post-start', [oScreen.screenName(), oScreen]);
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
			Globals.$html.removeClass('rl-started-trigger').addClass('rl-started');
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

	module.exports = new Knoin();

}(module, require));
},{"$":20,"Globals":9,"Plugins":12,"Utils":14,"_":25,"crossroads":17,"hasher":18,"ko":22}],28:[function(require,module,exports){

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

}(module, require));
},{}],29:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		crossroads = require('crossroads'),

		Utils = require('Utils')
	;

	/**
	 * @param {string} sScreenName
	 * @param {?=} aViewModels = []
	 * @constructor
	 */
	function KnoinAbstractScreen(sScreenName, aViewModels)
	{
		this.sScreenName = sScreenName;
		this.aViewModels = Utils.isArray(aViewModels) ? aViewModels : [];
	}

	/**
	 * @type {Array}
	 */
	KnoinAbstractScreen.prototype.oCross = null;

	/**
	 * @type {string}
	 */
	KnoinAbstractScreen.prototype.sScreenName = '';

	/**
	 * @type {Array}
	 */
	KnoinAbstractScreen.prototype.aViewModels = [];

	/**
	 * @return {Array}
	 */
	KnoinAbstractScreen.prototype.viewModels = function ()
	{
		return this.aViewModels;
	};

	/**
	 * @return {string}
	 */
	KnoinAbstractScreen.prototype.screenName = function ()
	{
		return this.sScreenName;
	};

	KnoinAbstractScreen.prototype.routes = function ()
	{
		return null;
	};

	/**
	 * @return {?Object}
	 */
	KnoinAbstractScreen.prototype.__cross = function ()
	{
		return this.oCross;
	};

	KnoinAbstractScreen.prototype.__start = function ()
	{
		var
			aRoutes = this.routes(),
			oRoute = null,
			fMatcher = null
		;

		if (Utils.isNonEmptyArray(aRoutes))
		{
			fMatcher = _.bind(this.onRoute || Utils.emptyFunction, this);
			oRoute = crossroads.create();

			_.each(aRoutes, function (aItem) {
				oRoute.addRoute(aItem[0], fMatcher).rules = aItem[1];
			});

			this.oCross = oRoute;
		}
	};

	module.exports = KnoinAbstractScreen;

}(module, require));
},{"Utils":14,"_":25,"crossroads":17}],30:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		Globals = require('Globals')
	;

	/**
	 * @constructor
	 * @param {string=} sPosition = ''
	 * @param {string=} sTemplate = ''
	 */
	function KnoinAbstractViewModel(sPosition, sTemplate)
	{
		this.bDisabeCloseOnEsc = false;
		this.sPosition = Utils.pString(sPosition);
		this.sTemplate = Utils.pString(sTemplate);

		this.sDefaultKeyScope = Enums.KeyState.None;
		this.sCurrentKeyScope = this.sDefaultKeyScope;

		this.viewModelVisibility = ko.observable(false);
		this.modalVisibility = ko.observable(false).extend({'rateLimit': 0});

		this.viewModelName = '';
		this.viewModelNames = [];
		this.viewModelDom = null;
	}

	/**
	 * @type {boolean}
	 */
	KnoinAbstractViewModel.prototype.bDisabeCloseOnEsc = false;

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
	KnoinAbstractViewModel.prototype.sDefaultKeyScope = Enums.KeyState.None;

	/**
	 * @type {string}
	 */
	KnoinAbstractViewModel.prototype.sCurrentKeyScope = Enums.KeyState.None;

	/**
	 * @type {string}
	 */
	KnoinAbstractViewModel.prototype.viewModelName = '';

	/**
	 * @type {Array}
	 */
	KnoinAbstractViewModel.prototype.viewModelNames = [];

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

	KnoinAbstractViewModel.prototype.cancelCommand = function () {};
	KnoinAbstractViewModel.prototype.closeCommand = function () {};

	KnoinAbstractViewModel.prototype.storeAndSetKeyScope = function ()
	{
		this.sCurrentKeyScope = Globals.keyScope();
		Globals.keyScope(this.sDefaultKeyScope);
	};

	KnoinAbstractViewModel.prototype.restoreKeyScope = function ()
	{
		Globals.keyScope(this.sCurrentKeyScope);
	};

	KnoinAbstractViewModel.prototype.registerPopupKeyDown = function ()
	{
		var self = this;

		Globals.$win.on('keydown', function (oEvent) {
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

}(module, require));
},{"Enums":7,"Globals":9,"Utils":14,"ko":22}],31:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 *
	 * @param {string} sEmail
	 * @param {boolean=} bCanBeDelete = true
	 */
	function AccountModel(sEmail, bCanBeDelete)
	{
		this.email = sEmail;

		this.deleteAccess = ko.observable(false);
		this.canBeDalete = ko.observable(Utils.isUnd(bCanBeDelete) ? true : !!bCanBeDelete);
	}

	/**
	 * @type {string}
	 */
	AccountModel.prototype.email = '';

	/**
	 * @return {string}
	 */
	AccountModel.prototype.changeAccountLink = function ()
	{
		return require('LinkBuilder').change(this.email);
	};

	module.exports = AccountModel;

}(module, require));
},{"LinkBuilder":11,"Utils":14,"ko":22}],32:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),

		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder')
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
		return LinkBuilder.attachmentDownload(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreview = function ()
	{
		return LinkBuilder.attachmentPreview(this.download);
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

}(module, require));
},{"Globals":9,"LinkBuilder":11,"Utils":14,"window":26}],33:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 * @param {string} sId
	 * @param {string} sFileName
	 * @param {?number=} nSize
	 * @param {boolean=} bInline
	 * @param {boolean=} bLinked
	 * @param {string=} sCID
	 * @param {string=} sContentLocation
	 */
	function ComposeAttachmentModel(sId, sFileName, nSize, bInline, bLinked, sCID, sContentLocation)
	{
		this.id = sId;
		this.isInline = Utils.isUnd(bInline) ? false : !!bInline;
		this.isLinked = Utils.isUnd(bLinked) ? false : !!bLinked;
		this.CID = Utils.isUnd(sCID) ? '' : sCID;
		this.contentLocation = Utils.isUnd(sContentLocation) ? '' : sContentLocation;
		this.fromMessage = false;

		this.fileName = ko.observable(sFileName);
		this.size = ko.observable(Utils.isUnd(nSize) ? null : nSize);
		this.tempName = ko.observable('');

		this.progress = ko.observable('');
		this.error = ko.observable('');
		this.waiting = ko.observable(true);
		this.uploading = ko.observable(false);
		this.enabled = ko.observable(true);

		this.friendlySize = ko.computed(function () {
			var mSize = this.size();
			return null === mSize ? '' : Utils.friendlySize(this.size());
		}, this);
	}

	ComposeAttachmentModel.prototype.id = '';
	ComposeAttachmentModel.prototype.isInline = false;
	ComposeAttachmentModel.prototype.isLinked = false;
	ComposeAttachmentModel.prototype.CID = '';
	ComposeAttachmentModel.prototype.contentLocation = '';
	ComposeAttachmentModel.prototype.fromMessage = false;
	ComposeAttachmentModel.prototype.cancel = Utils.emptyFunction;

	/**
	 * @param {AjaxJsonComposeAttachment} oJsonAttachment
	 */
	ComposeAttachmentModel.prototype.initByUploadJson = function (oJsonAttachment)
	{
		var bResult = false;
		if (oJsonAttachment)
		{
			this.fileName(oJsonAttachment.Name);
			this.size(Utils.isUnd(oJsonAttachment.Size) ? 0 : Utils.pInt(oJsonAttachment.Size));
			this.tempName(Utils.isUnd(oJsonAttachment.TempName) ? '' : oJsonAttachment.TempName);
			this.isInline = false;

			bResult = true;
		}

		return bResult;
	};

	module.exports = ComposeAttachmentModel;

}(module, require));
},{"Utils":14,"ko":22}],34:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder')
	;

	/**
	 * @constructor
	 */
	function ContactModel()
	{
		this.idContact = 0;
		this.display = '';
		this.properties = [];
		this.tags = '';
		this.readOnly = false;

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.checked = ko.observable(false);
		this.deleted = ko.observable(false);
	}

	/**
	 * @return {Array|null}
	 */
	ContactModel.prototype.getNameAndEmailHelper = function ()
	{
		var
			sName = '',
			sEmail = ''
		;

		if (Utils.isNonEmptyArray(this.properties))
		{
			_.each(this.properties, function (aProperty) {
				if (aProperty)
				{
					if (Enums.ContactPropertyType.FirstName === aProperty[0])
					{
						sName = Utils.trim(aProperty[1] + ' ' + sName);
					}
					else if (Enums.ContactPropertyType.LastName === aProperty[0])
					{
						sName = Utils.trim(sName + ' ' + aProperty[1]);
					}
					else if ('' === sEmail && Enums.ContactPropertyType.Email === aProperty[0])
					{
						sEmail = aProperty[1];
					}
				}
			}, this);
		}

		return '' === sEmail ? null : [sEmail, sName];
	};

	ContactModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Contact' === oItem['@Object'])
		{
			this.idContact = Utils.pInt(oItem['IdContact']);
			this.display = Utils.pString(oItem['Display']);
			this.readOnly = !!oItem['ReadOnly'];
			this.tags = '';

			if (Utils.isNonEmptyArray(oItem['Properties']))
			{
				_.each(oItem['Properties'], function (oProperty) {
					if (oProperty && oProperty['Type'] && Utils.isNormal(oProperty['Value']) && Utils.isNormal(oProperty['TypeStr']))
					{
						this.properties.push([Utils.pInt(oProperty['Type']), Utils.pString(oProperty['Value']), Utils.pString(oProperty['TypeStr'])]);
					}
				}, this);
			}

			if (Utils.isNonEmptyArray(oItem['Tags']))
			{
				this.tags = oItem['Tags'].join(',');
			}

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {string}
	 */
	ContactModel.prototype.srcAttr = function ()
	{
		return LinkBuilder.emptyContactPic();
	};

	/**
	 * @return {string}
	 */
	ContactModel.prototype.generateUid = function ()
	{
		return '' + this.idContact;
	};

	/**
	 * @return string
	 */
	ContactModel.prototype.lineAsCcc = function ()
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
		if (this.focused())
		{
			aResult.push('focused');
		}

		return aResult.join(' ');
	};

	module.exports = ContactModel;

}(module, require));
},{"Enums":7,"LinkBuilder":11,"Utils":14,"_":25,"ko":22}],35:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 * @param {number=} iType = Enums.ContactPropertyType.Unknown
	 * @param {string=} sTypeStr = ''
	 * @param {string=} sValue = ''
	 * @param {boolean=} bFocused = false
	 * @param {string=} sPlaceholder = ''
	 */
	function ContactPropertyModel(iType, sTypeStr, sValue, bFocused, sPlaceholder)
	{
		this.type = ko.observable(Utils.isUnd(iType) ? Enums.ContactPropertyType.Unknown : iType);
		this.typeStr = ko.observable(Utils.isUnd(sTypeStr) ? '' : sTypeStr);
		this.focused = ko.observable(Utils.isUnd(bFocused) ? false : !!bFocused);
		this.value = ko.observable(Utils.pString(sValue));

		this.placeholder = ko.observable(sPlaceholder || '');

		this.placeholderValue = ko.computed(function () {
			var sPlaceholder = this.placeholder();
			return sPlaceholder ? Utils.i18n(sPlaceholder) : '';
		}, this);

		this.largeValue = ko.computed(function () {
			return Enums.ContactPropertyType.Note === this.type();
		}, this);
	}

	module.exports = ContactPropertyModel;

}(module, require));
},{"Enums":7,"Utils":14,"ko":22}],36:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function ContactTagModel()
	{
		this.idContactTag = 0;
		this.name = ko.observable('');
		this.readOnly = false;
	}

	ContactTagModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Tag' === oItem['@Object'])
		{
			this.idContact = Utils.pInt(oItem['IdContactTag']);
			this.name(Utils.pString(oItem['Name']));
			this.readOnly = !!oItem['ReadOnly'];

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @param {string} sSearch
	 * @return {boolean}
	 */
	ContactTagModel.prototype.filterHelper = function (sSearch)
	{
		return this.name().toLowerCase().indexOf(sSearch.toLowerCase()) !== -1;
	};

	/**
	 * @param {boolean=} bEncodeHtml = false
	 * @return {string}
	 */
	ContactTagModel.prototype.toLine = function (bEncodeHtml)
	{
		return (Utils.isUnd(bEncodeHtml) ? false : !!bEncodeHtml) ?
			Utils.encodeHtml(this.name()) : this.name();
	};

	module.exports = ContactTagModel;

}(module, require));
},{"Utils":14,"ko":22}],37:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		Utils = require('Utils')
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

	EmailModel.prototype.clear = function ()
	{
		this.email = '';
		this.name = '';
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
		$sName = $sName.replace(/\\\\(.)/g, '$1');
		$sComment = $sComment.replace(/\\\\(.)/g, '$1');

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

}(module, require));
},{"Utils":14}],38:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums')
	;

	/**
	 * @param {*} oKoList
	 * @constructor
	 */
	function FilterConditionModel(oKoList)
	{
		this.parentList = oKoList;

		this.field = ko.observable(Enums.FilterConditionField.From);

		this.fieldOptions = [ // TODO i18n
			{'id': Enums.FilterConditionField.From, 'name': 'From'},
			{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC)'},
			{'id': Enums.FilterConditionField.To, 'name': 'To'},
			{'id': Enums.FilterConditionField.Subject, 'name': 'Subject'}
		];

		this.type = ko.observable(Enums.FilterConditionType.EqualTo);

		this.typeOptions = [ // TODO i18n
			{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To'},
			{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To'},
			{'id': Enums.FilterConditionType.Contains, 'name': 'Contains'},
			{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains'}
		];

		this.value = ko.observable('');

		this.template = ko.computed(function () {

			var sTemplate = '';
			switch (this.type())
			{
				default:
					sTemplate = 'SettingsFiltersConditionDefault';
					break;
			}

			return sTemplate;

		}, this);
	}

	FilterConditionModel.prototype.removeSelf = function ()
	{
		this.parentList.remove(this);
	};

	module.exports = FilterConditionModel;

}(module, require));
},{"Enums":7,"ko":22}],39:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		FilterConditionModel = require('Model:FilterCondition')
	;

	/**
	 * @constructor
	 */
	function FilterModel()
	{
		this.isNew = ko.observable(true);
		this.enabled = ko.observable(true);

		this.name = ko.observable('');

		this.conditionsType = ko.observable(Enums.FilterRulesType.And);

		this.conditions = ko.observableArray([]);

		this.conditions.subscribe(function () {
			Utils.windowResize();
		});

		// Actions
		this.actionMarkAsRead = ko.observable(false);
		this.actionSkipOtherFilters = ko.observable(true);
		this.actionValue = ko.observable('');

		this.actionType = ko.observable(Enums.FiltersAction.Move);
		this.actionTypeOptions = [ // TODO i18n
			{'id': Enums.FiltersAction.None, 'name': 'Action - None'},
			{'id': Enums.FiltersAction.Move, 'name': 'Action - Move to'},
	//		{'id': Enums.FiltersAction.Forward, 'name': 'Action - Forward to'},
			{'id': Enums.FiltersAction.Discard, 'name': 'Action - Discard'}
		];

		this.actionMarkAsReadVisiblity = ko.computed(function () {
			return -1 < Utils.inArray(this.actionType(), [
				Enums.FiltersAction.None, Enums.FiltersAction.Forward, Enums.FiltersAction.Move
			]);
		}, this);

		this.actionTemplate = ko.computed(function () {

			var sTemplate = '';
			switch (this.actionType())
			{
				default:
				case Enums.FiltersAction.Move:
					sTemplate = 'SettingsFiltersActionValueAsFolders';
					break;
				case Enums.FiltersAction.Forward:
					sTemplate = 'SettingsFiltersActionWithValue';
					break;
				case Enums.FiltersAction.None:
				case Enums.FiltersAction.Discard:
					sTemplate = 'SettingsFiltersActionNoValue';
					break;
			}

			return sTemplate;

		}, this);
	}

	FilterModel.prototype.addCondition = function ()
	{
		this.conditions.push(new FilterConditionModel(this.conditions));
	};

	FilterModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Filter' === oItem['@Object'])
		{
			this.name(Utils.pString(oItem['Name']));

			bResult = true;
		}

		return bResult;
	};

	module.exports = FilterModel;

}(module, require));
},{"Enums":7,"Model:FilterCondition":38,"Utils":14,"ko":22}],40:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Events = require('Events')
	;

	/**
	 * @constructor
	 */
	function FolderModel()
	{
		this.name = ko.observable('');
		this.fullName = '';
		this.fullNameRaw = '';
		this.fullNameHash = '';
		this.delimiter = '';
		this.namespace = '';
		this.deep = 0;
		this.interval = 0;

		this.selectable = false;
		this.existen = true;

		this.type = ko.observable(Enums.FolderType.User);

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.edited = ko.observable(false);
		this.collapsed = ko.observable(true);
		this.subScribed = ko.observable(true);
		this.subFolders = ko.observableArray([]);
		this.deleteAccess = ko.observable(false);
		this.actionBlink = ko.observable(false).extend({'falseTimeout': 1000});

		this.nameForEdit = ko.observable('');

		this.privateMessageCountAll = ko.observable(0);
		this.privateMessageCountUnread = ko.observable(0);

		this.collapsedPrivate = ko.observable(true);
	}

	/**
	 * @static
	 * @param {AjaxJsonFolder} oJsonFolder
	 * @return {?FolderModel}
	 */
	FolderModel.newInstanceFromJson = function (oJsonFolder)
	{
		var oFolderModel = new FolderModel();
		return oFolderModel.initByJson(oJsonFolder) ? oFolderModel.initComputed() : null;
	};

	/**
	 * @return {FolderModel}
	 */
	FolderModel.prototype.initComputed = function ()
	{
		this.hasSubScribedSubfolders = ko.computed(function () {
			return !!_.find(this.subFolders(), function (oFolder) {
				return oFolder.subScribed() && !oFolder.isSystemFolder();
			});
		}, this);

		this.canBeEdited = ko.computed(function () {
			return Enums.FolderType.User === this.type() && this.existen && this.selectable;
		}, this);

		this.visible = ko.computed(function () {
			var
				bSubScribed = this.subScribed(),
				bSubFolders = this.hasSubScribedSubfolders()
			;

			return (bSubScribed || (bSubFolders && (!this.existen || !this.selectable)));
		}, this);

		this.isSystemFolder = ko.computed(function () {
			return Enums.FolderType.User !== this.type();
		}, this);

		this.hidden = ko.computed(function () {
			var
				bSystem = this.isSystemFolder(),
				bSubFolders = this.hasSubScribedSubfolders()
			;

			return (bSystem && !bSubFolders) || (!this.selectable && !bSubFolders);

		}, this);

		this.selectableForFolderList = ko.computed(function () {
			return !this.isSystemFolder() && this.selectable;
		}, this);

		this.messageCountAll = ko.computed({
			'read': this.privateMessageCountAll,
			'write': function (iValue) {
				if (Utils.isPosNumeric(iValue, true))
				{
					this.privateMessageCountAll(iValue);
				}
				else
				{
					this.privateMessageCountAll.valueHasMutated();
				}
			},
			'owner': this
		});

		this.messageCountUnread = ko.computed({
			'read': this.privateMessageCountUnread,
			'write': function (iValue) {
				if (Utils.isPosNumeric(iValue, true))
				{
					this.privateMessageCountUnread(iValue);
				}
				else
				{
					this.privateMessageCountUnread.valueHasMutated();
				}
			},
			'owner': this
		});

		this.printableUnreadCount = ko.computed(function () {
			var
				iCount = this.messageCountAll(),
				iUnread = this.messageCountUnread(),
				iType = this.type()
			;

			if (0 < iCount)
			{
				if (Enums.FolderType.Draft === iType)
				{
					return '' + iCount;
				}
				else if (0 < iUnread && Enums.FolderType.Trash !== iType && Enums.FolderType.Archive !== iType && Enums.FolderType.SentItems !== iType)
				{
					return '' + iUnread;
				}
			}

			return '';

		}, this);

		this.canBeDeleted = ko.computed(function () {
			var
				bSystem = this.isSystemFolder()
			;
			return !bSystem && 0 === this.subFolders().length && 'INBOX' !== this.fullNameRaw;
		}, this);

		this.canBeSubScribed = ko.computed(function () {
			return !this.isSystemFolder() && this.selectable && 'INBOX' !== this.fullNameRaw;
		}, this);

//		this.visible.subscribe(function () {
//			Utils.timeOutAction('folder-list-folder-visibility-change', function () {
//				Globals.$win.trigger('folder-list-folder-visibility-change');
//			}, 100);
//		});

		this.localName = ko.computed(function () {

			Globals.langChangeTrigger();

			var
				iType = this.type(),
				sName = this.name()
			;

			if (this.isSystemFolder())
			{
				switch (iType)
				{
					case Enums.FolderType.Inbox:
						sName = Utils.i18n('FOLDER_LIST/INBOX_NAME');
						break;
					case Enums.FolderType.SentItems:
						sName = Utils.i18n('FOLDER_LIST/SENT_NAME');
						break;
					case Enums.FolderType.Draft:
						sName = Utils.i18n('FOLDER_LIST/DRAFTS_NAME');
						break;
					case Enums.FolderType.Spam:
						sName = Utils.i18n('FOLDER_LIST/SPAM_NAME');
						break;
					case Enums.FolderType.Trash:
						sName = Utils.i18n('FOLDER_LIST/TRASH_NAME');
						break;
					case Enums.FolderType.Archive:
						sName = Utils.i18n('FOLDER_LIST/ARCHIVE_NAME');
						break;
				}
			}

			return sName;

		}, this);

		this.manageFolderSystemName = ko.computed(function () {

			Globals.langChangeTrigger();

			var
				sSuffix = '',
				iType = this.type(),
				sName = this.name()
			;

			if (this.isSystemFolder())
			{
				switch (iType)
				{
					case Enums.FolderType.Inbox:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/INBOX_NAME') + ')';
						break;
					case Enums.FolderType.SentItems:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/SENT_NAME') + ')';
						break;
					case Enums.FolderType.Draft:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/DRAFTS_NAME') + ')';
						break;
					case Enums.FolderType.Spam:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/SPAM_NAME') + ')';
						break;
					case Enums.FolderType.Trash:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/TRASH_NAME') + ')';
						break;
					case Enums.FolderType.Archive:
						sSuffix = '(' + Utils.i18n('FOLDER_LIST/ARCHIVE_NAME') + ')';
						break;
				}
			}

			if ('' !== sSuffix && '(' + sName + ')' === sSuffix || '(inbox)' === sSuffix.toLowerCase())
			{
				sSuffix = '';
			}

			return sSuffix;

		}, this);

		this.collapsed = ko.computed({
			'read': function () {
				return !this.hidden() && this.collapsedPrivate();
			},
			'write': function (mValue) {
				this.collapsedPrivate(mValue);
			},
			'owner': this
		});

		this.hasUnreadMessages = ko.computed(function () {
			return 0 < this.messageCountUnread();
		}, this);

		this.hasSubScribedUnreadMessagesSubfolders = ko.computed(function () {
			return !!_.find(this.subFolders(), function (oFolder) {
				return oFolder.hasUnreadMessages() || oFolder.hasSubScribedUnreadMessagesSubfolders();
			});
		}, this);

		// subscribe
		this.name.subscribe(function (sValue) {
			this.nameForEdit(sValue);
		}, this);

		this.edited.subscribe(function (bValue) {
			if (bValue)
			{
				this.nameForEdit(this.name());
			}
		}, this);

		this.messageCountUnread.subscribe(function (iUnread) {
			if (Enums.FolderType.Inbox === this.type())
			{
				Events.pub('mailbox.inbox-unread-count', [iUnread]);
			}
		}, this);

		return this;
	};

	FolderModel.prototype.fullName = '';
	FolderModel.prototype.fullNameRaw = '';
	FolderModel.prototype.fullNameHash = '';
	FolderModel.prototype.delimiter = '';
	FolderModel.prototype.namespace = '';
	FolderModel.prototype.deep = 0;
	FolderModel.prototype.interval = 0;

	/**
	 * @return {string}
	 */
	FolderModel.prototype.collapsedCss = function ()
	{
		return this.hasSubScribedSubfolders() ?
			(this.collapsed() ? 'icon-right-mini e-collapsed-sign' : 'icon-down-mini e-collapsed-sign') : 'icon-none e-collapsed-sign';
	};

	/**
	 * @param {AjaxJsonFolder} oJsonFolder
	 * @return {boolean}
	 */
	FolderModel.prototype.initByJson = function (oJsonFolder)
	{
		var bResult = false;
		if (oJsonFolder && 'Object/Folder' === oJsonFolder['@Object'])
		{
			this.name(oJsonFolder.Name);
			this.delimiter = oJsonFolder.Delimiter;
			this.fullName = oJsonFolder.FullName;
			this.fullNameRaw = oJsonFolder.FullNameRaw;
			this.fullNameHash = oJsonFolder.FullNameHash;
			this.deep = oJsonFolder.FullNameRaw.split(this.delimiter).length - 1;
			this.selectable = !!oJsonFolder.IsSelectable;
			this.existen = !!oJsonFolder.IsExists;

			this.subScribed(!!oJsonFolder.IsSubscribed);
			this.type('INBOX' === this.fullNameRaw ? Enums.FolderType.Inbox : Enums.FolderType.User);

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {string}
	 */
	FolderModel.prototype.printableFullName = function ()
	{
		return this.fullName.split(this.delimiter).join(' / ');
	};

	module.exports = FolderModel;

}(module, require));
},{"Enums":7,"Events":8,"Globals":9,"Utils":14,"_":25,"ko":22}],41:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @param {string} sId
	 * @param {string} sEmail
	 * @param {boolean=} bCanBeDelete = true
	 * @constructor
	 */
	function IdentityModel(sId, sEmail, bCanBeDelete)
	{
		this.id = sId;
		this.email = ko.observable(sEmail);
		this.name = ko.observable('');
		this.replyTo = ko.observable('');
		this.bcc = ko.observable('');

		this.deleteAccess = ko.observable(false);
		this.canBeDalete = ko.observable(bCanBeDelete);
	}

	IdentityModel.prototype.formattedName = function ()
	{
		var sName = this.name();
		return '' === sName ? this.email() : sName + ' <' + this.email() + '>';
	};

	IdentityModel.prototype.formattedNameForCompose = function ()
	{
		var sName = this.name();
		return '' === sName ? this.email() : sName + ' (' + this.email() + ')';
	};

	IdentityModel.prototype.formattedNameForEmail = function ()
	{
		var sName = this.name();
		return '' === sName ? this.email() : '"' + Utils.quoteName(sName) + '" <' + this.email() + '>';
	};

	module.exports = IdentityModel;

}(module, require));
},{"Utils":14,"ko":22}],42:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		moment = require('moment'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		Globals = require('Globals'),
		LinkBuilder = require('LinkBuilder'),

		EmailModel = require('Model:Email'),
		AttachmentModel = require('Model:Attachment')
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

	/**
	 * @return {string}
	 */
	MessageModel.prototype.friendlySize = function ()
	{
		return Utils.friendlySize(this.size());
	};

	MessageModel.prototype.computeSenderEmail = function ()
	{
		var
			Data = require('Storage:RainLoop:Data'),
			sSent = Data.sentFolder(),
			sDraft = Data.draftFolder()
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
		   Data = require('Storage:RainLoop:Data'),
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

		   if (Data.capaOpenPGP())
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
	   return LinkBuilder.messageViewLink(this.requestHash);
	};

	/**
	* @return {string}
	*/
	MessageModel.prototype.downloadLink = function ()
	{
	   return LinkBuilder.messageDownloadLink(this.requestHash);
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

			   Globals.$win.resize();
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

		   var Data = require('Storage:RainLoop:Data');
		   if (Data.capaOpenPGP())
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
		var Data = require('Storage:RainLoop:Data');
		if (this.body && Data.capaOpenPGP())
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

			var Data = require('Storage:RainLoop:Data');
			if (Data.capaOpenPGP())
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
			   Data = require('Storage:RainLoop:Data'),
			   sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
			   aPublicKeys = Data.findPublicKeysByEmail(sFrom),
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
						   oValidSysKey = Data.findPublicKeyByHex(oValidKey.keyid.toHex());
						   if (oValidSysKey)
						   {
							   sPlain = mPgpMessage.getText();

							   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
							   this.pgpSignedVerifyUser(oValidSysKey.user);

							   sPlain =
								   Globals.$div.empty().append(
									   $('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
								   ).html()
							   ;

							   Globals.$div.empty();

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
			   Data = require('Storage:RainLoop:Data'),
			   sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
			   aPublicKey = Data.findPublicKeysByEmail(sFrom),
			   oPrivateKey = Data.findSelfPrivateKey(sPassword),
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
							   oValidSysKey = Data.findPublicKeyByHex(oValidKey.keyid.toHex());
							   if (oValidSysKey)
							   {
								   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
								   this.pgpSignedVerifyUser(oValidSysKey.user);
							   }
						   }
					   }

					   sPlain = mPgpMessageDecrypted.getText();

					   sPlain =
						   Globals.$div.empty().append(
							   $('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
						   ).html()
					   ;

					   Globals.$div.empty();

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

}(module, require));
},{"$":20,"Enums":7,"Globals":9,"LinkBuilder":11,"Model:Attachment":32,"Model:Email":37,"Storage:RainLoop:Data":64,"Utils":14,"_":25,"ko":22,"moment":23,"window":26}],43:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @param {string} iIndex
	 * @param {string} sGuID
	 * @param {string} sID
	 * @param {string} sUserID
	 * @param {string} sEmail
	 * @param {boolean} bIsPrivate
	 * @param {string} sArmor
	 * @constructor
	 */
	function OpenPgpKeyModel(iIndex, sGuID, sID, sUserID, sEmail, bIsPrivate, sArmor)
	{
		this.index = iIndex;
		this.id = sID;
		this.guid = sGuID;
		this.user = sUserID;
		this.email = sEmail;
		this.armor = sArmor;
		this.isPrivate = !!bIsPrivate;

		this.deleteAccess = ko.observable(false);
	}

	OpenPgpKeyModel.prototype.index = 0;
	OpenPgpKeyModel.prototype.id = '';
	OpenPgpKeyModel.prototype.guid = '';
	OpenPgpKeyModel.prototype.user = '';
	OpenPgpKeyModel.prototype.email = '';
	OpenPgpKeyModel.prototype.armor = '';
	OpenPgpKeyModel.prototype.isPrivate = false;

	module.exports = OpenPgpKeyModel;

}(module, require));
},{"ko":22}],44:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function AboutScreen()
	{
		KnoinAbstractScreen.call(this, 'about', [
			require('View:RainLoop:About')
		]);
	}

	_.extend(AboutScreen.prototype, KnoinAbstractScreen.prototype);

	AboutScreen.prototype.onShow = function ()
	{
		require('App:RainLoop').setTitle('RainLoop');
	};

	module.exports = AboutScreen;

}(module, require));
},{"App:RainLoop":3,"Knoin:AbstractScreen":29,"View:RainLoop:About":70,"_":25}],45:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		kn = require('App:Knoin'),
		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @constructor
	 * @param {Array} aViewModels
	 * @extends KnoinAbstractScreen
	 */
	function AbstractSettingsScreen(aViewModels)
	{
		KnoinAbstractScreen.call(this, 'settings', aViewModels);

		this.menu = ko.observableArray([]);

		this.oCurrentSubScreen = null;
		this.oViewModelPlace = null;
	}

	_.extend(AbstractSettingsScreen.prototype, KnoinAbstractScreen.prototype);

	AbstractSettingsScreen.prototype.onRoute = function (sSubName)
	{
		var
			self = this,
			oSettingsScreen = null,
			RoutedSettingsViewModel = null,
			oViewModelPlace = null,
			oViewModelDom = null
		;

		RoutedSettingsViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
			return SettingsViewModel && SettingsViewModel.__rlSettingsData &&
				sSubName === SettingsViewModel.__rlSettingsData.Route;
		});

		if (RoutedSettingsViewModel)
		{
			if (_.find(Globals.aViewModels['settings-removed'], function (DisabledSettingsViewModel) {
				return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
			}))
			{
				RoutedSettingsViewModel = null;
			}

			if (RoutedSettingsViewModel && _.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
				return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
			}))
			{
				RoutedSettingsViewModel = null;
			}
		}

		if (RoutedSettingsViewModel)
		{
			if (RoutedSettingsViewModel.__builded && RoutedSettingsViewModel.__vm)
			{
				oSettingsScreen = RoutedSettingsViewModel.__vm;
			}
			else
			{
				oViewModelPlace = this.oViewModelPlace;
				if (oViewModelPlace && 1 === oViewModelPlace.length)
				{
					oSettingsScreen = new RoutedSettingsViewModel();

					oViewModelDom = $('<div></div>').addClass('rl-settings-view-model').hide();
					oViewModelDom.appendTo(oViewModelPlace);

					oSettingsScreen.viewModelDom = oViewModelDom;

					oSettingsScreen.__rlSettingsData = RoutedSettingsViewModel.__rlSettingsData;

					RoutedSettingsViewModel.__dom = oViewModelDom;
					RoutedSettingsViewModel.__builded = true;
					RoutedSettingsViewModel.__vm = oSettingsScreen;

					ko.applyBindingAccessorsToNode(oViewModelDom[0], {
						'i18nInit': true,
						'template': function () { return {'name': RoutedSettingsViewModel.__rlSettingsData.Template}; }
					}, oSettingsScreen);

					Utils.delegateRun(oSettingsScreen, 'onBuild', [oViewModelDom]);
				}
				else
				{
					Utils.log('Cannot find sub settings view model position: SettingsSubScreen');
				}
			}

			if (oSettingsScreen)
			{
				_.defer(function () {
					// hide
					if (self.oCurrentSubScreen)
					{
						Utils.delegateRun(self.oCurrentSubScreen, 'onHide');
						self.oCurrentSubScreen.viewModelDom.hide();
					}
					// --

					self.oCurrentSubScreen = oSettingsScreen;

					// show
					if (self.oCurrentSubScreen)
					{
						self.oCurrentSubScreen.viewModelDom.show();
						Utils.delegateRun(self.oCurrentSubScreen, 'onShow');
						Utils.delegateRun(self.oCurrentSubScreen, 'onFocus', [], 200);

						_.each(self.menu(), function (oItem) {
							oItem.selected(oSettingsScreen && oSettingsScreen.__rlSettingsData && oItem.route === oSettingsScreen.__rlSettingsData.Route);
						});

						$('#rl-content .b-settings .b-content .content').scrollTop(0);
					}
					// --

					Utils.windowResize();
				});
			}
		}
		else
		{
			kn.setHash(LinkBuilder.settings(), false, true);
		}
	};

	AbstractSettingsScreen.prototype.onHide = function ()
	{
		if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
		{
			Utils.delegateRun(this.oCurrentSubScreen, 'onHide');
			this.oCurrentSubScreen.viewModelDom.hide();
		}
	};

	AbstractSettingsScreen.prototype.onBuild = function ()
	{
		_.each(Globals.aViewModels['settings'], function (SettingsViewModel) {
			if (SettingsViewModel && SettingsViewModel.__rlSettingsData &&
				!_.find(Globals.aViewModels['settings-removed'], function (RemoveSettingsViewModel) {
					return RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel;
				}))
			{
				this.menu.push({
					'route': SettingsViewModel.__rlSettingsData.Route,
					'label': SettingsViewModel.__rlSettingsData.Label,
					'selected': ko.observable(false),
					'disabled': !!_.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
						return DisabledSettingsViewModel && DisabledSettingsViewModel === SettingsViewModel;
					})
				});
			}
		}, this);

		this.oViewModelPlace = $('#rl-content #rl-settings-subscreen');
	};

	AbstractSettingsScreen.prototype.routes = function ()
	{
		var
			DefaultViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
				return SettingsViewModel && SettingsViewModel.__rlSettingsData && SettingsViewModel.__rlSettingsData['IsDefault'];
			}),
			sDefaultRoute = DefaultViewModel ? DefaultViewModel.__rlSettingsData['Route'] : 'general',
			oRules = {
				'subname': /^(.*)$/,
				'normalize_': function (oRequest, oVals) {
					oVals.subname = Utils.isUnd(oVals.subname) ? sDefaultRoute : Utils.pString(oVals.subname);
					return [oVals.subname];
				}
			}
		;

		return [
			['{subname}/', oRules],
			['{subname}', oRules],
			['', oRules]
		];
	};

	module.exports = AbstractSettingsScreen;

}(module, require));
},{"$":20,"App:Knoin":27,"Globals":9,"Knoin:AbstractScreen":29,"LinkBuilder":11,"Utils":14,"_":25,"ko":22}],46:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function LoginScreen()
	{
		KnoinAbstractScreen.call(this, 'login', [
			require('View:RainLoop:Login')
		]);
	}

	_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

	LoginScreen.prototype.onShow = function ()
	{
		require('App:RainLoop').setTitle('');
	};

	module.exports = LoginScreen;

}(module, require));
},{"App:RainLoop":3,"Knoin:AbstractScreen":29,"View:RainLoop:Login":72,"_":25}],47:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Events = require('Events'),

		KnoinAbstractScreen = require('Knoin:AbstractScreen'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Cache = require('Storage:RainLoop:Cache'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function MailBoxScreen()
	{
		KnoinAbstractScreen.call(this, 'mailbox', [
			require('View:RainLoop:MailBoxSystemDropDown'),
			require('View:RainLoop:MailBoxFolderList'),
			require('View:RainLoop:MailBoxMessageList'),
			require('View:RainLoop:MailBoxMessageView')
		]);

		this.oLastRoute = {};
	}

	_.extend(MailBoxScreen.prototype, KnoinAbstractScreen.prototype);

	/**
	 * @type {Object}
	 */
	MailBoxScreen.prototype.oLastRoute = {};

	MailBoxScreen.prototype.setNewTitle  = function ()
	{
		var
			sEmail = Data.accountEmail(),
			nFoldersInboxUnreadCount = Data.foldersInboxUnreadCount()
		;

		require('App:RainLoop').setTitle(('' === sEmail ? '' :
			(0 < nFoldersInboxUnreadCount ? '(' + nFoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
	};

	MailBoxScreen.prototype.onShow = function ()
	{
		this.setNewTitle();
		Globals.keyScope(Enums.KeyState.MessageList);
	};

	/**
	 * @param {string} sFolderHash
	 * @param {number} iPage
	 * @param {string} sSearch
	 * @param {boolean=} bPreview = false
	 */
	MailBoxScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
	{
		if (Utils.isUnd(bPreview) ? false : !!bPreview)
		{
			if (Enums.Layout.NoPreview === Data.layout() && !Data.message())
			{
				require('App:RainLoop').historyBack();
			}
		}
		else
		{
			var
				sFolderFullNameRaw = Cache.getFolderFullNameRaw(sFolderHash),
				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw)
			;

			if (oFolder)
			{
				Data
					.currentFolder(oFolder)
					.messageListPage(iPage)
					.messageListSearch(sSearch)
				;

				if (Enums.Layout.NoPreview === Data.layout() && Data.message())
				{
					Data.message(null);
				}

				require('App:RainLoop').reloadMessageList();
			}
		}
	};

	MailBoxScreen.prototype.onStart = function ()
	{
		var
			fResizeFunction = function () {
				Utils.windowResize();
			}
		;

		if (Settings.capa(Enums.Capa.AdditionalAccounts) || Settings.capa(Enums.Capa.AdditionalIdentities))
		{
			require('App:RainLoop').accountsAndIdentities();
		}

		_.delay(function () {
			if ('INBOX' !== Data.currentFolderFullNameRaw())
			{
				require('App:RainLoop').folderInformation('INBOX');
			}
		}, 1000);

		_.delay(function () {
			require('App:RainLoop').quota();
		}, 5000);

		_.delay(function () {
			Remote.appDelayStart(Utils.emptyFunction);
		}, 35000);

		Globals.$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === Data.layout());

		Data.folderList.subscribe(fResizeFunction);
		Data.messageList.subscribe(fResizeFunction);
		Data.message.subscribe(fResizeFunction);

		Data.layout.subscribe(function (nValue) {
			Globals.$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === nValue);
		});

		Events.sub('mailbox.inbox-unread-count', function (nCount) {
			Data.foldersInboxUnreadCount(nCount);
		});

		Data.foldersInboxUnreadCount.subscribe(function () {
			this.setNewTitle();
		}, this);
	};

	/**
	 * @return {Array}
	 */
	MailBoxScreen.prototype.routes = function ()
	{
		var
			fNormP = function () {
				return ['Inbox', 1, '', true];
			},
			fNormS = function (oRequest, oVals) {
				oVals[0] = Utils.pString(oVals[0]);
				oVals[1] = Utils.pInt(oVals[1]);
				oVals[1] = 0 >= oVals[1] ? 1 : oVals[1];
				oVals[2] = Utils.pString(oVals[2]);

				if ('' === oRequest)
				{
					oVals[0] = 'Inbox';
					oVals[1] = 1;
				}

				return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2]), false];
			},
			fNormD = function (oRequest, oVals) {
				oVals[0] = Utils.pString(oVals[0]);
				oVals[1] = Utils.pString(oVals[1]);

				if ('' === oRequest)
				{
					oVals[0] = 'Inbox';
				}

				return [decodeURI(oVals[0]), 1, decodeURI(oVals[1]), false];
			}
		;

		return [
			[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
			[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)$/, {'normalize_': fNormS}],
			[/^([a-zA-Z0-9]+)\/(.+)\/?$/, {'normalize_': fNormD}],
			[/^message-preview$/,  {'normalize_': fNormP}],
			[/^([^\/]*)$/,  {'normalize_': fNormS}]
		];
	};

	module.exports = MailBoxScreen;

}(module, require));
},{"App:RainLoop":3,"Enums":7,"Events":8,"Globals":9,"Knoin:AbstractScreen":29,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:RainLoop:MailBoxFolderList":73,"View:RainLoop:MailBoxMessageList":74,"View:RainLoop:MailBoxMessageView":75,"View:RainLoop:MailBoxSystemDropDown":76,"_":25}],48:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		Globals = require('Globals'),

		AbstractSettingsScreen = require('Screen:AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettingsScreen
	 */
	function SettingsScreen()
	{
		AbstractSettingsScreen.call(this, [
			require('View:RainLoop:SettingsSystemDropDown'),
			require('View:RainLoop:SettingsMenu'),
			require('View:RainLoop:SettingsPane')
		]);

		Utils.initOnStartOrLangChange(function () {
			this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
		}, this, function () {
			this.setSettingsTitle();
		});
	}

	_.extend(SettingsScreen.prototype, AbstractSettingsScreen.prototype);

	SettingsScreen.prototype.onShow = function ()
	{
		this.setSettingsTitle();
		Globals.keyScope(Enums.KeyState.Settings);
	};

	SettingsScreen.prototype.setSettingsTitle = function ()
	{
		require('App:RainLoop').setTitle(this.sSettingsTitle);
	};

	module.exports = SettingsScreen;

}(module, require));
},{"App:RainLoop":3,"Enums":7,"Globals":9,"Screen:AbstractSettings":45,"Utils":14,"View:RainLoop:SettingsMenu":94,"View:RainLoop:SettingsPane":95,"View:RainLoop:SettingsSystemDropDown":96,"_":25}],49:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsAccounts()
	{
		this.accounts = Data.accounts;

		this.processText = ko.computed(function () {
			return Data.accountsLoading() ? Utils.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.accountForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
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
	}

	SettingsAccounts.prototype.addNewAccount = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:AddAccount'));
	};

	/**
	 * @param {AccountModel} oAccountToRemove
	 */
	SettingsAccounts.prototype.deleteAccount = function (oAccountToRemove)
	{
		if (oAccountToRemove && oAccountToRemove.deleteAccess())
		{
			this.accountForDeletion(null);

			var
				kn = require('App:Knoin'),
				fRemoveAccount = function (oAccount) {
					return oAccountToRemove === oAccount;
				}
			;

			if (oAccountToRemove)
			{
				this.accounts.remove(fRemoveAccount);

				Remote.accountDelete(function (sResult, oData) {

					if (Enums.StorageResultType.Success === sResult && oData &&
						oData.Result && oData.Reload)
					{
						kn.routeOff();
						kn.setHash(LinkBuilder.root(), true);
						kn.routeOff();

						_.defer(function () {
							window.location.reload();
						});
					}
					else
					{
						require('App:RainLoop').accountsAndIdentities();
					}

				}, oAccountToRemove.email);
			}
		}
	};

	module.exports = SettingsAccounts;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"LinkBuilder":11,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"View:Popup:AddAccount":77,"_":25,"ko":22,"window":26}],50:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsChangePassword()
	{
		this.changeProcess = ko.observable(false);

		this.errorDescription = ko.observable('');
		this.passwordMismatch = ko.observable(false);
		this.passwordUpdateError = ko.observable(false);
		this.passwordUpdateSuccess = ko.observable(false);

		this.currentPassword = ko.observable('');
		this.currentPassword.error = ko.observable(false);
		this.newPassword = ko.observable('');
		this.newPassword2 = ko.observable('');

		this.currentPassword.subscribe(function () {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.currentPassword.error(false);
		}, this);

		this.newPassword.subscribe(function () {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.passwordMismatch(false);
		}, this);

		this.newPassword2.subscribe(function () {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.passwordMismatch(false);
		}, this);

		this.saveNewPasswordCommand = Utils.createCommand(this, function () {

			if (this.newPassword() !== this.newPassword2())
			{
				this.passwordMismatch(true);
				this.errorDescription(Utils.i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
			}
			else
			{
				this.changeProcess(true);

				this.passwordUpdateError(false);
				this.passwordUpdateSuccess(false);
				this.currentPassword.error(false);
				this.passwordMismatch(false);
				this.errorDescription('');

				Remote.changePassword(this.onChangePasswordResponse, this.currentPassword(), this.newPassword());
			}

		}, function () {
			return !this.changeProcess() && '' !== this.currentPassword() &&
				'' !== this.newPassword() && '' !== this.newPassword2();
		});

		this.onChangePasswordResponse = _.bind(this.onChangePasswordResponse, this);
	}

	SettingsChangePassword.prototype.onHide = function ()
	{
		this.changeProcess(false);
		this.currentPassword('');
		this.newPassword('');
		this.newPassword2('');
		this.errorDescription('');
		this.passwordMismatch(false);
		this.currentPassword.error(false);
	};

	SettingsChangePassword.prototype.onChangePasswordResponse = function (sResult, oData)
	{
		this.changeProcess(false);
		this.passwordMismatch(false);
		this.errorDescription('');
		this.currentPassword.error(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');

			this.passwordUpdateSuccess(true);
			this.currentPassword.error(false);
		}
		else
		{
			if (oData && Enums.Notification.CurrentPasswordIncorrect === oData.ErrorCode)
			{
				this.currentPassword.error(true);
			}

			this.passwordUpdateError(true);
			this.errorDescription(oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) :
				Utils.getNotification(Enums.Notification.CouldNotSaveNewPassword));
		}
	};

	module.exports = SettingsChangePassword;

}(module, require));
},{"Enums":7,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],51:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote'),
		Data = require('Storage:RainLoop:Data')
	;

	/**
	 * @constructor
	 */
	function SettingsContacts()
	{
		this.contactsAutosave = Data.contactsAutosave;

		this.allowContactsSync = Data.allowContactsSync;
		this.enableContactsSync = Data.enableContactsSync;
		this.contactsSyncUrl = Data.contactsSyncUrl;
		this.contactsSyncUser = Data.contactsSyncUser;
		this.contactsSyncPass = Data.contactsSyncPass;

		this.saveTrigger = ko.computed(function () {
			return [
				this.enableContactsSync() ? '1' : '0',
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			].join('|');
		}, this).extend({'throttle': 500});

		this.saveTrigger.subscribe(function () {
			Remote.saveContactsSyncData(null,
				this.enableContactsSync(),
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			);
		}, this);
	}

	SettingsContacts.prototype.onBuild = function ()
	{
		Data.contactsAutosave.subscribe(function (bValue) {
			Remote.saveSettings(Utils.emptyFunction, {
				'ContactsAutosave': bValue ? '1' : '0'
			});
		});
	};

	module.exports = SettingsContacts;

}(module, require));
},{"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"ko":22}],52:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function SettingsFilters()
	{
		this.filters = ko.observableArray([]);
		this.filters.loading = ko.observable(false);

		this.filters.subscribe(function () {
			Utils.windowResize();
		});
	}

	SettingsFilters.prototype.deleteFilter = function (oFilter)
	{
		this.filters.remove(oFilter);
	};

	SettingsFilters.prototype.addFilter = function ()
	{
		var
			FilterModel = require('Model:Filter')
		;

		require('App:Knoin').showScreenPopup(
			require('View:Popup:Filter'), [new FilterModel()]);
	};

	module.exports = SettingsFilters;

}(module, require));
},{"App:Knoin":27,"Model:Filter":39,"Utils":14,"View:Popup:Filter":84,"ko":22}],53:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings'),
		LocalStorage = require('Storage:LocalStorage'),
		Data = require('Storage:RainLoop:Data'),
		Cache = require('Storage:RainLoop:Cache'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsFolders()
	{
		this.foldersListError = Data.foldersListError;
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
				return Utils.i18n('SETTINGS_FOLDERS/CREATING_PROCESS');
			}
			else if (bDeleting)
			{
				return Utils.i18n('SETTINGS_FOLDERS/DELETING_PROCESS');
			}
			else if (bRenaming)
			{
				return Utils.i18n('SETTINGS_FOLDERS/RENAMING_PROCESS');
			}
			else if (bLoading)
			{
				return Utils.i18n('SETTINGS_FOLDERS/LOADING_PROCESS');
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

	SettingsFolders.prototype.folderEditOnEnter = function (oFolder)
	{
		var
			sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : ''
		;

		if ('' !== sEditName && oFolder.name() !== sEditName)
		{
			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

			Data.foldersRenaming(true);
			Remote.folderRename(function (sResult, oData) {

				Data.foldersRenaming(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					Data.foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
				}

				require('App:RainLoop').folders();

			}, oFolder.fullNameRaw, sEditName);

			Cache.removeFolderFromCacheList(oFolder.fullNameRaw);

			oFolder.name(sEditName);
		}

		oFolder.edited(false);
	};

	SettingsFolders.prototype.folderEditOnEsc = function (oFolder)
	{
		if (oFolder)
		{
			oFolder.edited(false);
		}
	};

	SettingsFolders.prototype.onShow = function ()
	{
		Data.foldersListError('');
	};

	SettingsFolders.prototype.createFolder = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:FolderCreate'));
	};

	SettingsFolders.prototype.systemFolder = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:FolderSystem'));
	};

	SettingsFolders.prototype.deleteFolder = function (oFolderToRemove)
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
				LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

				Data.folderList.remove(fRemoveFolder);

				Data.foldersDeleting(true);
				Remote.folderDelete(function (sResult, oData) {

					Data.foldersDeleting(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						Data.foldersListError(
							oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
					}

					require('App:RainLoop').folders();

				}, oFolderToRemove.fullNameRaw);

				Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
			}
		}
		else if (0 < oFolderToRemove.privateMessageCountAll())
		{
			Data.foldersListError(Utils.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
		}
	};

	SettingsFolders.prototype.subscribeFolder = function (oFolder)
	{
		LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, true);

		oFolder.subScribed(true);
	};

	SettingsFolders.prototype.unSubscribeFolder = function (oFolder)
	{
		LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, false);

		oFolder.subScribed(false);
	};

	module.exports = SettingsFolders;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Storage:LocalStorage":65,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:Popup:FolderCreate":86,"View:Popup:FolderSystem":87,"ko":22}],54:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsGeneral()
	{
		this.mainLanguage = Data.mainLanguage;
		this.mainMessagesPerPage = Data.mainMessagesPerPage;
		this.mainMessagesPerPageArray = Consts.Defaults.MessagesPerPageArray;
		this.editorDefaultType = Data.editorDefaultType;
		this.showImages = Data.showImages;
		this.interfaceAnimation = Data.interfaceAnimation;
		this.useDesktopNotifications = Data.useDesktopNotifications;
		this.threading = Data.threading;
		this.useThreads = Data.useThreads;
		this.replySameFolder = Data.replySameFolder;
		this.layout = Data.layout;
		this.usePreviewPane = Data.usePreviewPane;
		this.useCheckboxesInList = Data.useCheckboxesInList;
		this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;

		this.isDesktopNotificationsSupported = ko.computed(function () {
			return Enums.DesktopNotifications.NotSupported !== Data.desktopNotificationsPermisions();
		});

		this.isDesktopNotificationsDenied = ko.computed(function () {
			return Enums.DesktopNotifications.NotSupported === Data.desktopNotificationsPermisions() ||
				Enums.DesktopNotifications.Denied === Data.desktopNotificationsPermisions();
		});

		this.mainLanguageFullName = ko.computed(function () {
			return Utils.convertLangName(this.mainLanguage());
		}, this);

		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});
		this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.isAnimationSupported = Globals.bAnimationSupported;
	}

	SettingsGeneral.prototype.toggleLayout = function ()
	{
		this.layout(Enums.Layout.NoPreview === this.layout() ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
	};

	SettingsGeneral.prototype.onBuild = function ()
	{
		var self = this;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self)
			;

			Data.language.subscribe(function (sValue) {

				self.languageTrigger(Enums.SaveSettingsStep.Animate);

				$.ajax({
					'url': LinkBuilder.langLink(sValue),
					'dataType': 'script',
					'cache': true
				}).done(function() {
					Utils.i18nReload();
					self.languageTrigger(Enums.SaveSettingsStep.TrueResult);
				}).fail(function() {
					self.languageTrigger(Enums.SaveSettingsStep.FalseResult);
				}).always(function() {
					_.delay(function () {
						self.languageTrigger(Enums.SaveSettingsStep.Idle);
					}, 1000);
				});

				Remote.saveSettings(Utils.emptyFunction, {
					'Language': sValue
				});
			});

			Data.editorDefaultType.subscribe(function (sValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'EditorDefaultType': sValue
				});
			});

			Data.messagesPerPage.subscribe(function (iValue) {
				Remote.saveSettings(f1, {
					'MPP': iValue
				});
			});

			Data.showImages.subscribe(function (bValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'ShowImages': bValue ? '1' : '0'
				});
			});

			Data.interfaceAnimation.subscribe(function (sValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'InterfaceAnimation': sValue
				});
			});

			Data.useDesktopNotifications.subscribe(function (bValue) {
				Utils.timeOutAction('SaveDesktopNotifications', function () {
					Remote.saveSettings(Utils.emptyFunction, {
						'DesktopNotifications': bValue ? '1' : '0'
					});
				}, 3000);
			});

			Data.replySameFolder.subscribe(function (bValue) {
				Utils.timeOutAction('SaveReplySameFolder', function () {
					Remote.saveSettings(Utils.emptyFunction, {
						'ReplySameFolder': bValue ? '1' : '0'
					});
				}, 3000);
			});

			Data.useThreads.subscribe(function (bValue) {

				Data.messageList([]);

				Remote.saveSettings(Utils.emptyFunction, {
					'UseThreads': bValue ? '1' : '0'
				});
			});

			Data.layout.subscribe(function (nValue) {

				Data.messageList([]);

				Remote.saveSettings(Utils.emptyFunction, {
					'Layout': nValue
				});
			});

			Data.useCheckboxesInList.subscribe(function (bValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'UseCheckboxesInList': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	SettingsGeneral.prototype.onShow = function ()
	{
		Data.desktopNotifications.valueHasMutated();
	};

	SettingsGeneral.prototype.selectLanguage = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:Languages'));
	};

	module.exports = SettingsGeneral;

}(module, require));
},{"$":20,"App:Knoin":27,"Consts":6,"Enums":7,"Globals":9,"LinkBuilder":11,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"View:Popup:Languages":90,"_":25,"ko":22}],55:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		HtmlEditor = require('HtmlEditor'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsIdentities()
	{
		this.editor = null;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		this.accountEmail = Data.accountEmail;
		this.displayName = Data.displayName;
		this.signature = Data.signature;
		this.signatureToAll = Data.signatureToAll;
		this.replyTo = Data.replyTo;

		this.signatureDom = ko.observable(null);

		this.defaultIdentityIDTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.identities = Data.identities;
		this.defaultIdentityID = Data.defaultIdentityID;

		this.identitiesOptions = ko.computed(function () {

			var
				aList = this.identities(),
				aResult = []
			;

			if (0 < aList.length)
			{
				aResult.push({
					'id': this.accountEmail.peek(),
					'name': this.formattedAccountIdentity(),
					'seporator': false
				});

				aResult.push({
					'id': '---',
					'name': '---',
					'seporator': true,
					'disabled': true
				});

				_.each(aList, function (oItem) {
					aResult.push({
						'id': oItem.id,
						'name': oItem.formattedNameForEmail(),
						'seporator': false
					});
				});
			}

			return aResult;
		}, this);

		this.processText = ko.computed(function () {
			return Data.identitiesLoading() ? Utils.i18n('SETTINGS_IDENTITIES/LOADING_PROCESS') : '';
		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.identityForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
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
	}

	/**
	 *
	 * @return {string}
	 */
	SettingsIdentities.prototype.formattedAccountIdentity = function ()
	{
		var
			sDisplayName = this.displayName.peek(),
			sEmail = this.accountEmail.peek()
		;

		return '' === sDisplayName ? sEmail : '"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>';
	};

	SettingsIdentities.prototype.addNewIdentity = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:Identity'));
	};

	SettingsIdentities.prototype.editIdentity = function (oIdentity)
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:Identity'), [oIdentity]);
	};

	/**
	 * @param {IdentityModel} oIdentityToRemove
	 */
	SettingsIdentities.prototype.deleteIdentity = function (oIdentityToRemove)
	{
		if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
		{
			this.identityForDeletion(null);

			var
				fRemoveFolder = function (oIdentity) {
					return oIdentityToRemove === oIdentity;
				}
			;

			if (oIdentityToRemove)
			{
				this.identities.remove(fRemoveFolder);

				Remote.identityDelete(function () {
					require('App:RainLoop').accountsAndIdentities();
				}, oIdentityToRemove.id);
			}
		}
	};

	SettingsIdentities.prototype.onFocus = function ()
	{
		if (!this.editor && this.signatureDom())
		{
			var
				self = this,
				sSignature = Data.signature()
			;

			this.editor = new HtmlEditor(self.signatureDom(), function () {
				Data.signature(
					(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
				);
			}, function () {
				if (':HTML:' === sSignature.substr(0, 6))
				{
					self.editor.setHtml(sSignature.substr(6), false);
				}
				else
				{
					self.editor.setPlain(sSignature, false);
				}
			});
		}
	};

	SettingsIdentities.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.identity-item .e-action', function () {
				var oIdentityItem = ko.dataFor(this);
				if (oIdentityItem)
				{
					self.editIdentity(oIdentityItem);
				}
			})
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.defaultIdentityIDTrigger, self)
			;

			Data.defaultIdentityID.subscribe(function (sValue) {
				Remote.saveSettings(f4, {
					'DefaultIdentityID': sValue
				});
			});

			Data.displayName.subscribe(function (sValue) {
				Remote.saveSettings(f1, {
					'DisplayName': sValue
				});
			});

			Data.replyTo.subscribe(function (sValue) {
				Remote.saveSettings(f2, {
					'ReplyTo': sValue
				});
			});

			Data.signature.subscribe(function (sValue) {
				Remote.saveSettings(f3, {
					'Signature': sValue
				});
			});

			Data.signatureToAll.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'SignatureToAll': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	module.exports = SettingsIdentities;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"HtmlEditor":10,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"View:Popup:Identity":88,"_":25,"ko":22}],56:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		HtmlEditor = require('HtmlEditor'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsIdentity()
	{
		this.editor = null;

		this.displayName = Data.displayName;
		this.signature = Data.signature;
		this.signatureToAll = Data.signatureToAll;
		this.replyTo = Data.replyTo;

		this.signatureDom = ko.observable(null);

		this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	SettingsIdentity.prototype.onFocus = function ()
	{
		if (!this.editor && this.signatureDom())
		{
			var
				self = this,
				sSignature = Data.signature()
			;

			this.editor = new HtmlEditor(self.signatureDom(), function () {
				Data.signature(
					(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
				);
			}, function () {
				if (':HTML:' === sSignature.substr(0, 6))
				{
					self.editor.setHtml(sSignature.substr(6), false);
				}
				else
				{
					self.editor.setPlain(sSignature, false);
				}
			});
		}
	};

	SettingsIdentity.prototype.onBuild = function ()
	{
		var self = this;
		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
			;

			Data.displayName.subscribe(function (sValue) {
				Remote.saveSettings(f1, {
					'DisplayName': sValue
				});
			});

			Data.replyTo.subscribe(function (sValue) {
				Remote.saveSettings(f2, {
					'ReplyTo': sValue
				});
			});

			Data.signature.subscribe(function (sValue) {
				Remote.saveSettings(f3, {
					'Signature': sValue
				});
			});

			Data.signatureToAll.subscribe(function (bValue) {
				Remote.saveSettings(null, {
					'SignatureToAll': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	module.exports = SettingsIdentity;

}(module, require));
},{"Enums":7,"HtmlEditor":10,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],57:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		kn = require('App:Knoin'),

		Data = require('Storage:RainLoop:Data')
	;

	/**
	 * @constructor
	 */
	function SettingsOpenPGP()
	{
		this.openpgpkeys = Data.openpgpkeys;
		this.openpgpkeysPublic = Data.openpgpkeysPublic;
		this.openpgpkeysPrivate = Data.openpgpkeysPrivate;

		this.openPgpKeyForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
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
	}

	SettingsOpenPGP.prototype.addOpenPgpKey = function ()
	{
		kn.showScreenPopup(require('View:Popup:AddOpenPgpKey'));
	};

	SettingsOpenPGP.prototype.generateOpenPgpKey = function ()
	{
		kn.showScreenPopup(require('View:Popup:NewOpenPgpKey'));
	};

	SettingsOpenPGP.prototype.viewOpenPgpKey = function (oOpenPgpKey)
	{
		if (oOpenPgpKey)
		{
			kn.showScreenPopup(require('View:Popup:ViewOpenPgpKey'), [oOpenPgpKey]);
		}
	};

	/**
	 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
	 */
	SettingsOpenPGP.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
	{
		if (oOpenPgpKeyToRemove && oOpenPgpKeyToRemove.deleteAccess())
		{
			this.openPgpKeyForDeletion(null);

			if (oOpenPgpKeyToRemove && Data.openpgpKeyring)
			{
				this.openpgpkeys.remove(function (oOpenPgpKey) {
					return oOpenPgpKeyToRemove === oOpenPgpKey;
				});

				Data.openpgpKeyring[oOpenPgpKeyToRemove.isPrivate ? 'privateKeys' : 'publicKeys']
					.removeForId(oOpenPgpKeyToRemove.guid);

				Data.openpgpKeyring.store();

				require('App:RainLoop').reloadOpenPgpKeys();
			}
		}
	};

	module.exports = SettingsOpenPGP;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Storage:RainLoop:Data":64,"View:Popup:AddOpenPgpKey":78,"View:Popup:NewOpenPgpKey":91,"View:Popup:ViewOpenPgpKey":93,"ko":22}],58:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsSecurity()
	{
		this.processing = ko.observable(false);
		this.clearing = ko.observable(false);
		this.secreting = ko.observable(false);

		this.viewUser = ko.observable('');
		this.viewEnable = ko.observable(false);
		this.viewEnable.subs = true;
		this.twoFactorStatus = ko.observable(false);

		this.viewSecret = ko.observable('');
		this.viewBackupCodes = ko.observable('');
		this.viewUrl = ko.observable('');

		this.bFirst = true;

		this.viewTwoFactorStatus = ko.computed(function () {
			Globals.langChangeTrigger();
			return Utils.i18n(
				this.twoFactorStatus() ?
					'SETTINGS_SECURITY/TWO_FACTOR_SECRET_CONFIGURED_DESC' :
					'SETTINGS_SECURITY/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
			);
		}, this);

		this.onResult = _.bind(this.onResult, this);
		this.onSecretResult = _.bind(this.onSecretResult, this);
	}

	SettingsSecurity.prototype.showSecret = function ()
	{
		this.secreting(true);
		Remote.showTwoFactorSecret(this.onSecretResult);
	};

	SettingsSecurity.prototype.hideSecret = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	};

	SettingsSecurity.prototype.createTwoFactor = function ()
	{
		this.processing(true);
		Remote.createTwoFactor(this.onResult);
	};

	SettingsSecurity.prototype.enableTwoFactor = function ()
	{
		this.processing(true);
		Remote.enableTwoFactor(this.onResult, this.viewEnable());
	};

	SettingsSecurity.prototype.testTwoFactor = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:TwoFactorTest'));
	};

	SettingsSecurity.prototype.clearTwoFactor = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');

		this.clearing(true);
		Remote.clearTwoFactor(this.onResult);
	};

	SettingsSecurity.prototype.onShow = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	};

	SettingsSecurity.prototype.onResult = function (sResult, oData)
	{
		this.processing(false);
		this.clearing(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.viewUser(Utils.pString(oData.Result.User));
			this.viewEnable(!!oData.Result.Enable);
			this.twoFactorStatus(!!oData.Result.IsSet);

			this.viewSecret(Utils.pString(oData.Result.Secret));
			this.viewBackupCodes(Utils.pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));
			this.viewUrl(Utils.pString(oData.Result.Url));
		}
		else
		{
			this.viewUser('');
			this.viewEnable(false);
			this.twoFactorStatus(false);

			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrl('');
		}

		if (this.bFirst)
		{
			this.bFirst = false;
			var self = this;
			this.viewEnable.subscribe(function (bValue) {
				if (this.viewEnable.subs)
				{
					Remote.enableTwoFactor(function (sResult, oData) {
						if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
						{
							self.viewEnable.subs = false;
							self.viewEnable(false);
							self.viewEnable.subs = true;
						}
					}, bValue);
				}
			}, this);
		}
	};

	SettingsSecurity.prototype.onSecretResult = function (sResult, oData)
	{
		this.secreting(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.viewSecret(Utils.pString(oData.Result.Secret));
			this.viewUrl(Utils.pString(oData.Result.Url));
		}
		else
		{
			this.viewSecret('');
			this.viewUrl('');
		}
	};

	SettingsSecurity.prototype.onBuild = function ()
	{
		this.processing(true);
		Remote.getTwoFactor(this.onResult);
	};

	module.exports = SettingsSecurity;

}(module, require));
},{"App:Knoin":27,"Enums":7,"Globals":9,"Storage:RainLoop:Remote":68,"Utils":14,"View:Popup:TwoFactorTest":92,"ko":22}],59:[function(require,module,exports){

(function (module, require) {

	'use strict';

	/**
	 * @constructor
	 */
	function SettingsSocial()
	{
		var
			Utils = require('Utils'),
			Data = require('Storage:RainLoop:Data')
		;

		this.googleEnable = Data.googleEnable;

		this.googleActions = Data.googleActions;
		this.googleLoggined = Data.googleLoggined;
		this.googleUserName = Data.googleUserName;

		this.facebookEnable = Data.facebookEnable;

		this.facebookActions = Data.facebookActions;
		this.facebookLoggined = Data.facebookLoggined;
		this.facebookUserName = Data.facebookUserName;

		this.twitterEnable = Data.twitterEnable;

		this.twitterActions = Data.twitterActions;
		this.twitterLoggined = Data.twitterLoggined;
		this.twitterUserName = Data.twitterUserName;

		this.connectGoogle = Utils.createCommand(this, function () {
			if (!this.googleLoggined())
			{
				require('App:RainLoop').googleConnect();
			}
		}, function () {
			return !this.googleLoggined() && !this.googleActions();
		});

		this.disconnectGoogle = Utils.createCommand(this, function () {
			require('App:RainLoop').googleDisconnect();
		});

		this.connectFacebook = Utils.createCommand(this, function () {
			if (!this.facebookLoggined())
			{
				require('App:RainLoop').facebookConnect();
			}
		}, function () {
			return !this.facebookLoggined() && !this.facebookActions();
		});

		this.disconnectFacebook = Utils.createCommand(this, function () {
			require('App:RainLoop').facebookDisconnect();
		});

		this.connectTwitter = Utils.createCommand(this, function () {
			if (!this.twitterLoggined())
			{
				require('App:RainLoop').twitterConnect();
			}
		}, function () {
			return !this.twitterLoggined() && !this.twitterActions();
		});

		this.disconnectTwitter = Utils.createCommand(this, function () {
			require('App:RainLoop').twitterDisconnect();
		});
	}

	module.exports = SettingsSocial;

}(module, require));
},{"App:RainLoop":3,"Storage:RainLoop:Data":64,"Utils":14}],60:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsThemes()
	{
		var self = this;

		this.mainTheme = Data.mainTheme;
		this.themesObjects = ko.observableArray([]);

		this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

		this.oLastAjax = null;
		this.iTimer = 0;

		Data.theme.subscribe(function (sValue) {

			_.each(this.themesObjects(), function (oTheme) {
				oTheme.selected(sValue === oTheme.name);
			});

			var
				oThemeLink = $('#rlThemeLink'),
				oThemeStyle = $('#rlThemeStyle'),
				sUrl = oThemeLink.attr('href')
			;

			if (!sUrl)
			{
				sUrl = oThemeStyle.attr('data-href');
			}

			if (sUrl)
			{
				sUrl = sUrl.toString().replace(/\/-\/[^\/]+\/\-\//, '/-/' + sValue + '/-/');
				sUrl = sUrl.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/0/User/');

				if ('Json/' !== sUrl.substring(sUrl.length - 5, sUrl.length))
				{
					sUrl += 'Json/';
				}

				window.clearTimeout(self.iTimer);
				self.themeTrigger(Enums.SaveSettingsStep.Animate);

				if (this.oLastAjax && this.oLastAjax.abort)
				{
					this.oLastAjax.abort();
				}

				this.oLastAjax = $.ajax({
					'url': sUrl,
					'dataType': 'json'
				}).done(function(aData) {

					if (aData && Utils.isArray(aData) && 2 === aData.length)
					{
						if (oThemeLink && oThemeLink[0] && (!oThemeStyle || !oThemeStyle[0]))
						{
							oThemeStyle = $('<style id="rlThemeStyle"></style>');
							oThemeLink.after(oThemeStyle);
							oThemeLink.remove();
						}

						if (oThemeStyle && oThemeStyle[0])
						{
							oThemeStyle.attr('data-href', sUrl).attr('data-theme', aData[0]);
							if (oThemeStyle && oThemeStyle[0] && oThemeStyle[0].styleSheet && !Utils.isUnd(oThemeStyle[0].styleSheet.cssText))
							{
								oThemeStyle[0].styleSheet.cssText = aData[1];
							}
							else
							{
								oThemeStyle.text(aData[1]);
							}
						}

						self.themeTrigger(Enums.SaveSettingsStep.TrueResult);
					}

				}).always(function() {

					self.iTimer = window.setTimeout(function () {
						self.themeTrigger(Enums.SaveSettingsStep.Idle);
					}, 1000);

					self.oLastAjax = null;
				});
			}

			Remote.saveSettings(null, {
				'Theme': sValue
			});

		}, this);
	}

	SettingsThemes.prototype.onBuild = function ()
	{
		var sCurrentTheme = Data.theme();
		this.themesObjects(_.map(Data.themes(), function (sTheme) {
			return {
				'name': sTheme,
				'nameDisplay': Utils.convertThemeName(sTheme),
				'selected': ko.observable(sTheme === sCurrentTheme),
				'themePreviewSrc': LinkBuilder.themePreviewLink(sTheme)
			};
		}));
	};

	module.exports = SettingsThemes;

}(module, require));
},{"$":20,"Enums":7,"LinkBuilder":11,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22,"window":26}],61:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings')
	;

	/**
	 * @constructor
	 */
	function AbstractData()
	{
		Utils.initDataConstructorBySettings(this);
	}

	AbstractData.prototype.populateDataOnStart = function()
	{
		var
			mLayout = Utils.pInt(Settings.settingsGet('Layout')),
			aLanguages = Settings.settingsGet('Languages'),
			aThemes = Settings.settingsGet('Themes')
		;

		if (Utils.isArray(aLanguages))
		{
			this.languages(aLanguages);
		}

		if (Utils.isArray(aThemes))
		{
			this.themes(aThemes);
		}

		this.mainLanguage(Settings.settingsGet('Language'));
		this.mainTheme(Settings.settingsGet('Theme'));

		this.capaAdditionalAccounts(Settings.capa(Enums.Capa.AdditionalAccounts));
		this.capaAdditionalIdentities(Settings.capa(Enums.Capa.AdditionalIdentities));
		this.capaGravatar(Settings.capa(Enums.Capa.Gravatar));
		this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

		this.capaThemes(Settings.capa(Enums.Capa.Themes));
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));

		this.editorDefaultType(Settings.settingsGet('EditorDefaultType'));
		this.showImages(!!Settings.settingsGet('ShowImages'));
		this.contactsAutosave(!!Settings.settingsGet('ContactsAutosave'));
		this.interfaceAnimation(Settings.settingsGet('InterfaceAnimation'));

		this.mainMessagesPerPage(Settings.settingsGet('MPP'));

		this.desktopNotifications(!!Settings.settingsGet('DesktopNotifications'));
		this.useThreads(!!Settings.settingsGet('UseThreads'));
		this.replySameFolder(!!Settings.settingsGet('ReplySameFolder'));
		this.useCheckboxesInList(!!Settings.settingsGet('UseCheckboxesInList'));

		this.layout(Enums.Layout.SidePreview);
		if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
		{
			this.layout(mLayout);
		}
		this.facebookSupported(!!Settings.settingsGet('SupportedFacebookSocial'));
		this.facebookEnable(!!Settings.settingsGet('AllowFacebookSocial'));
		this.facebookAppID(Settings.settingsGet('FacebookAppID'));
		this.facebookAppSecret(Settings.settingsGet('FacebookAppSecret'));

		this.twitterEnable(!!Settings.settingsGet('AllowTwitterSocial'));
		this.twitterConsumerKey(Settings.settingsGet('TwitterConsumerKey'));
		this.twitterConsumerSecret(Settings.settingsGet('TwitterConsumerSecret'));

		this.googleEnable(!!Settings.settingsGet('AllowGoogleSocial'));
		this.googleClientID(Settings.settingsGet('GoogleClientID'));
		this.googleClientSecret(Settings.settingsGet('GoogleClientSecret'));
		this.googleApiKey(Settings.settingsGet('GoogleApiKey'));

		this.dropboxEnable(!!Settings.settingsGet('AllowDropboxSocial'));
		this.dropboxApiKey(Settings.settingsGet('DropboxApiKey'));

		this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));
	};

	module.exports = AbstractData;

}(module, require));
},{"Enums":7,"Storage:Settings":69,"Utils":14}],62:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),

		Consts = require('Consts'),
		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Plugins = require('Plugins'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings')
	;

	/**
	* @constructor
	*/
   function AbstractRemoteStorage()
   {
	   this.oRequests = {};
   }

   AbstractRemoteStorage.prototype.oRequests = {};

   /**
	* @param {?Function} fCallback
	* @param {string} sRequestAction
	* @param {string} sType
	* @param {?AjaxJsonDefaultResponse} oData
	* @param {boolean} bCached
	* @param {*=} oRequestParameters
	*/
   AbstractRemoteStorage.prototype.defaultResponse = function (fCallback, sRequestAction, sType, oData, bCached, oRequestParameters)
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
					   if (Globals.__APP)
					   {
							Globals.__APP.loginAndLogoutReload(true);
					   }
				   }

				   if (oData.Logout || Consts.Values.AjaxErrorLimit < Globals.iAjaxErrorCount)
				   {
					   if (window.__rlah_clear)
					   {
						   window.__rlah_clear();
					   }

					   if (Globals.__APP)
					   {
							Globals.__APP.loginAndLogoutReload(true);
					   }
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
   AbstractRemoteStorage.prototype.ajaxRequest = function (fResultCallback, oParameters, iTimeOut, sGetAdd, aAbortActions)
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
		   oParameters['XToken'] = Settings.settingsGet('Token');
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
   AbstractRemoteStorage.prototype.defaultRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
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
   AbstractRemoteStorage.prototype.noop = function (fCallback)
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
   AbstractRemoteStorage.prototype.jsError = function (fCallback, sMessage, sFileName, iLineNo, sLocation, sHtmlCapa, iTime)
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
   AbstractRemoteStorage.prototype.jsInfo = function (fCallback, sType, mData, bIsError)
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
   AbstractRemoteStorage.prototype.getPublicKey = function (fCallback)
   {
	   this.defaultRequest(fCallback, 'GetPublicKey');
   };

   /**
	* @param {?Function} fCallback
	* @param {string} sVersion
	*/
   AbstractRemoteStorage.prototype.jsVersion = function (fCallback, sVersion)
   {
	   this.defaultRequest(fCallback, 'Version', {
		   'Version': sVersion
	   });
   };

	module.exports = AbstractRemoteStorage;

}(module, require));
},{"$":20,"Consts":6,"Enums":7,"Globals":9,"LinkBuilder":11,"Plugins":12,"Storage:Settings":69,"Utils":14,"_":25,"window":26}],63:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings')
	;

	/**
	 * @constructor
	 */
	function CacheStorage()
	{
		this.oFoldersCache = {};
		this.oFoldersNamesCache = {};
		this.oFolderHashCache = {};
		this.oFolderUidNextCache = {};
		this.oMessageListHashCache = {};
		this.oMessageFlagsCache = {};
		this.oNewMessage = {};
		this.oRequestedMessage = {};

		this.bCapaGravatar = Settings.capa(Enums.Capa.Gravatar);
	}

	/**
	 * @type {boolean}
	 */
	CacheStorage.prototype.bCapaGravatar = false;

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFoldersCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFoldersNamesCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFolderHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oFolderUidNextCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oMessageListHashCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oMessageFlagsCache = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oBodies = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oNewMessage = {};

	/**
	 * @type {Object}
	 */
	CacheStorage.prototype.oRequestedMessage = {};

	CacheStorage.prototype.clear = function ()
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
	CacheStorage.prototype.getUserPic = function (sEmail, fCallback)
	{
		sEmail = Utils.trim(sEmail);
		fCallback(this.bCapaGravatar && '' !== sEmail ? LinkBuilder.avatarLink(sEmail) : '', sEmail);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 * @return {string}
	 */
	CacheStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
	{
		return sFolderFullNameRaw + '#' + sUid;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 */
	CacheStorage.prototype.addRequestedMessage = function (sFolder, sUid)
	{
		this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
	};

	/**
	 * @param {string} sFolder
	 * @param {string} sUid
	 * @return {boolean}
	 */
	CacheStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
	{
		return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUid
	 */
	CacheStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
	{
		if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
		{
			this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
			return true;
		}

		return false;
	};

	CacheStorage.prototype.clearNewMessageCache = function ()
	{
		this.oNewMessage = {};
	};

	/**
	 * @param {string} sFolderHash
	 * @return {string}
	 */
	CacheStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
	{
		return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
	};

	/**
	 * @param {string} sFolderHash
	 * @param {string} sFolderFullNameRaw
	 */
	CacheStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
	{
		this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sFolderHash
	 */
	CacheStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
	{
		this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {string}
	 */
	CacheStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string} sUidNext
	 */
	CacheStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
	{
		this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @return {?FolderModel}
	 */
	CacheStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
	{
		return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {?FolderModel} oFolder
	 */
	CacheStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
	{
		this.oFoldersCache[sFolderFullNameRaw] = oFolder;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 */
	CacheStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
	{
		this.setFolderToCacheList(sFolderFullNameRaw, null);
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @return {?Array}
	 */
	CacheStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
	{
		return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
			this.oMessageFlagsCache[sFolderFullName][sUid] : null;
	};

	/**
	 * @param {string} sFolderFullName
	 * @param {string} sUid
	 * @param {Array} aFlagsCache
	 */
	CacheStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
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
	CacheStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
	{
		this.oMessageFlagsCache[sFolderFullName] = {};
	};

	/**
	 * @param {(MessageModel|null)} oMessage
	 */
	CacheStorage.prototype.initMessageFlagsFromCache = function (oMessage)
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
	CacheStorage.prototype.storeMessageFlagsToCache = function (oMessage)
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
	CacheStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
	{
		if (Utils.isArray(aFlags) && 0 < aFlags.length)
		{
			this.setMessageFlagsToCache(sFolder, sUid, aFlags);
		}
	};

	module.exports = new CacheStorage();

}(module, require));
},{"Enums":7,"LinkBuilder":11,"Storage:Settings":69,"Utils":14,"_":25}],64:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		moment = require('moment'),

		Consts = require('Consts'),
		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Cache = require('Storage:RainLoop:Cache'),

		kn = require('App:Knoin'),

		MessageModel = require('Model:Message'),

		LocalStorage = require('Storage:LocalStorage'),
		AbstractData = require('Storage:Abstract:Data')
	;

	/**
	 * @constructor
	 * @extends AbstractData
	 */
	function DataStorage()
	{
		AbstractData.call(this);

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

		this.allowContactsSync = ko.observable(!!Settings.settingsGet('ContactsSyncIsAllowed'));
		this.enableContactsSync = ko.observable(!!Settings.settingsGet('EnableContactsSync'));
		this.contactsSyncUrl = ko.observable(Settings.settingsGet('ContactsSyncUrl'));
		this.contactsSyncUser = ko.observable(Settings.settingsGet('ContactsSyncUser'));
		this.contactsSyncPass = ko.observable(Settings.settingsGet('ContactsSyncPassword'));

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
				kn.setHash(LinkBuilder.mailBox(
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
		this.staticMessageList = new MessageModel();
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

				if (Enums.Layout.NoPreview === this.layout() &&
					-1 < window.location.hash.indexOf('message-preview'))
				{
					if (Globals.__APP)
					{
						Globals.__APP.historyBack();
					}
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
				Globals.keyScope(Enums.KeyState.MessageView);
			}
			else if (Enums.KeyState.MessageView === Globals.keyScope())
			{
				if (Enums.Layout.NoPreview === this.layout() && this.message())
				{
					Globals.keyScope(Enums.KeyState.MessageView);
				}
				else
				{
					Globals.keyScope(Enums.KeyState.MessageList);
				}
			}
		}, this);

		this.folderList.focused.subscribe(function (bValue) {
			if (bValue)
			{
				Globals.keyScope(Enums.KeyState.FolderList);
			}
			else if (Enums.KeyState.FolderList === Globals.keyScope())
			{
				Globals.keyScope(Enums.KeyState.MessageList);
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

	_.extend(DataStorage.prototype, AbstractData.prototype);

	DataStorage.prototype.purgeMessageBodyCache = function()
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

	DataStorage.prototype.populateDataOnStart = function()
	{
		AbstractData.prototype.populateDataOnStart.call(this);

		this.accountEmail(Settings.settingsGet('Email'));
		this.accountIncLogin(Settings.settingsGet('IncLogin'));
		this.accountOutLogin(Settings.settingsGet('OutLogin'));
		this.projectHash(Settings.settingsGet('ProjectHash'));

		this.defaultIdentityID(Settings.settingsGet('DefaultIdentityID'));

		this.displayName(Settings.settingsGet('DisplayName'));
		this.replyTo(Settings.settingsGet('ReplyTo'));
		this.signature(Settings.settingsGet('Signature'));
		this.signatureToAll(!!Settings.settingsGet('SignatureToAll'));
		this.enableTwoFactor(!!Settings.settingsGet('EnableTwoFactor'));

		this.lastFoldersHash = LocalStorage.get(Enums.ClientSideKeyName.FoldersLashHash) || '';

		this.remoteSuggestions = !!Settings.settingsGet('RemoteSuggestions');

		this.devEmail = Settings.settingsGet('DevEmail');
		this.devPassword = Settings.settingsGet('DevPassword');
	};

	DataStorage.prototype.initUidNextAndNewMessages = function (sFolder, sUidNext, aNewMessages)
	{
		if ('INBOX' === sFolder && Utils.isNormal(sUidNext) && sUidNext !== '')
		{
			if (Utils.isArray(aNewMessages) && 0 < aNewMessages.length)
			{
				var
					self = this,
					iIndex = 0,
					iLen = aNewMessages.length,
					fNotificationHelper = function (sImageSrc, sTitle, sText)
					{
						var
							NotificationClass = Utils.notificationClass(),
							oNotification = null
						;

						if (NotificationClass && self.useDesktopNotifications())
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
						this.accountEmail(),
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

	DataStorage.prototype.hideMessageBodies = function ()
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
	DataStorage.prototype.getNextFolderNames = function (bBoot)
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
			var oFolder = Cache.getFolderFromCacheList(aItem[1]);
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
	DataStorage.prototype.removeMessagesFromList = function (
		sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
	{
		sToFolderFullNameRaw = Utils.isNormal(sToFolderFullNameRaw) ? sToFolderFullNameRaw : '';
		bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;

		aUidForRemove = _.map(aUidForRemove, function (mValue) {
			return Utils.pInt(mValue);
		});

		var
			self = this,
			iUnseenCount = 0,
			aMessageList = this.messageList(),
			oFromFolder = Cache.getFolderFromCacheList(sFromFolderFullNameRaw),
			oToFolder = '' === sToFolderFullNameRaw ? null : Cache.getFolderFromCacheList(sToFolderFullNameRaw || ''),
			sCurrentFolderFullNameRaw = this.currentFolderFullNameRaw(),
			oCurrentMessage = this.message(),
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
				this.messageListIsNotCompleted(true);

				_.each(aMessages, function (oMessage) {
					if (oCurrentMessage && oCurrentMessage.hash === oMessage.hash)
					{
						oCurrentMessage = null;
						self.message(null);
					}

					oMessage.deleted(true);
				});

				_.delay(function () {
					_.each(aMessages, function (oMessage) {
						self.messageList.remove(oMessage);
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

	/**
	 * @private
	 * @param {Object} oMessageTextBody
	 */
	DataStorage.prototype.initBlockquoteSwitcher = function (oMessageTextBody)
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

	DataStorage.prototype.setMessage = function (oData, bCached)
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
			Cache.addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);

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

						if ((oMessage.isPgpSigned() || oMessage.isPgpEncrypted()) && this.capaOpenPGP())
						{
							oMessage.plainRaw = Utils.pString(oData.Result.Plain);

							bPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(oMessage.plainRaw);
							if (!bPgpEncrypted)
							{
								bPgpSigned = /-----BEGIN PGP SIGNED MESSAGE-----/.test(oMessage.plainRaw) &&
									/-----BEGIN PGP SIGNATURE-----/.test(oMessage.plainRaw);
							}

							Globals.$div.empty();
							if (bPgpSigned && oMessage.isPgpSigned())
							{
								sResultHtml =
									Globals.$div.append(
										$('<pre class="b-plain-openpgp signed"></pre>').text(oMessage.plainRaw)
									).html()
								;
							}
							else if (bPgpEncrypted && oMessage.isPgpEncrypted())
							{
								sResultHtml =
									Globals.$div.append(
										$('<pre class="b-plain-openpgp encrypted"></pre>').text(oMessage.plainRaw)
									).html()
								;
							}

							Globals.$div.empty();

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
					this.initBlockquoteSwitcher(oBody);
				}
			}

			Cache.initMessageFlagsFromCache(oMessage);
			if (oMessage.unseen())
			{
				if (Globals.__APP)
				{
					Globals.__APP.setMessageSeen(oMessage);
				}
			}

			Utils.windowResize();
		}
	};

	/**
	 * @param {Array} aList
	 * @returns {string}
	 */
	DataStorage.prototype.calculateMessageListHash = function (aList)
	{
		return _.map(aList, function (oMessage) {
			return '' + oMessage.hash + '_' + oMessage.threadsLen() + '_' + oMessage.flagHash();
		}).join('|');
	};

	DataStorage.prototype.findPublicKeyByHex = function (sHash)
	{
		return _.find(this.openpgpkeysPublic(), function (oItem) {
			return oItem && sHash === oItem.id;
		});
	};

	DataStorage.prototype.findPublicKeysByEmail = function (sEmail)
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
	DataStorage.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
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
	DataStorage.prototype.findSelfPrivateKey = function (sPassword)
	{
		return this.findPrivateKeyByEmail(this.accountEmail(), sPassword);
	};

	module.exports = new DataStorage();

}(module, require));

},{"$":20,"App:Knoin":27,"Consts":6,"Enums":7,"Globals":9,"LinkBuilder":11,"Model:Message":42,"Storage:Abstract:Data":61,"Storage:LocalStorage":65,"Storage:RainLoop:Cache":63,"Storage:Settings":69,"Utils":14,"_":25,"ko":22,"moment":23,"window":26}],65:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	/**
	 * @constructor
	 */
	function LocalStorage()
	{
		var
			NextStorageDriver = require('_').find([
				require('Storage:LocalStorage:Cookie'),
				require('Storage:LocalStorage:LocalStorage')
			], function (NextStorageDriver) {
				return NextStorageDriver && NextStorageDriver.supported();
			})
		;

		this.oDriver = null;

		if (NextStorageDriver)
		{
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

}(module, require));
},{"Storage:LocalStorage:Cookie":66,"Storage:LocalStorage:LocalStorage":67,"_":25}],66:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		$ = require('$'),
		JSON = require('JSON'),

		Consts = require('Consts'),
		Utils = require('Utils')
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

}(module, require));
},{"$":20,"Consts":6,"JSON":15,"Utils":14}],67:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		JSON = require('JSON'),

		Consts = require('Consts'),
		Utils = require('Utils')
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

}(module, require));
},{"Consts":6,"JSON":15,"Utils":14,"window":26}],68:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),

		Utils = require('Utils'),
		Consts = require('Consts'),
		Globals = require('Globals'),
		Base64 = require('Base64'),

		Settings = require('Storage:Settings'),
		Cache = require('Storage:RainLoop:Cache'),
		Data = require('Storage:RainLoop:Data'),

		AbstractRemoteStorage = require('Storage:Abstract:Remote')
	;

	/**
	 * @constructor
	 * @extends AbstractRemoteStorage
	 */
	function RemoteStorage()
	{
		AbstractRemoteStorage.call(this);

		this.oRequests = {};
	}

	_.extend(RemoteStorage.prototype, AbstractRemoteStorage.prototype);

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.folders = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Folders', {
			'SentFolder': Settings.settingsGet('SentFolder'),
			'DraftFolder': Settings.settingsGet('DraftFolder'),
			'SpamFolder': Settings.settingsGet('SpamFolder'),
			'TrashFolder': Settings.settingsGet('TrashFolder'),
			'ArchiveFolder': Settings.settingsGet('ArchiveFolder')
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
	RemoteStorage.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe)
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
	RemoteStorage.prototype.getTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'GetTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.createTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.clearTwoFactor = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.showTwoFactorSecret = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sCode
	 */
	RemoteStorage.prototype.testTwoFactor = function (fCallback, sCode)
	{
		this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
			'Code': sCode
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bEnable
	 */
	RemoteStorage.prototype.enableTwoFactor = function (fCallback, bEnable)
	{
		this.defaultRequest(fCallback, 'EnableTwoFactor', {
			'Enable': bEnable ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.clearTwoFactorInfo = function (fCallback)
	{
		this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.contactsSync = function (fCallback)
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
	RemoteStorage.prototype.saveContactsSyncData = function (fCallback, bEnable, sUrl, sUser, sPassword)
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
	RemoteStorage.prototype.accountAdd = function (fCallback, sEmail, sLogin, sPassword)
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
	RemoteStorage.prototype.accountDelete = function (fCallback, sEmailToDelete)
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
	RemoteStorage.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc)
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
	RemoteStorage.prototype.identityDelete = function (fCallback, sIdToDelete)
	{
		this.defaultRequest(fCallback, 'IdentityDelete', {
			'IdToDelete': sIdToDelete
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.accountsAndIdentities = function (fCallback)
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
	RemoteStorage.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, bSilent)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

		var
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
					Data.projectHash(),
					sFolderHash,
					'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
					Data.threading() && Data.useThreads() ? '1' : '0',
					Data.threading() && sFolderFullNameRaw === Data.messageListThreadFolder() ? Data.messageListThreadUids().join(',') : ''
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
				'UseThreads': Data.threading() && Data.useThreads() ? '1' : '0',
				'ExpandedThreadUid': Data.threading() && sFolderFullNameRaw === Data.messageListThreadFolder() ? Data.messageListThreadUids().join(',') : ''
			}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout, '', bSilent ? [] : ['MessageList']);
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aDownloads
	 */
	RemoteStorage.prototype.messageUploadAttachments = function (fCallback, aDownloads)
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
	RemoteStorage.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
	{
		sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
		iUid = Utils.pInt(iUid);

		if (Cache.getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
		{
			this.defaultRequest(fCallback, 'Message', {}, null,
				'Message/' + Base64.urlsafe_encode([
					sFolderFullNameRaw,
					iUid,
					Data.projectHash(),
					Data.threading() && Data.useThreads() ? '1' : '0'
				].join(String.fromCharCode(0))), ['Message']);

			return true;
		}

		return false;
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aExternals
	 */
	RemoteStorage.prototype.composeUploadExternals = function (fCallback, aExternals)
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
	RemoteStorage.prototype.composeUploadDrive = function (fCallback, sUrl, sAccessToken)
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
	RemoteStorage.prototype.folderInformation = function (fCallback, sFolder, aList)
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
		else if (Data.useThreads())
		{
			if (Globals.__APP)
			{
				Globals.__APP.reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Array} aFolders
	 */
	RemoteStorage.prototype.folderInformationMultiply = function (fCallback, aFolders)
	{
		this.defaultRequest(fCallback, 'FolderInformationMultiply', {
			'Folders': aFolders
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.logout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Logout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sFolderFullNameRaw
	 * @param {Array} aUids
	 * @param {boolean} bSetFlagged
	 */
	RemoteStorage.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
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
	RemoteStorage.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
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
	RemoteStorage.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
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
	RemoteStorage.prototype.saveMessage = function (fCallback, sMessageFolder, sMessageUid, sDraftFolder,
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
	RemoteStorage.prototype.sendReadReceiptMessage = function (fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText)
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
	RemoteStorage.prototype.sendMessage = function (fCallback, sMessageFolder, sMessageUid, sSentFolder,
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
	RemoteStorage.prototype.saveSystemFolders = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oData
	 */
	RemoteStorage.prototype.saveSettings = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'SettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sPrevPassword
	 * @param {string} sNewPassword
	 */
	RemoteStorage.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
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
	RemoteStorage.prototype.folderCreate = function (fCallback, sNewFolderName, sParentName)
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
	RemoteStorage.prototype.folderDelete = function (fCallback, sFolderFullNameRaw)
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
	RemoteStorage.prototype.folderRename = function (fCallback, sPrevFolderFullNameRaw, sNewFolderName)
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
	RemoteStorage.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
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
	RemoteStorage.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
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
	RemoteStorage.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids, sLearning)
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
	RemoteStorage.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
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
	RemoteStorage.prototype.messagesDelete = function (fCallback, sFolder, aUids)
	{
		this.defaultRequest(fCallback, 'MessageDelete', {
			'Folder': sFolder,
			'Uids': aUids.join(',')
		}, null, '', ['MessageList']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.appDelayStart = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AppDelayStart');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.quota = function (fCallback)
	{
		this.defaultRequest(fCallback, 'Quota');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {number} iOffset
	 * @param {number} iLimit
	 * @param {string} sSearch
	 */
	RemoteStorage.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
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
	RemoteStorage.prototype.contactSave = function (fCallback, sRequestUid, sUid, sTags, aProperties)
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
	RemoteStorage.prototype.contactsDelete = function (fCallback, aUids)
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
	RemoteStorage.prototype.suggestions = function (fCallback, sQuery, iPage)
	{
		this.defaultRequest(fCallback, 'Suggestions', {
			'Query': sQuery,
			'Page': iPage
		}, null, '', ['Suggestions']);
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.facebookUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.facebookDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.twitterUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.twitterDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.googleUser = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.googleDisconnect = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
	};

	/**
	 * @param {?Function} fCallback
	 */
	RemoteStorage.prototype.socialUsers = function (fCallback)
	{
		this.defaultRequest(fCallback, 'SocialUsers');
	};

	module.exports = new RemoteStorage();

}(module, require));
},{"Base64":5,"Consts":6,"Globals":9,"Storage:Abstract:Remote":62,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:Settings":69,"Utils":14,"_":25}],69:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function SettingsStorage()
	{
		this.oSettings = window['rainloopAppData'] || {};
		this.oSettings = Utils.isNormal(this.oSettings) ? this.oSettings : {};
	}

	SettingsStorage.prototype.oSettings = null;

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	SettingsStorage.prototype.settingsGet = function (sName)
	{
		return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
	};

	/**
	 * @param {string} sName
	 * @param {?} mValue
	 */
	SettingsStorage.prototype.settingsSet = function (sName, mValue)
	{
		this.oSettings[sName] = mValue;
	};

	/**
	 * @param {string} sName
	 * @return {boolean}
	 */
	SettingsStorage.prototype.capa = function (sName)
	{
		var mCapa = this.settingsGet('Capa');
		return Utils.isArray(mCapa) && Utils.isNormal(sName) && -1 < Utils.inArray(sName, mCapa);
	};


	module.exports = new SettingsStorage();

}(module, require));
},{"Utils":14,"window":26}],70:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		kn = require('App:Knoin'),
		Settings = require('Storage:Settings'),

		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AboutViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Center', 'About');

		this.version = ko.observable(Settings.settingsGet('Version'));

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:About', 'AboutViewModel'], AboutViewModel);
	_.extend(AboutViewModel.prototype, KnoinAbstractViewModel.prototype);

	module.exports = AboutViewModel;

}(module, require));
},{"App:Knoin":27,"Knoin:AbstractViewModel":30,"Storage:Settings":69,"_":25,"ko":22}],71:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AbstractSystemDropDownViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'SystemDropDown');

		this.accounts = Data.accounts;
		this.accountEmail = Data.accountEmail;
		this.accountsLoading = Data.accountsLoading;

		this.accountMenuDropdownTrigger = ko.observable(false);

		this.capaAdditionalAccounts = Settings.capa(Enums.Capa.AdditionalAccounts);

		this.loading = ko.computed(function () {
			return this.accountsLoading();
		}, this);

		this.accountClick = _.bind(this.accountClick, this);
	}

	_.extend(AbstractSystemDropDownViewModel.prototype, KnoinAbstractViewModel.prototype);

	AbstractSystemDropDownViewModel.prototype.accountClick = function (oAccount, oEvent)
	{
		if (oAccount && oEvent && !Utils.isUnd(oEvent.which) && 1 === oEvent.which)
		{
			var self = this;
			this.accountsLoading(true);
			_.delay(function () {
				self.accountsLoading(false);
			}, 1000);
		}

		return true;
	};

	AbstractSystemDropDownViewModel.prototype.emailTitle = function ()
	{
		return Data.accountEmail();
	};

	AbstractSystemDropDownViewModel.prototype.settingsClick = function ()
	{
		require('App:Knoin').setHash(LinkBuilder.settings());
	};

	AbstractSystemDropDownViewModel.prototype.settingsHelp = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:KeyboardShortcutsHelp'));
	};

	AbstractSystemDropDownViewModel.prototype.addAccountClick = function ()
	{
		if (this.capaAdditionalAccounts)
		{
			require('App:Knoin').showScreenPopup(require('View:Popup:AddAccount'));
		}
	};

	AbstractSystemDropDownViewModel.prototype.logoutClick = function ()
	{
		Remote.logout(function () {
			if (window.__rlah_clear)
			{
				window.__rlah_clear();
			}

			require('App:RainLoop').loginAndLogoutReload(true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
		});
	};

	AbstractSystemDropDownViewModel.prototype.onBuild = function ()
	{
		var self = this;
		key('`', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
			if (self.viewModelVisibility())
			{
				self.accountMenuDropdownTrigger(true);
			}
		});

		// shortcuts help
		key('shift+/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
			if (self.viewModelVisibility())
			{
				require('App:Knoin').showScreenPopup(require('View:Popup:KeyboardShortcutsHelp'));
				return false;
			}
		});
	};

	module.exports = AbstractSystemDropDownViewModel;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:Popup:AddAccount":77,"View:Popup:KeyboardShortcutsHelp":89,"_":25,"key":21,"ko":22,"window":26}],72:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function LoginViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Center', 'Login');

		this.email = ko.observable('');
		this.password = ko.observable('');
		this.signMe = ko.observable(false);

		this.additionalCode = ko.observable('');
		this.additionalCode.error = ko.observable(false);
		this.additionalCode.focused = ko.observable(false);
		this.additionalCode.visibility = ko.observable(false);
		this.additionalCodeSignMe = ko.observable(false);

		this.logoImg = Utils.trim(Settings.settingsGet('LoginLogo'));
		this.loginDescription = Utils.trim(Settings.settingsGet('LoginDescription'));
		this.logoCss = Utils.trim(Settings.settingsGet('LoginCss'));

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.emailFocus = ko.observable(false);
		this.submitFocus = ko.observable(false);

		this.email.subscribe(function () {
			this.emailError(false);
			this.additionalCode('');
			this.additionalCode.visibility(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.additionalCode.subscribe(function () {
			this.additionalCode.error(false);
		}, this);

		this.additionalCode.visibility.subscribe(function () {
			this.additionalCode.error(false);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.allowLanguagesOnLogin = Data.allowLanguagesOnLogin;

		this.langRequest = ko.observable(false);
		this.mainLanguage = Data.mainLanguage;
		this.bSendLanguage = false;

		this.mainLanguageFullName = ko.computed(function () {
			return Utils.convertLangName(this.mainLanguage());
		}, this);

		this.signMeType = ko.observable(Enums.LoginSignMeType.Unused);

		this.signMeType.subscribe(function (iValue) {
			this.signMe(Enums.LoginSignMeType.DefaultOn === iValue);
		}, this);

		this.signMeVisibility = ko.computed(function () {
			return Enums.LoginSignMeType.Unused !== this.signMeType();
		}, this);

		this.submitCommand = Utils.createCommand(this, function () {

			Utils.triggerAutocompleteInputChange();

			this.emailError('' === Utils.trim(this.email()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.additionalCode.visibility())
			{
				this.additionalCode.error('' === Utils.trim(this.additionalCode()));
			}

			if (this.emailError() || this.passwordError() || this.additionalCode.error())
			{
				return false;
			}

			this.submitRequest(true);

			var
				sPassword = this.password(),

				fLoginRequest = _.bind(function (sPassword) {

					Remote.login(_.bind(function (sResult, oData) {

						if (Enums.StorageResultType.Success === sResult && oData && 'Login' === oData.Action)
						{
							if (oData.Result)
							{
								if (oData.TwoFactorAuth)
								{
									this.additionalCode('');
									this.additionalCode.visibility(true);
									this.additionalCode.focused(true);

									this.submitRequest(false);
								}
								else
								{
									require('App:RainLoop').loginAndLogoutReload();
								}
							}
							else if (oData.ErrorCode)
							{
								this.submitRequest(false);
								this.submitError(Utils.getNotification(oData.ErrorCode));

								if ('' === this.submitError())
								{
									this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
								}
							}
							else
							{
								this.submitRequest(false);
							}
						}
						else
						{
							this.submitRequest(false);
							this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
						}

					}, this), this.email(), '', sPassword, !!this.signMe(),
						this.bSendLanguage ? this.mainLanguage() : '',
						this.additionalCode.visibility() ? this.additionalCode() : '',
						this.additionalCode.visibility() ? !!this.additionalCodeSignMe() : false
					);

				}, this)
			;

			if (!!Settings.settingsGet('UseRsaEncryption') && Utils.rsaEncode.supported)
			{
				Remote.getPublicKey(_.bind(function (sResult, oData) {

					var bRequest = false;
					if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
						Utils.isArray(oData.Result) && oData.Result[0] && oData.Result[1] && oData.Result[2])
					{
						var sEncryptedPassword = Utils.rsaEncode(sPassword, oData.Result[0], oData.Result[1], oData.Result[2]);
						if (sEncryptedPassword)
						{
							fLoginRequest(sEncryptedPassword);
							bRequest = true;
						}
					}

					if (!bRequest)
					{
						this.submitRequest(false);
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}

				}, this));
			}
			else
			{
				fLoginRequest(sPassword);
			}

			return true;

		}, function () {
			return !this.submitRequest();
		});

		this.facebookLoginEnabled = ko.observable(false);

		this.facebookCommand = Utils.createCommand(this, function () {

			window.open(LinkBuilder.socialFacebook(), 'Facebook',
				'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
			return true;

		}, function () {
			return !this.submitRequest() && this.facebookLoginEnabled();
		});

		this.googleLoginEnabled = ko.observable(false);

		this.googleCommand = Utils.createCommand(this, function () {

			window.open(LinkBuilder.socialGoogle(), 'Google',
				'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
			return true;

		}, function () {
			return !this.submitRequest() && this.googleLoginEnabled();
		});

		this.twitterLoginEnabled = ko.observable(false);

		this.twitterCommand = Utils.createCommand(this, function () {

			window.open(LinkBuilder.socialTwitter(), 'Twitter',
				'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');

			return true;

		}, function () {
			return !this.submitRequest() && this.twitterLoginEnabled();
		});

		this.socialLoginEnabled = ko.computed(function () {

			var
				bF = this.facebookLoginEnabled(),
				bG = this.googleLoginEnabled(),
				bT = this.twitterLoginEnabled()
			;

			return bF || bG || bT;
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:Login', 'LoginViewModel'], LoginViewModel);
	_.extend(LoginViewModel.prototype, KnoinAbstractViewModel.prototype);

	LoginViewModel.prototype.onShow = function ()
	{
		kn.routeOff();

		_.delay(_.bind(function () {
			if ('' !== this.email() && '' !== this.password())
			{
				this.submitFocus(true);
			}
			else
			{
				this.emailFocus(true);
			}

			if (Settings.settingsGet('UserLanguage'))
			{
				$.cookie('rllang', Data.language(), {'expires': 30});
			}

		}, this), 100);
	};

	LoginViewModel.prototype.onHide = function ()
	{
		this.submitFocus(false);
		this.emailFocus(false);
	};

	LoginViewModel.prototype.onBuild = function ()
	{
		var
			self = this,
			sJsHash = Settings.settingsGet('JsHash'),
			fSocial = function (iErrorCode) {
				iErrorCode = Utils.pInt(iErrorCode);
				if (0 === iErrorCode)
				{
					self.submitRequest(true);
					require('App:RainLoop').loginAndLogoutReload();
				}
				else
				{
					self.submitError(Utils.getNotification(iErrorCode));
				}
			}
		;

		this.facebookLoginEnabled(!!Settings.settingsGet('AllowFacebookSocial'));
		this.twitterLoginEnabled(!!Settings.settingsGet('AllowTwitterSocial'));
		this.googleLoginEnabled(!!Settings.settingsGet('AllowGoogleSocial'));

		switch ((Settings.settingsGet('SignMe') || 'unused').toLowerCase())
		{
			case Enums.LoginSignMeTypeAsString.DefaultOff:
				this.signMeType(Enums.LoginSignMeType.DefaultOff);
				break;
			case Enums.LoginSignMeTypeAsString.DefaultOn:
				this.signMeType(Enums.LoginSignMeType.DefaultOn);
				break;
			default:
			case Enums.LoginSignMeTypeAsString.Unused:
				this.signMeType(Enums.LoginSignMeType.Unused);
				break;
		}

		this.email(Data.devEmail);
		this.password(Data.devPassword);

		if (this.googleLoginEnabled())
		{
			window['rl_' + sJsHash + '_google_login_service'] = fSocial;
		}

		if (this.facebookLoginEnabled())
		{
			window['rl_' + sJsHash + '_facebook_login_service'] = fSocial;
		}

		if (this.twitterLoginEnabled())
		{
			window['rl_' + sJsHash + '_twitter_login_service'] = fSocial;
		}

		_.delay(function () {
			Data.language.subscribe(function (sValue) {
				self.langRequest(true);
				$.ajax({
					'url': LinkBuilder.langLink(sValue),
					'dataType': 'script',
					'cache': true
				}).done(function() {
					self.bSendLanguage = true;
					Utils.i18nReload();
					$.cookie('rllang', Data.language(), {'expires': 30});
				}).always(function() {
					self.langRequest(false);
				});
			});
		}, 50);

		Utils.triggerAutocompleteInputChange(true);
	};

	LoginViewModel.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	LoginViewModel.prototype.selectLanguage = function ()
	{
		kn.showScreenPopup(require('View:Popup:Languages'));
	};

	module.exports = LoginViewModel;

}(module, require));
},{"$":20,"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:Popup:Languages":90,"_":25,"ko":22,"window":26}],73:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Utils = require('Utils'),
		Enums = require('Enums'),
		Globals = require('Globals'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Cache = require('Storage:RainLoop:Cache'),
		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function MailBoxFolderListViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Left', 'MailFolderList');

		this.oContentVisible = null;
		this.oContentScrollable = null;

		this.messageList = Data.messageList;
		this.folderList = Data.folderList;
		this.folderListSystem = Data.folderListSystem;
		this.foldersChanging = Data.foldersChanging;

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.iDropOverTimer = 0;

		this.allowContacts = !!Settings.settingsGet('ContactsIsAllowed');

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:MailBoxFolderList', 'MailBoxFolderListViewModel'], MailBoxFolderListViewModel);
	_.extend(MailBoxFolderListViewModel.prototype, KnoinAbstractViewModel.prototype);

	MailBoxFolderListViewModel.prototype.onBuild = function (oDom)
	{
		this.oContentVisible = $('.b-content', oDom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		var self = this;

		oDom
			.on('click', '.b-folders .e-item .e-link .e-collapsed-sign', function (oEvent) {

				var
					oFolder = ko.dataFor(this),
					bCollapsed = false
				;

				if (oFolder && oEvent)
				{
					bCollapsed = oFolder.collapsed();
					require('App:RainLoop').setExpandedFolder(oFolder.fullNameHash, bCollapsed);

					oFolder.collapsed(!bCollapsed);
					oEvent.preventDefault();
					oEvent.stopPropagation();
				}
			})
			.on('click', '.b-folders .e-item .e-link.selectable', function (oEvent) {

				oEvent.preventDefault();

				var
					oFolder = ko.dataFor(this)
				;

				if (oFolder)
				{
					if (Enums.Layout.NoPreview === Data.layout())
					{
						Data.message(null);
					}

					if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
					{
						Cache.setFolderHash(oFolder.fullNameRaw, '');
					}

					kn.setHash(LinkBuilder.mailBox(oFolder.fullNameHash));
				}
			})
		;

		key('up, down', Enums.KeyState.FolderList, function (event, handler) {

			var
				iIndex = -1,
				iKeyCode = handler && 'up' === handler.shortcut ? 38 : 40,
				$items = $('.b-folders .e-item .e-link:not(.hidden):visible', oDom)
			;

			if (event && $items.length)
			{
				iIndex = $items.index($items.filter('.focused'));
				if (-1 < iIndex)
				{
					$items.eq(iIndex).removeClass('focused');
				}

				if (iKeyCode === 38 && iIndex > 0)
				{
					iIndex--;
				}
				else if (iKeyCode === 40 && iIndex < $items.length - 1)
				{
					iIndex++;
				}

				$items.eq(iIndex).addClass('focused');
				self.scrollToFocused();
			}

			return false;
		});

		key('enter', Enums.KeyState.FolderList, function () {
			var $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
			if ($items.length && $items[0])
			{
				self.folderList.focused(false);
				$items.click();
			}

			return false;
		});

		key('space', Enums.KeyState.FolderList, function () {
			var bCollapsed = true, oFolder = null, $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
			if ($items.length && $items[0])
			{
				oFolder = ko.dataFor($items[0]);
				if (oFolder)
				{
					bCollapsed = oFolder.collapsed();
					require('App:RainLoop').setExpandedFolder(oFolder.fullNameHash, bCollapsed);
					oFolder.collapsed(!bCollapsed);
				}
			}

			return false;
		});

		key('esc, tab, shift+tab, right', Enums.KeyState.FolderList, function () {
			self.folderList.focused(false);
			return false;
		});

		self.folderList.focused.subscribe(function (bValue) {
			$('.b-folders .e-item .e-link.focused', oDom).removeClass('focused');
			if (bValue)
			{
				$('.b-folders .e-item .e-link.selected', oDom).addClass('focused');
			}
		});
	};

	MailBoxFolderListViewModel.prototype.messagesDropOver = function (oFolder)
	{
		window.clearTimeout(this.iDropOverTimer);
		if (oFolder && oFolder.collapsed())
		{
			this.iDropOverTimer = window.setTimeout(function () {
				oFolder.collapsed(false);
				require('App:RainLoop').setExpandedFolder(oFolder.fullNameHash, true);
				Utils.windowResize();
			}, 500);
		}
	};

	MailBoxFolderListViewModel.prototype.messagesDropOut = function ()
	{
		window.clearTimeout(this.iDropOverTimer);
	};

	MailBoxFolderListViewModel.prototype.scrollToFocused = function ()
	{
		if (!this.oContentVisible || !this.oContentScrollable)
		{
			return false;
		}

		var
			iOffset = 20,
			oFocused = $('.e-item .e-link.focused', this.oContentScrollable),
			oPos = oFocused.position(),
			iVisibleHeight = this.oContentVisible.height(),
			iFocusedHeight = oFocused.outerHeight()
		;

		if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
		{
			if (oPos.top < 0)
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
			}
			else
			{
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
			}

			return true;
		}

		return false;
	};

	/**
	 *
	 * @param {FolderModel} oToFolder
	 * @param {{helper:jQuery}} oUi
	 */
	MailBoxFolderListViewModel.prototype.messagesDrop = function (oToFolder, oUi)
	{
		if (oToFolder && oUi && oUi.helper)
		{
			var
				sFromFolderFullNameRaw = oUi.helper.data('rl-folder'),
				bCopy = Globals.$html.hasClass('rl-ctrl-key-pressed'),
				aUids = oUi.helper.data('rl-uids')
			;

			if (Utils.isNormal(sFromFolderFullNameRaw) && '' !== sFromFolderFullNameRaw && Utils.isArray(aUids))
			{
				require('App:RainLoop').moveMessagesToFolder(sFromFolderFullNameRaw, aUids, oToFolder.fullNameRaw, bCopy);
			}
		}
	};

	MailBoxFolderListViewModel.prototype.composeClick = function ()
	{
		kn.showScreenPopup(require('View:Popup:Compose'));
	};

	MailBoxFolderListViewModel.prototype.createFolder = function ()
	{
		kn.showScreenPopup(require('View:Popup:FolderCreate'));
	};

	MailBoxFolderListViewModel.prototype.configureFolders = function ()
	{
		kn.setHash(LinkBuilder.settings('folders'));
	};

	MailBoxFolderListViewModel.prototype.contactsClick = function ()
	{
		if (this.allowContacts)
		{
			kn.showScreenPopup(require('View:Popup:Contacts'));
		}
	};

	module.exports = MailBoxFolderListViewModel;

}(module, require));

},{"$":20,"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Globals":9,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:Settings":69,"Utils":14,"View:Popup:Compose":82,"View:Popup:Contacts":83,"View:Popup:FolderCreate":86,"_":25,"key":21,"ko":22,"window":26}],74:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),
		Jua = require('Jua'),
		ifvisible = require('ifvisible'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),
		Events = require('Events'),
		Selector = require('Selector'),

		Settings = require('Storage:Settings'),
		Cache = require('Storage:RainLoop:Cache'),
		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function MailBoxMessageListViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'MailMessageList');

		this.sLastUid = null;
		this.bPrefetch = false;
		this.emptySubjectValue = '';

		this.hideDangerousActions = !!Settings.settingsGet('HideDangerousActions');

		this.popupVisibility = Globals.popupVisibility;

		this.message = Data.message;
		this.messageList = Data.messageList;
		this.folderList = Data.folderList;
		this.currentMessage = Data.currentMessage;
		this.isMessageSelected = Data.isMessageSelected;
		this.messageListSearch = Data.messageListSearch;
		this.messageListError = Data.messageListError;
		this.folderMenuForMove = Data.folderMenuForMove;

		this.useCheckboxesInList = Data.useCheckboxesInList;

		this.mainMessageListSearch = Data.mainMessageListSearch;
		this.messageListEndFolder = Data.messageListEndFolder;

		this.messageListChecked = Data.messageListChecked;
		this.messageListCheckedOrSelected = Data.messageListCheckedOrSelected;
		this.messageListCheckedOrSelectedUidsWithSubMails = Data.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageListCompleteLoadingThrottle = Data.messageListCompleteLoadingThrottle;

		Utils.initOnStartOrLangChange(function () {
			this.emptySubjectValue = Utils.i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT');
		}, this);

		this.userQuota = Data.userQuota;
		this.userUsageSize = Data.userUsageSize;
		this.userUsageProc = Data.userUsageProc;

		this.moveDropdownTrigger = ko.observable(false);
		this.moreDropdownTrigger = ko.observable(false);

		// append drag and drop
		this.dragOver = ko.observable(false).extend({'throttle': 1});
		this.dragOverEnter = ko.observable(false).extend({'throttle': 1});
		this.dragOverArea = ko.observable(null);
		this.dragOverBodyArea = ko.observable(null);

		this.messageListItemTemplate = ko.computed(function () {
			return Enums.Layout.NoPreview !== Data.layout() ?
				'MailMessageListItem' : 'MailMessageListItemNoPreviewPane';
		});

		this.messageListSearchDesc = ko.computed(function () {
			var sValue = Data.messageListEndSearch();
			return '' === sValue ? '' : Utils.i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', {'SEARCH': sValue});
		});

		this.messageListPagenator = ko.computed(Utils.computedPagenatorHelper(Data.messageListPage, Data.messageListPageCount));

		this.checkAll = ko.computed({
			'read': function () {
				return 0 < Data.messageListChecked().length;
			},

			'write': function (bValue) {
				bValue = !!bValue;
				_.each(Data.messageList(), function (oMessage) {
					oMessage.checked(bValue);
				});
			}
		});

		this.inputMessageListSearchFocus = ko.observable(false);

		this.sLastSearchValue = '';
		this.inputProxyMessageListSearch = ko.computed({
			'read': this.mainMessageListSearch,
			'write': function (sValue) {
				this.sLastSearchValue = sValue;
			},
			'owner': this
		});

		this.isIncompleteChecked = ko.computed(function () {
			var
				iM = Data.messageList().length,
				iC = Data.messageListChecked().length
			;
			return 0 < iM && 0 < iC && iM > iC;
		}, this);

		this.hasMessages = ko.computed(function () {
			return 0 < this.messageList().length;
		}, this);

		this.hasCheckedOrSelectedLines = ko.computed(function () {
			return 0 < this.messageListCheckedOrSelected().length;
		}, this);

		this.isSpamFolder = ko.computed(function () {
			return Data.spamFolder() === this.messageListEndFolder() &&
				'' !== Data.spamFolder();
		}, this);

		this.isSpamDisabled = ko.computed(function () {
			return Consts.Values.UnuseOptionValue === Data.spamFolder();
		}, this);

		this.isTrashFolder = ko.computed(function () {
			return Data.trashFolder() === this.messageListEndFolder() &&
				'' !== Data.trashFolder();
		}, this);

		this.isDraftFolder = ko.computed(function () {
			return Data.draftFolder() === this.messageListEndFolder() &&
				'' !== Data.draftFolder();
		}, this);

		this.isSentFolder = ko.computed(function () {
			return Data.sentFolder() === this.messageListEndFolder() &&
				'' !== Data.sentFolder();
		}, this);

		this.isArchiveFolder = ko.computed(function () {
			return Data.archiveFolder() === this.messageListEndFolder() &&
				'' !== Data.archiveFolder();
		}, this);

		this.isArchiveDisabled = ko.computed(function () {
			return Consts.Values.UnuseOptionValue === Data.archiveFolder();
		}, this);

		this.canBeMoved = this.hasCheckedOrSelectedLines;

		this.clearCommand = Utils.createCommand(this, function () {
			kn.showScreenPopup(require('View:Popup:FolderClear'), [Data.currentFolder()]);
		});

		this.multyForwardCommand = Utils.createCommand(this, function () {
			kn.showScreenPopup(require('View:Popup:Compose'), [
				Enums.ComposeType.ForwardAsAttachment, Data.messageListCheckedOrSelected()]);
		}, this.canBeMoved);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Trash,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), false);
		}, this.canBeMoved);

		this.deleteCommand = Utils.createCommand(this, function () {
			require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Trash,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.archiveCommand = Utils.createCommand(this, function () {
			require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Archive,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.spamCommand = Utils.createCommand(this, function () {
			require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Spam,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.notSpamCommand = Utils.createCommand(this, function () {
			require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.NotSpam,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

		this.reloadCommand = Utils.createCommand(this, function () {
			if (!Data.messageListCompleteLoadingThrottle())
			{
				require('App:RainLoop').reloadMessageList(false, true);
			}
		});

		this.quotaTooltip = _.bind(this.quotaTooltip, this);

		this.selector = new Selector(this.messageList, this.currentMessage,
			'.messageListItem .actionHandle', '.messageListItem.selected', '.messageListItem .checkboxMessage',
				'.messageListItem.focused');

		this.selector.on('onItemSelect', _.bind(function (oMessage) {
			if (oMessage)
			{
				Data.message(Data.staticMessageList.populateByMessageListItem(oMessage));
				this.populateMessageBody(Data.message());

				if (Enums.Layout.NoPreview === Data.layout())
				{
					kn.setHash(LinkBuilder.messagePreview(), true);
					Data.message.focused(true);
				}
			}
			else
			{
				Data.message(null);
			}
		}, this));

		this.selector.on('onItemGetUid', function (oMessage) {
			return oMessage ? oMessage.generateUid() : '';
		});

		Data.messageListEndHash.subscribe(function () {
			this.selector.scrollToTop();
		}, this);

		Data.layout.subscribe(function (mValue) {
			this.selector.autoSelect(Enums.Layout.NoPreview !== mValue);
		}, this);

		Data.layout.valueHasMutated();

		Events
			.sub('mailbox.message-list.selector.go-down', function () {
				this.selector.goDown(true);
			}, this)
			.sub('mailbox.message-list.selector.go-up', function () {
				this.selector.goUp(true);
			}, this)
		;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:MailBoxMessageList', 'MailBoxMessageListViewModel'], MailBoxMessageListViewModel);
	_.extend(MailBoxMessageListViewModel.prototype, KnoinAbstractViewModel.prototype);

	/**
	 * @type {string}
	 */
	MailBoxMessageListViewModel.prototype.emptySubjectValue = '';

	MailBoxMessageListViewModel.prototype.searchEnterAction = function ()
	{
		this.mainMessageListSearch(this.sLastSearchValue);
		this.inputMessageListSearchFocus(false);
	};

	/**
	 * @returns {string}
	 */
	MailBoxMessageListViewModel.prototype.printableMessageCountForDeletion = function ()
	{
		var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 1 < iCnt ? ' (' + (100 > iCnt ? iCnt : '99+') + ')' : '';
	};

	MailBoxMessageListViewModel.prototype.cancelSearch = function ()
	{
		this.mainMessageListSearch('');
		this.inputMessageListSearchFocus(false);
	};

	/**
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean} bCopy
	 * @return {boolean}
	 */
	MailBoxMessageListViewModel.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw, bCopy)
	{
		if (this.canBeMoved())
		{
			require('App:RainLoop').moveMessagesToFolder(
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), sToFolderFullNameRaw, bCopy);
		}

		return false;
	};

	MailBoxMessageListViewModel.prototype.dragAndDronHelper = function (oMessageListItem)
	{
		if (oMessageListItem)
		{
			oMessageListItem.checked(true);
		}

		var
			oEl = Utils.draggeblePlace(),
			aUids = Data.messageListCheckedOrSelectedUidsWithSubMails()
		;

		oEl.data('rl-folder', Data.currentFolderFullNameRaw());
		oEl.data('rl-uids', aUids);
		oEl.find('.text').text('' + aUids.length);

		_.defer(function () {
			var aUids = Data.messageListCheckedOrSelectedUidsWithSubMails();

			oEl.data('rl-uids', aUids);
			oEl.find('.text').text('' + aUids.length);
		});

		return oEl;
	};

	/**
	 * @param {string} sResult
	 * @param {AjaxJsonDefaultResponse} oData
	 * @param {boolean} bCached
	 */
	MailBoxMessageListViewModel.prototype.onMessageResponse = function (sResult, oData, bCached)
	{
		Data.hideMessageBodies();
		Data.messageLoading(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			Data.setMessage(oData, bCached);
		}
		else if (Enums.StorageResultType.Unload === sResult)
		{
			Data.message(null);
			Data.messageError('');
		}
		else if (Enums.StorageResultType.Abort !== sResult)
		{
			Data.message(null);
			Data.messageError((oData && oData.ErrorCode ?
				Utils.getNotification(oData.ErrorCode) :
				Utils.getNotification(Enums.Notification.UnknownError)));
		}
	};

	MailBoxMessageListViewModel.prototype.populateMessageBody = function (oMessage)
	{
		if (oMessage)
		{
			if (Remote.message(this.onMessageResponse, oMessage.folderFullNameRaw, oMessage.uid))
			{
				Data.messageLoading(true);
			}
			else
			{
				Utils.log('Error: Unknown message request: ' + oMessage.folderFullNameRaw + ' ~ ' + oMessage.uid + ' [e-101]');
			}
		}
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 */
	MailBoxMessageListViewModel.prototype.setAction = function (sFolderFullNameRaw, iSetAction, aMessages)
	{
		var
			aUids = [],
			oFolder = null,
			iAlreadyUnread = 0
		;

		if (Utils.isUnd(aMessages))
		{
			aMessages = Data.messageListChecked();
		}

		aUids = _.map(aMessages, function (oMessage) {
			return oMessage.uid;
		});

		if ('' !== sFolderFullNameRaw && 0 < aUids.length)
		{
			switch (iSetAction) {
			case Enums.MessageSetAction.SetSeen:
				_.each(aMessages, function (oMessage) {
					if (oMessage.unseen())
					{
						iAlreadyUnread++;
					}

					oMessage.unseen(false);
					Cache.storeMessageFlagsToCache(oMessage);
				});

				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread);
				}

				Remote.messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
				break;
			case Enums.MessageSetAction.UnsetSeen:
				_.each(aMessages, function (oMessage) {
					if (oMessage.unseen())
					{
						iAlreadyUnread++;
					}

					oMessage.unseen(true);
					Cache.storeMessageFlagsToCache(oMessage);
				});

				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread + aUids.length);
				}
				Remote.messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
				break;
			case Enums.MessageSetAction.SetFlag:
				_.each(aMessages, function (oMessage) {
					oMessage.flagged(true);
					Cache.storeMessageFlagsToCache(oMessage);
				});
				Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
				break;
			case Enums.MessageSetAction.UnsetFlag:
				_.each(aMessages, function (oMessage) {
					oMessage.flagged(false);
					Cache.storeMessageFlagsToCache(oMessage);
				});
				Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
				break;
			}

			require('App:RainLoop').reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 */
	MailBoxMessageListViewModel.prototype.setActionForAll = function (sFolderFullNameRaw, iSetAction)
	{
		var
			oFolder = null,
			aMessages = Data.messageList()
		;

		if ('' !== sFolderFullNameRaw)
		{
			oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);

			if (oFolder)
			{
				switch (iSetAction) {
				case Enums.MessageSetAction.SetSeen:
					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						_.each(aMessages, function (oMessage) {
							oMessage.unseen(false);
						});

						oFolder.messageCountUnread(0);
						Cache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
					}

					Remote.messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, true);
					break;
				case Enums.MessageSetAction.UnsetSeen:
					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						_.each(aMessages, function (oMessage) {
							oMessage.unseen(true);
						});

						oFolder.messageCountUnread(oFolder.messageCountAll());
						Cache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
					}
					Remote.messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, false);
					break;
				}

				require('App:RainLoop').reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	};

	MailBoxMessageListViewModel.prototype.listSetSeen = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.listSetAllSeen = function ()
	{
		this.setActionForAll(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen);
	};

	MailBoxMessageListViewModel.prototype.listUnsetSeen = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetSeen, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.listSetFlags = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.SetFlag, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.listUnsetFlags = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetFlag, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.flagMessages = function (oCurrentMessage)
	{
		var
			aChecked = this.messageListCheckedOrSelected(),
			aCheckedUids = []
		;

		if (oCurrentMessage)
		{
			if (0 < aChecked.length)
			{
				aCheckedUids = _.map(aChecked, function (oMessage) {
					return oMessage.uid;
				});
			}

			if (0 < aCheckedUids.length && -1 < Utils.inArray(oCurrentMessage.uid, aCheckedUids))
			{
				this.setAction(oCurrentMessage.folderFullNameRaw, oCurrentMessage.flagged() ?
					Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
			else
			{
				this.setAction(oCurrentMessage.folderFullNameRaw, oCurrentMessage.flagged() ?
					Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oCurrentMessage]);
			}
		}
	};

	MailBoxMessageListViewModel.prototype.flagMessagesFast = function (bFlag)
	{
		var
			aChecked = this.messageListCheckedOrSelected(),
			aFlagged = []
		;

		if (0 < aChecked.length)
		{
			aFlagged = _.filter(aChecked, function (oMessage) {
				return oMessage.flagged();
			});

			if (Utils.isUnd(bFlag))
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					aChecked.length === aFlagged.length ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
			else
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					!bFlag ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
		}
	};

	MailBoxMessageListViewModel.prototype.seenMessagesFast = function (bSeen)
	{
		var
			aChecked = this.messageListCheckedOrSelected(),
			aUnseen = []
		;

		if (0 < aChecked.length)
		{
			aUnseen = _.filter(aChecked, function (oMessage) {
				return oMessage.unseen();
			});

			if (Utils.isUnd(bSeen))
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					0 < aUnseen.length ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
			}
			else
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					bSeen ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
			}
		}
	};

	MailBoxMessageListViewModel.prototype.onBuild = function (oDom)
	{
		var self = this;

		this.oContentVisible = $('.b-content', oDom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		this.oContentVisible.on('click', '.fullThreadHandle', function () {
			var
				aList = [],
				oMessage = ko.dataFor(this)
			;

			if (oMessage && !oMessage.lastInCollapsedThreadLoading())
			{
				Data.messageListThreadFolder(oMessage.folderFullNameRaw);

				aList = Data.messageListThreadUids();

				if (oMessage.lastInCollapsedThread())
				{
					aList.push(0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
				}
				else
				{
					aList = _.without(aList, 0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
				}

				Data.messageListThreadUids(_.uniq(aList));

				oMessage.lastInCollapsedThreadLoading(true);
				oMessage.lastInCollapsedThread(!oMessage.lastInCollapsedThread());

				require('App:RainLoop').reloadMessageList();
			}

			return false;
		});

		this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.MessageList);

		oDom
			.on('click', '.messageList .b-message-list-wrapper', function () {
				if (self.message.focused())
				{
					self.message.focused(false);
				}
			})
			.on('click', '.e-pagenator .e-page', function () {
				var oPage = ko.dataFor(this);
				if (oPage)
				{
					kn.setHash(LinkBuilder.mailBox(
						Data.currentFolderFullNameHash(),
						oPage.value,
						Data.messageListSearch()
					));
				}
			})
			.on('click', '.messageList .checkboxCkeckAll', function () {
				self.checkAll(!self.checkAll());
			})
			.on('click', '.messageList .messageListItem .flagParent', function () {
				self.flagMessages(ko.dataFor(this));
			})
		;

		this.initUploaderForAppend();
		this.initShortcuts();

		if (!Globals.bMobileDevice && Settings.capa(Enums.Capa.Prefetch) && ifvisible)
		{
			ifvisible.setIdleDuration(10);

			ifvisible.idle(function () {
				self.prefetchNextTick();
			});
		}
	};

	MailBoxMessageListViewModel.prototype.initShortcuts = function ()
	{
		var self = this;

		// disable print
		key('ctrl+p, command+p', Enums.KeyState.MessageList, function () {
			return false;
		});

		// archive (zip)
		key('z', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.archiveCommand();
			return false;
		});

		// delete
		key('delete, shift+delete, shift+3', Enums.KeyState.MessageList, function (event, handler) {
			if (event)
			{
				if (0 < Data.messageListCheckedOrSelected().length)
				{
					if (handler && 'shift+delete' === handler.shortcut)
					{
						self.deleteWithoutMoveCommand();
					}
					else
					{
						self.deleteCommand();
					}
				}

				return false;
			}
		});

		// check mail
		key('ctrl+r, command+r', [Enums.KeyState.FolderList, Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.reloadCommand();
			return false;
		});

		// check all
		key('ctrl+a, command+a', Enums.KeyState.MessageList, function () {
			self.checkAll(!(self.checkAll() && !self.isIncompleteChecked()));
			return false;
		});

		// write/compose (open compose popup)
		key('w,c', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			kn.showScreenPopup(require('View:Popup:Compose'));
			return false;
		});

		// important - star/flag messages
		key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.flagMessagesFast();
			return false;
		});

		// move
		key('m', Enums.KeyState.MessageList, function () {
			self.moveDropdownTrigger(true);
			return false;
		});

		// read
		key('q', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.seenMessagesFast(true);
			return false;
		});

		// unread
		key('u', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.seenMessagesFast(false);
			return false;
		});

		key('shift+f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.multyForwardCommand();
			return false;
		});

		// search input focus
		key('/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.inputMessageListSearchFocus(true);
			return false;
		});

		// cancel search
		key('esc', Enums.KeyState.MessageList, function () {
			if ('' !== self.messageListSearchDesc())
			{
				self.cancelSearch();
				return false;
			}
		});

		// change focused state
		key('tab, shift+tab, left, right', Enums.KeyState.MessageList, function (event, handler) {
			if (event && handler && ('shift+tab' === handler.shortcut || 'left' === handler.shortcut))
			{
				self.folderList.focused(true);
			}
			else if (self.message())
			{
				self.message.focused(true);
			}

			return false;
		});

		// TODO
		key('ctrl+left, command+left', Enums.KeyState.MessageView, function () {
			return false;
		});

		// TODO
		key('ctrl+right, command+right', Enums.KeyState.MessageView, function () {
			return false;
		});
	};

	MailBoxMessageListViewModel.prototype.prefetchNextTick = function ()
	{
		if (!this.bPrefetch && !ifvisible.now() && this.viewModelVisibility())
		{
			var
				self = this,
				oMessage = _.find(this.messageList(), function (oMessage) {
					return oMessage &&
						!Cache.hasRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);
				})
			;

			if (oMessage)
			{
				this.bPrefetch = true;

				Cache.addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);

				Remote.message(function (sResult, oData) {

					var bNext = !!(Enums.StorageResultType.Success === sResult && oData && oData.Result);

					_.delay(function () {
						self.bPrefetch = false;
						if (bNext)
						{
							self.prefetchNextTick();
						}
					}, 1000);

				}, oMessage.folderFullNameRaw, oMessage.uid);
			}
		}
	};

	MailBoxMessageListViewModel.prototype.composeClick = function ()
	{
		kn.showScreenPopup(require('View:Popup:Compose'));
	};

	MailBoxMessageListViewModel.prototype.advancedSearchClick = function ()
	{
		kn.showScreenPopup(require('View:Popup:AdvancedSearch'));
	};

	MailBoxMessageListViewModel.prototype.quotaTooltip = function ()
	{
		return Utils.i18n('MESSAGE_LIST/QUOTA_SIZE', {
			'SIZE': Utils.friendlySize(this.userUsageSize()),
			'PROC': this.userUsageProc(),
			'LIMIT': Utils.friendlySize(this.userQuota())
		});
	};

	MailBoxMessageListViewModel.prototype.initUploaderForAppend = function ()
	{
		if (!Settings.settingsGet('AllowAppendMessage') || !this.dragOverArea())
		{
			return false;
		}

		var
			oJua = new Jua({
				'action': LinkBuilder.append(),
				'name': 'AppendFile',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'disableFolderDragAndDrop': true,
				'hidden': {
					'Folder': function () {
						return Data.currentFolderFullNameRaw();
					}
				},
				'dragAndDropElement': this.dragOverArea(),
				'dragAndDropBodyElement': this.dragOverBodyArea()
			})
		;

		oJua
			.on('onDragEnter', _.bind(function () {
				this.dragOverEnter(true);
			}, this))
			.on('onDragLeave', _.bind(function () {
				this.dragOverEnter(false);
			}, this))
			.on('onBodyDragEnter', _.bind(function () {
				this.dragOver(true);
			}, this))
			.on('onBodyDragLeave', _.bind(function () {
				this.dragOver(false);
			}, this))
			.on('onSelect', _.bind(function (sUid, oData) {
				if (sUid && oData && 'message/rfc822' === oData['Type'])
				{
					Data.messageListLoading(true);
					return true;
				}

				return false;
			}, this))
			.on('onComplete', _.bind(function () {
				require('App:RainLoop').reloadMessageList(true, true);
			}, this))
		;

		return !!oJua;
	};

	module.exports = MailBoxMessageListViewModel;

}(module, require));

},{"$":20,"App:Knoin":27,"App:RainLoop":3,"Consts":6,"Enums":7,"Events":8,"Globals":9,"Jua":16,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Selector":13,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:Popup:AdvancedSearch":79,"View:Popup:Compose":82,"View:Popup:FolderClear":85,"_":25,"ifvisible":19,"key":21,"ko":22}],75:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Consts = require('Consts'),
		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Events = require('Events'),

		Cache = require('Storage:RainLoop:Cache'),
		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function MailBoxMessageViewViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'MailMessageView');

		var
			self = this,
			sLastEmail = '',
			createCommandHelper = function (sType) {
				return Utils.createCommand(self, function () {
					this.replyOrforward(sType);
				}, self.canBeRepliedOrForwarded);
			}
		;

		this.oMessageScrollerDom = null;

		this.message = Data.message;
		this.currentMessage = Data.currentMessage;
		this.messageListChecked = Data.messageListChecked;
		this.hasCheckedMessages = Data.hasCheckedMessages;
		this.messageListCheckedOrSelectedUidsWithSubMails = Data.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageLoading = Data.messageLoading;
		this.messageLoadingThrottle = Data.messageLoadingThrottle;
		this.messagesBodiesDom = Data.messagesBodiesDom;
		this.useThreads = Data.useThreads;
		this.replySameFolder = Data.replySameFolder;
		this.layout = Data.layout;
		this.usePreviewPane = Data.usePreviewPane;
		this.isMessageSelected = Data.isMessageSelected;
		this.messageActiveDom = Data.messageActiveDom;
		this.messageError = Data.messageError;

		this.fullScreenMode = Data.messageFullScreenMode;

		this.showFullInfo = ko.observable(false);
		this.moreDropdownTrigger = ko.observable(false);
		this.messageDomFocused = ko.observable(false).extend({'rateLimit': 0});

		this.messageVisibility = ko.computed(function () {
			return !this.messageLoadingThrottle() && !!this.message();
		}, this);

		this.message.subscribe(function (oMessage) {
			if (!oMessage)
			{
				this.currentMessage(null);
			}
		}, this);

		this.canBeRepliedOrForwarded = this.messageVisibility;

		// commands
		this.closeMessage = Utils.createCommand(this, function () {
			Data.message(null);
		});

		this.replyCommand = createCommandHelper(Enums.ComposeType.Reply);
		this.replyAllCommand = createCommandHelper(Enums.ComposeType.ReplyAll);
		this.forwardCommand = createCommandHelper(Enums.ComposeType.Forward);
		this.forwardAsAttachmentCommand = createCommandHelper(Enums.ComposeType.ForwardAsAttachment);
		this.editAsNewCommand = createCommandHelper(Enums.ComposeType.EditAsNew);

		this.messageVisibilityCommand = Utils.createCommand(this, Utils.emptyFunction, this.messageVisibility);

		this.messageEditCommand = Utils.createCommand(this, function () {
			this.editMessage();
		}, this.messageVisibility);

		this.deleteCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Trash,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Trash,
					Data.currentFolderFullNameRaw(),
					[this.message().uid], false);
			}
		}, this.messageVisibility);

		this.archiveCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Archive,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.spamCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.Spam,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.notSpamCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App:RainLoop').deleteMessagesFromFolder(Enums.FolderType.NotSpam,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		// viewer
		this.viewHash = '';
		this.viewSubject = ko.observable('');
		this.viewFromShort = ko.observable('');
		this.viewToShort = ko.observable('');
		this.viewFrom = ko.observable('');
		this.viewTo = ko.observable('');
		this.viewCc = ko.observable('');
		this.viewBcc = ko.observable('');
		this.viewDate = ko.observable('');
		this.viewSize = ko.observable('');
		this.viewMoment = ko.observable('');
		this.viewLineAsCcc = ko.observable('');
		this.viewViewLink = ko.observable('');
		this.viewDownloadLink = ko.observable('');
		this.viewUserPic = ko.observable(Consts.DataImages.UserDotPic);
		this.viewUserPicVisible = ko.observable(false);

		this.viewPgpPassword = ko.observable('');
		this.viewPgpSignedVerifyStatus = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyStatus() : Enums.SignedVerifyStatus.None;
		}, this);

		this.viewPgpSignedVerifyUser = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyUser() : '';
		}, this);

		this.message.subscribe(function (oMessage) {

			this.messageActiveDom(null);

			this.viewPgpPassword('');

			if (oMessage)
			{
				if (this.viewHash !== oMessage.hash)
				{
					this.scrollMessageToTop();
				}

				this.viewHash = oMessage.hash;
				this.viewSubject(oMessage.subject());
				this.viewFromShort(oMessage.fromToLine(true, true));
				this.viewToShort(oMessage.toToLine(true, true));
				this.viewFrom(oMessage.fromToLine(false));
				this.viewTo(oMessage.toToLine(false));
				this.viewCc(oMessage.ccToLine(false));
				this.viewBcc(oMessage.bccToLine(false));
				this.viewDate(oMessage.fullFormatDateValue());
				this.viewSize(oMessage.friendlySize());
				this.viewMoment(oMessage.momentDate());
				this.viewLineAsCcc(oMessage.lineAsCcc());
				this.viewViewLink(oMessage.viewLink());
				this.viewDownloadLink(oMessage.downloadLink());

				sLastEmail = oMessage.fromAsSingleEmail();
				Cache.getUserPic(sLastEmail, function (sPic, $sEmail) {
					if (sPic !== self.viewUserPic() && sLastEmail === $sEmail)
					{
						self.viewUserPicVisible(false);
						self.viewUserPic(Consts.DataImages.UserDotPic);
						if ('' !== sPic)
						{
							self.viewUserPicVisible(true);
							self.viewUserPic(sPic);
						}
					}
				});
			}
			else
			{
				this.viewHash = '';
				this.scrollMessageToTop();
			}

		}, this);

		this.fullScreenMode.subscribe(function (bValue) {
			if (bValue)
			{
				Globals.$html.addClass('rl-message-fullscreen');
			}
			else
			{
				Globals.$html.removeClass('rl-message-fullscreen');
			}

			Utils.windowResize();
		});

		this.messageLoadingThrottle.subscribe(function (bV) {
			if (bV)
			{
				Utils.windowResize();
			}
		});

		this.goUpCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-up');
		});

		this.goDownCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-down');
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:MailBoxMessageView', 'MailBoxMessageViewViewModel'], MailBoxMessageViewViewModel);
	_.extend(MailBoxMessageViewViewModel.prototype, KnoinAbstractViewModel.prototype);

	MailBoxMessageViewViewModel.prototype.isPgpActionVisible = function ()
	{
		return Enums.SignedVerifyStatus.Success !== this.viewPgpSignedVerifyStatus();
	};

	MailBoxMessageViewViewModel.prototype.isPgpStatusVerifyVisible = function ()
	{
		return Enums.SignedVerifyStatus.None !== this.viewPgpSignedVerifyStatus();
	};

	MailBoxMessageViewViewModel.prototype.isPgpStatusVerifySuccess = function ()
	{
		return Enums.SignedVerifyStatus.Success === this.viewPgpSignedVerifyStatus();
	};

	MailBoxMessageViewViewModel.prototype.pgpStatusVerifyMessage = function ()
	{
		var sResult = '';
		switch (this.viewPgpSignedVerifyStatus())
		{
			case Enums.SignedVerifyStatus.UnknownPublicKeys:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND');
				break;
			case Enums.SignedVerifyStatus.UnknownPrivateKey:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND');
				break;
			case Enums.SignedVerifyStatus.Unverified:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE');
				break;
			case Enums.SignedVerifyStatus.Error:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR');
				break;
			case Enums.SignedVerifyStatus.Success:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
					'USER': this.viewPgpSignedVerifyUser()
				});
				break;
		}

		return sResult;
	};

	MailBoxMessageViewViewModel.prototype.fullScreen = function ()
	{
		this.fullScreenMode(true);
		Utils.windowResize();
	};

	MailBoxMessageViewViewModel.prototype.unFullScreen = function ()
	{
		this.fullScreenMode(false);
		Utils.windowResize();
	};

	MailBoxMessageViewViewModel.prototype.toggleFullScreen = function ()
	{
		Utils.removeSelection();

		this.fullScreenMode(!this.fullScreenMode());
		Utils.windowResize();
	};

	/**
	 * @param {string} sType
	 */
	MailBoxMessageViewViewModel.prototype.replyOrforward = function (sType)
	{
		kn.showScreenPopup(require('View:Popup:Compose'), [sType, Data.message()]);
	};

	MailBoxMessageViewViewModel.prototype.onBuild = function (oDom)
	{
		var self = this;
		this.fullScreenMode.subscribe(function (bValue) {
			if (bValue)
			{
				self.message.focused(true);
			}
		}, this);

		$('.attachmentsPlace', oDom).magnificPopup({
			'delegate': '.magnificPopupImage:visible',
			'type': 'image',
			'gallery': {
				'enabled': true,
				'preload': [1, 1],
				'navigateByImgClick': true
			},
			'callbacks': {
				'open': function() {
					Globals.useKeyboardShortcuts(false);
				},
				'close': function() {
					Globals.useKeyboardShortcuts(true);
				}
			},
			'mainClass': 'mfp-fade',
			'removalDelay': 400
		});

		oDom
			.on('click', 'a', function (oEvent) {
				// setup maito protocol
				return !(!!oEvent && 3 !== oEvent['which'] && Utils.mailToHelper($(this).attr('href'), require('View:Popup:Compose')));
			})
			.on('click', '.attachmentsPlace .attachmentPreview', function (oEvent) {
				if (oEvent && oEvent.stopPropagation)
				{
					oEvent.stopPropagation();
				}
			})
			.on('click', '.attachmentsPlace .attachmentItem', function () {

				var
					oAttachment = ko.dataFor(this)
				;

				if (oAttachment && oAttachment.download)
				{
					require('App:RainLoop').download(oAttachment.linkDownload());
				}
			})
		;

		this.message.focused.subscribe(function (bValue) {
			if (bValue && !Utils.inFocus()) {
				this.messageDomFocused(true);
			} else {
				this.messageDomFocused(false);
				this.scrollMessageToTop();
				this.scrollMessageToLeft();
			}
		}, this);

		this.messageDomFocused.subscribe(function (bValue) {
			if (!bValue && Enums.KeyState.MessageView === Globals.keyScope())
			{
				this.message.focused(false);
			}
		}, this);

		Globals.keyScope.subscribe(function (sValue) {
			if (Enums.KeyState.MessageView === sValue && this.message.focused())
			{
				this.messageDomFocused(true);
			}
		}, this);

		this.oMessageScrollerDom = oDom.find('.messageItem .content');
		this.oMessageScrollerDom = this.oMessageScrollerDom && this.oMessageScrollerDom[0] ? this.oMessageScrollerDom : null;

		this.initShortcuts();
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.escShortcuts = function ()
	{
		if (this.viewModelVisibility() && this.message())
		{
			if (this.fullScreenMode())
			{
				this.fullScreenMode(false);
			}
			else if (Enums.Layout.NoPreview === Data.layout())
			{
				this.message(null);
			}
			else
			{
				this.message.focused(false);
			}

			return false;
		}
	};

	MailBoxMessageViewViewModel.prototype.initShortcuts = function ()
	{
		var
			self = this
		;

		// exit fullscreen, back
		key('esc', Enums.KeyState.MessageView, _.bind(this.escShortcuts, this));

		// fullscreen
		key('enter', Enums.KeyState.MessageView, function () {
			self.toggleFullScreen();
			return false;
		});

		key('enter', Enums.KeyState.MessageList, function () {
			if (Enums.Layout.NoPreview !== Data.layout() && self.message())
			{
				self.toggleFullScreen();
				return false;
			}
		});

		// TODO // more toggle
	//	key('', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
	//		self.moreDropdownTrigger(true);
	//		return false;
	//	});

		// reply
		key('r', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message())
			{
				self.replyCommand();
				return false;
			}
		});

		// replaAll
		key('a', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message())
			{
				self.replyAllCommand();
				return false;
			}
		});

		// forward
		key('f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message())
			{
				self.forwardCommand();
				return false;
			}
		});

		// message information
	//	key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
	//		if (oData.message())
	//		{
	//			self.showFullInfo(!self.showFullInfo());
	//			return false;
	//		}
	//	});

		// toggle message blockquotes
		key('b', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message() && Data.message().body)
			{
				Data.message().body.find('.rlBlockquoteSwitcher').click();
				return false;
			}
		});

		key('ctrl+left, command+left, ctrl+up, command+up', Enums.KeyState.MessageView, function () {
			self.goUpCommand();
			return false;
		});

		key('ctrl+right, command+right, ctrl+down, command+down', Enums.KeyState.MessageView, function () {
			self.goDownCommand();
			return false;
		});

		// print
		key('ctrl+p, command+p', Enums.KeyState.MessageView, function () {
			if (self.message())
			{
				self.message().printMessage();
			}

			return false;
		});

		// delete
		key('delete, shift+delete', Enums.KeyState.MessageView, function (event, handler) {
			if (event)
			{
				if (handler && 'shift+delete' === handler.shortcut)
				{
					self.deleteWithoutMoveCommand();
				}
				else
				{
					self.deleteCommand();
				}

				return false;
			}
		});

		// change focused state
		key('tab, shift+tab, left', Enums.KeyState.MessageView, function (event, handler) {
			if (!self.fullScreenMode() && self.message() && Enums.Layout.NoPreview !== Data.layout())
			{
				if (event && handler && 'left' === handler.shortcut)
				{
					if (self.oMessageScrollerDom && 0 < self.oMessageScrollerDom.scrollLeft())
					{
						return true;
					}

					self.message.focused(false);
				}
				else
				{
					self.message.focused(false);
				}
			}
			else if (self.message() && Enums.Layout.NoPreview === Data.layout() && event && handler && 'left' === handler.shortcut)
			{
				return true;
			}

			return false;
		});
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isDraftFolder = function ()
	{
		return Data.message() && Data.draftFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isSentFolder = function ()
	{
		return Data.message() && Data.sentFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isSpamFolder = function ()
	{
		return Data.message() && Data.spamFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isSpamDisabled = function ()
	{
		return Data.message() && Data.spamFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isArchiveFolder = function ()
	{
		return Data.message() && Data.archiveFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isArchiveDisabled = function ()
	{
		return Data.message() && Data.archiveFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isDraftOrSentFolder = function ()
	{
		return this.isDraftFolder() || this.isSentFolder();
	};

	MailBoxMessageViewViewModel.prototype.composeClick = function ()
	{
		kn.showScreenPopup(require('View:Popup:Compose'));
	};

	MailBoxMessageViewViewModel.prototype.editMessage = function ()
	{
		if (Data.message())
		{
			kn.showScreenPopup(require('View:Popup:Compose'), [Enums.ComposeType.Draft, Data.message()]);
		}
	};

	MailBoxMessageViewViewModel.prototype.scrollMessageToTop = function ()
	{
		if (this.oMessageScrollerDom)
		{
			this.oMessageScrollerDom.scrollTop(0);
			Utils.windowResize();
		}
	};

	MailBoxMessageViewViewModel.prototype.scrollMessageToLeft = function ()
	{
		if (this.oMessageScrollerDom)
		{
			this.oMessageScrollerDom.scrollLeft(0);
			Utils.windowResize();
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.showImages = function (oMessage)
	{
		if (oMessage && oMessage.showExternalImages)
		{
			oMessage.showExternalImages(true);
		}
	};

	/**
	 * @returns {string}
	 */
	MailBoxMessageViewViewModel.prototype.printableCheckedMessageCount = function ()
	{
		var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 0 < iCnt ? (100 > iCnt ? iCnt : '99+') : '';
	};


	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.verifyPgpSignedClearMessage = function (oMessage)
	{
		if (oMessage)
		{
			oMessage.verifyPgpSignedClearMessage();
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.decryptPgpEncryptedMessage = function (oMessage)
	{
		if (oMessage)
		{
			oMessage.decryptPgpEncryptedMessage(this.viewPgpPassword());
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.readReceipt = function (oMessage)
	{
		if (oMessage && '' !== oMessage.readReceipt())
		{
			Remote.sendReadReceiptMessage(Utils.emptyFunction, oMessage.folderFullNameRaw, oMessage.uid,
				oMessage.readReceipt(),
				Utils.i18n('READ_RECEIPT/SUBJECT', {'SUBJECT': oMessage.subject()}),
				Utils.i18n('READ_RECEIPT/BODY', {'READ-RECEIPT': Data.accountEmail()}));

			oMessage.isReadReceipt(true);

			Cache.storeMessageFlagsToCache(oMessage);

			require('App:RainLoop').reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	module.exports = MailBoxMessageViewViewModel;

}(module, require));
},{"$":20,"App:Knoin":27,"App:RainLoop":3,"Consts":6,"Enums":7,"Events":8,"Globals":9,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"View:Popup:Compose":82,"_":25,"key":21,"ko":22}],76:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		
		kn = require('App:Knoin'),
		AbstractSystemDropDownViewModel = require('View:RainLoop:AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownViewModel
	 */
	function MailBoxSystemDropDownViewModel()
	{
		AbstractSystemDropDownViewModel.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:MailBoxSystemDropDown', 'MailBoxSystemDropDownViewModel'], MailBoxSystemDropDownViewModel);
	_.extend(MailBoxSystemDropDownViewModel.prototype, AbstractSystemDropDownViewModel.prototype);

	module.exports = MailBoxSystemDropDownViewModel;

}(module, require));

},{"App:Knoin":27,"View:RainLoop:AbstractSystemDropDown":71,"_":25}],77:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsAddAccountViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddAccount');

		this.email = ko.observable('');
		this.password = ko.observable('');

		this.emailError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.email.subscribe(function () {
			this.emailError(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.emailFocus = ko.observable(false);

		this.addAccountCommand = Utils.createCommand(this, function () {

			this.emailError('' === Utils.trim(this.email()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.emailError() || this.passwordError())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.accountAdd(_.bind(function (sResult, oData) {

				this.submitRequest(false);
				if (Enums.StorageResultType.Success === sResult && oData && 'AccountAdd' === oData.Action)
				{
					if (oData.Result)
					{
						require('App:RainLoop').accountsAndIdentities();
						this.cancelCommand();
					}
					else if (oData.ErrorCode)
					{
						this.submitError(Utils.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.email(), '', this.password());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:AddAccount', 'PopupsAddAccountViewModel'], PopupsAddAccountViewModel);
	_.extend(PopupsAddAccountViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsAddAccountViewModel.prototype.clearPopup = function ()
	{
		this.email('');
		this.password('');

		this.emailError(false);
		this.passwordError(false);

		this.submitRequest(false);
		this.submitError('');
	};

	PopupsAddAccountViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsAddAccountViewModel.prototype.onFocus = function ()
	{
		this.emailFocus(true);
	};

	module.exports = PopupsAddAccountViewModel;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],78:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsAddOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddOpenPgpKey');

		this.key = ko.observable('');
		this.key.error = ko.observable(false);
		this.key.focus = ko.observable(false);

		this.key.subscribe(function () {
			this.key.error(false);
		}, this);

		this.addOpenPgpKeyCommand = Utils.createCommand(this, function () {

			var
				iCount = 30,
				aMatch = null,
				sKey = Utils.trim(this.key()),
				oReg = /[\-]{3,6}BEGIN[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[\-]{3,6}[\s\S]+?[\-]{3,6}END[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[\-]{3,6}/gi,
				oOpenpgpKeyring = Data.openpgpKeyring
			;

			sKey = sKey.replace(/[\r\n]([a-zA-Z0-9]{2,}:[^\r\n]+)[\r\n]+([a-zA-Z0-9\/\\+=]{10,})/g, '\n$1!-!N!-!$2')
				.replace(/[\n\r]+/g, '\n').replace(/!-!N!-!/g, '\n\n');

			this.key.error('' === sKey);

			if (!oOpenpgpKeyring || this.key.error())
			{
				return false;
			}

			do
			{
				aMatch = oReg.exec(sKey);
				if (!aMatch || 0 > iCount)
				{
					break;
				}

				if (aMatch[0] && aMatch[1] && aMatch[2] && aMatch[1] === aMatch[2])
				{
					if ('PRIVATE' === aMatch[1])
					{
						oOpenpgpKeyring.privateKeys.importKey(aMatch[0]);
					}
					else if ('PUBLIC' === aMatch[1])
					{
						oOpenpgpKeyring.publicKeys.importKey(aMatch[0]);
					}
				}

				iCount--;
			}
			while (true);

			oOpenpgpKeyring.store();

			require('App:RainLoop').reloadOpenPgpKeys();
			Utils.delegateRun(this, 'cancelCommand');

			return true;
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:AddOpenPgpKey', 'PopupsAddOpenPgpKeyViewModel'], PopupsAddOpenPgpKeyViewModel);
	_.extend(PopupsAddOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsAddOpenPgpKeyViewModel.prototype.clearPopup = function ()
	{
		this.key('');
		this.key.error(false);
	};

	PopupsAddOpenPgpKeyViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsAddOpenPgpKeyViewModel.prototype.onFocus = function ()
	{
		this.key.focus(true);
	};

	module.exports = PopupsAddOpenPgpKeyViewModel;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Utils":14,"_":25,"ko":22}],79:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		moment = require('moment'),

		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsAdvancedSearchViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAdvancedSearch');

		this.fromFocus = ko.observable(false);

		this.from = ko.observable('');
		this.to = ko.observable('');
		this.subject = ko.observable('');
		this.text = ko.observable('');
		this.selectedDateValue = ko.observable(-1);

		this.hasAttachment = ko.observable(false);
		this.starred = ko.observable(false);
		this.unseen = ko.observable(false);

		this.searchCommand = Utils.createCommand(this, function () {

			var sSearch = this.buildSearchString();
			if ('' !== sSearch)
			{
				Data.mainMessageListSearch(sSearch);
			}

			this.cancelCommand();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:AdvancedSearch', 'PopupsAdvancedSearchViewModel'], PopupsAdvancedSearchViewModel);
	_.extend(PopupsAdvancedSearchViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsAdvancedSearchViewModel.prototype.buildSearchStringValue = function (sValue)
	{
		if (-1 < sValue.indexOf(' '))
		{
			sValue = '"' + sValue + '"';
		}

		return sValue;
	};

	PopupsAdvancedSearchViewModel.prototype.buildSearchString = function ()
	{
		var
			aResult = [],
			sFrom = Utils.trim(this.from()),
			sTo = Utils.trim(this.to()),
			sSubject = Utils.trim(this.subject()),
			sText = Utils.trim(this.text()),
			aIs = [],
			aHas = []
		;

		if (sFrom && '' !== sFrom)
		{
			aResult.push('from:' + this.buildSearchStringValue(sFrom));
		}

		if (sTo && '' !== sTo)
		{
			aResult.push('to:' + this.buildSearchStringValue(sTo));
		}

		if (sSubject && '' !== sSubject)
		{
			aResult.push('subject:' + this.buildSearchStringValue(sSubject));
		}

		if (this.hasAttachment())
		{
			aHas.push('attachment');
		}

		if (this.unseen())
		{
			aIs.push('unseen');
		}

		if (this.starred())
		{
			aIs.push('flagged');
		}

		if (0 < aHas.length)
		{
			aResult.push('has:' + aHas.join(','));
		}

		if (0 < aIs.length)
		{
			aResult.push('is:' + aIs.join(','));
		}

		if (-1 < this.selectedDateValue())
		{
			aResult.push('date:' + moment().subtract('days', this.selectedDateValue()).format('YYYY.MM.DD') + '/');
		}

		if (sText && '' !== sText)
		{
			aResult.push('text:' + this.buildSearchStringValue(sText));
		}

		return Utils.trim(aResult.join(' '));
	};

	PopupsAdvancedSearchViewModel.prototype.clearPopup = function ()
	{
		this.from('');
		this.to('');
		this.subject('');
		this.text('');

		this.selectedDateValue(-1);
		this.hasAttachment(false);
		this.starred(false);
		this.unseen(false);

		this.fromFocus(true);
	};

	PopupsAdvancedSearchViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsAdvancedSearchViewModel.prototype.onFocus = function ()
	{
		this.fromFocus(true);
	};

	module.exports = PopupsAdvancedSearchViewModel;

}(module, require));
},{"App:Knoin":27,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Utils":14,"_":25,"ko":22,"moment":23}],80:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
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

	kn.extendAsViewModel(['View:Popup:Ask', 'PopupsAskViewModel'], PopupsAskViewModel);
	_.extend(PopupsAskViewModel.prototype, KnoinAbstractViewModel.prototype);

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

	module.exports = PopupsAskViewModel;

}(module, require));
},{"App:Knoin":27,"Enums":7,"Knoin:AbstractViewModel":30,"Utils":14,"_":25,"key":21,"ko":22}],81:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Utils = require('Utils'),
		Enums = require('Enums'),

		Data = require('Storage:RainLoop:Data'),

		EmailModel = require('Model:Email'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsComposeOpenPgpViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsComposeOpenPgp');

		this.notification = ko.observable('');

		this.sign = ko.observable(true);
		this.encrypt = ko.observable(true);

		this.password = ko.observable('');
		this.password.focus = ko.observable(false);
		this.buttonFocus = ko.observable(false);

		this.from = ko.observable('');
		this.to = ko.observableArray([]);
		this.text = ko.observable('');

		this.resultCallback = null;

		this.submitRequest = ko.observable(false);

		// commands
		this.doCommand = Utils.createCommand(this, function () {

			var
				self = this,
				bResult = true,
				oPrivateKey = null,
				aPublicKeys = []
			;

			this.submitRequest(true);

			if (bResult && this.sign() && '' === this.from())
			{
				this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_FROM_EMAIL'));
				bResult = false;
			}

			if (bResult && this.sign())
			{
				oPrivateKey = Data.findPrivateKeyByEmail(this.from(), this.password());
				if (!oPrivateKey)
				{
					this.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
						'EMAIL': this.from()
					}));

					bResult = false;
				}
			}

			if (bResult && this.encrypt() && 0 === this.to().length)
			{
				this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_AT_LEAST_ONE_RECIPIENT'));
				bResult = false;
			}

			if (bResult && this.encrypt())
			{
				aPublicKeys = [];
				_.each(this.to(), function (sEmail) {
					var aKeys = Data.findPublicKeysByEmail(sEmail);
					if (0 === aKeys.length && bResult)
					{
						self.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
							'EMAIL': sEmail
						}));

						bResult = false;
					}

					aPublicKeys = aPublicKeys.concat(aKeys);
				});

				if (bResult && (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length))
				{
					bResult = false;
				}
			}

			_.delay(function () {

				if (self.resultCallback && bResult)
				{
					try {

						if (oPrivateKey && 0 === aPublicKeys.length)
						{
							self.resultCallback(
								window.openpgp.signClearMessage([oPrivateKey], self.text())
							);
						}
						else if (oPrivateKey && 0 < aPublicKeys.length)
						{
							self.resultCallback(
								window.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text())
							);
						}
						else if (!oPrivateKey && 0 < aPublicKeys.length)
						{
							self.resultCallback(
								window.openpgp.encryptMessage(aPublicKeys, self.text())
							);
						}
					}
					catch (e)
					{
						self.notification(Utils.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
							'ERROR': '' + e
						}));

						bResult = false;
					}
				}

				if (bResult)
				{
					self.cancelCommand();
				}

				self.submitRequest(false);

			}, 10);

		}, function () {
			return !this.submitRequest() &&	(this.sign() || this.encrypt());
		});

		this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:ComposeOpenPgp', 'PopupsComposeOpenPgpViewModel'], PopupsComposeOpenPgpViewModel);
	_.extend(PopupsComposeOpenPgpViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
	{
		this.notification('');

		this.password('');
		this.password.focus(false);
		this.buttonFocus(false);

		this.from('');
		this.to([]);
		this.text('');

		this.submitRequest(false);

		this.resultCallback = null;
	};

	PopupsComposeOpenPgpViewModel.prototype.onBuild = function ()
	{
		key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function () {

			switch (true)
			{
				case this.password.focus():
					this.buttonFocus(true);
					break;
				case this.buttonFocus():
					this.password.focus(true);
					break;
			}

			return false;

		}, this));
	};

	PopupsComposeOpenPgpViewModel.prototype.onHide = function ()
	{
		this.clearPopup();
	};

	PopupsComposeOpenPgpViewModel.prototype.onFocus = function ()
	{
		if (this.sign())
		{
			this.password.focus(true);
		}
		else
		{
			this.buttonFocus(true);
		}
	};

	PopupsComposeOpenPgpViewModel.prototype.onShow = function (fCallback, sText, sFromEmail, sTo, sCc, sBcc)
	{
		this.clearPopup();

		var
			oEmail = new EmailModel(),
			sResultFromEmail = '',
			aRec = []
		;

		this.resultCallback = fCallback;

		oEmail.clear();
		oEmail.mailsoParse(sFromEmail);
		if ('' !== oEmail.email)
		{
			sResultFromEmail = oEmail.email;
		}

		if ('' !== sTo)
		{
			aRec.push(sTo);
		}

		if ('' !== sCc)
		{
			aRec.push(sCc);
		}

		if ('' !== sBcc)
		{
			aRec.push(sBcc);
		}

		aRec = aRec.join(', ').split(',');
		aRec = _.compact(_.map(aRec, function (sValue) {
			oEmail.clear();
			oEmail.mailsoParse(Utils.trim(sValue));
			return '' === oEmail.email ? false : oEmail.email;
		}));

		this.from(sResultFromEmail);
		this.to(aRec);
		this.text(sText);
	};

	module.exports = PopupsComposeOpenPgpViewModel;

}(module, require));
},{"App:Knoin":27,"Enums":7,"Knoin:AbstractViewModel":30,"Model:Email":37,"Storage:RainLoop:Data":64,"Utils":14,"_":25,"key":21,"ko":22,"window":26}],82:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		moment = require('moment'),
		JSON = require('JSON'),
		Jua = require('Jua'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Utils = require('Utils'),
		Globals = require('Globals'),
		Events = require('Events'),
		LinkBuilder = require('LinkBuilder'),
		HtmlEditor = require('HtmlEditor'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Cache = require('Storage:RainLoop:Cache'),
		Remote = require('Storage:RainLoop:Remote'),

		ComposeAttachmentModel = require('Model:ComposeAttachment'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsComposeViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsCompose');

		this.oEditor = null;
		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.bSkipNext = false;
		this.sReferences = '';

		this.bCapaAdditionalIdentities = Settings.capa(Enums.Capa.AdditionalIdentities);

		var
			self = this,
			fCcAndBccCheckHelper = function (aValue) {
				if (false === self.showCcAndBcc() && 0 < aValue.length)
				{
					self.showCcAndBcc(true);
				}
			}
		;

		this.capaOpenPGP = Data.capaOpenPGP;

		this.resizer = ko.observable(false).extend({'throttle': 50});

		this.identitiesDropdownTrigger = ko.observable(false);

		this.to = ko.observable('');
		this.to.focusTrigger = ko.observable(false);
		this.cc = ko.observable('');
		this.bcc = ko.observable('');

		this.replyTo = ko.observable('');
		this.subject = ko.observable('');
		this.isHtml = ko.observable(false);

		this.requestReadReceipt = ko.observable(false);

		this.sendError = ko.observable(false);
		this.sendSuccessButSaveError = ko.observable(false);
		this.savedError = ko.observable(false);

		this.savedTime = ko.observable(0);
		this.savedOrSendingText = ko.observable('');

		this.emptyToError = ko.observable(false);
		this.attachmentsInProcessError = ko.observable(false);
		this.showCcAndBcc = ko.observable(false);

		this.cc.subscribe(fCcAndBccCheckHelper, this);
		this.bcc.subscribe(fCcAndBccCheckHelper, this);

		this.draftFolder = ko.observable('');
		this.draftUid = ko.observable('');
		this.sending = ko.observable(false);
		this.saving = ko.observable(false);
		this.attachments = ko.observableArray([]);

		this.attachmentsInProcess = this.attachments.filter(function (oItem) {
			return oItem && '' === oItem.tempName();
		});

		this.attachmentsInReady = this.attachments.filter(function (oItem) {
			return oItem && '' !== oItem.tempName();
		});

		this.attachments.subscribe(function () {
			this.triggerForResize();
		}, this);

		this.isDraftFolderMessage = ko.computed(function () {
			return '' !== this.draftFolder() && '' !== this.draftUid();
		}, this);

		this.composeUploaderButton = ko.observable(null);
		this.composeUploaderDropPlace = ko.observable(null);
		this.dragAndDropEnabled = ko.observable(false);
		this.dragAndDropOver = ko.observable(false).extend({'throttle': 1});
		this.dragAndDropVisible = ko.observable(false).extend({'throttle': 1});
		this.attacheMultipleAllowed = ko.observable(false);
		this.addAttachmentEnabled = ko.observable(false);

		this.composeEditorArea = ko.observable(null);

		this.identities = Data.identities;
		this.defaultIdentityID = Data.defaultIdentityID;
		this.currentIdentityID = ko.observable('');

		this.currentIdentityString = ko.observable('');
		this.currentIdentityResultEmail = ko.observable('');

		this.identitiesOptions = ko.computed(function () {

			var aList = [{
				'optValue': Data.accountEmail(),
				'optText': this.formattedFrom(false)
			}];

			_.each(Data.identities(), function (oItem) {
				aList.push({
					'optValue': oItem.id,
					'optText': oItem.formattedNameForCompose()
				});
			});

			return aList;

		}, this);

		ko.computed(function () {

			var
				sResult = '',
				sResultEmail = '',
				oItem = null,
				aList = this.identities(),
				sID = this.currentIdentityID()
			;

			if (this.bCapaAdditionalIdentities && sID && sID !== Data.accountEmail())
			{
				oItem = _.find(aList, function (oItem) {
					return oItem && sID === oItem['id'];
				});

				sResult = oItem ? oItem.formattedNameForCompose() : '';
				sResultEmail = oItem ? oItem.formattedNameForEmail() : '';

				if ('' === sResult && aList[0])
				{
					this.currentIdentityID(aList[0]['id']);
					return '';
				}
			}

			if ('' === sResult)
			{
				sResult = this.formattedFrom(false);
				sResultEmail = this.formattedFrom(true);
			}

			this.currentIdentityString(sResult);
			this.currentIdentityResultEmail(sResultEmail);

			return sResult;

		}, this);

		this.to.subscribe(function (sValue) {
			if (this.emptyToError() && 0 < sValue.length)
			{
				this.emptyToError(false);
			}
		}, this);

		this.attachmentsInProcess.subscribe(function (aValue) {
			if (this.attachmentsInProcessError() && Utils.isArray(aValue) && 0 === aValue.length)
			{
				this.attachmentsInProcessError(false);
			}
		}, this);

		this.editorResizeThrottle = _.throttle(_.bind(this.editorResize, this), 100);

		this.resizer.subscribe(function () {
			this.editorResizeThrottle();
		}, this);

		this.canBeSendedOrSaved = ko.computed(function () {
			return !this.sending() && !this.saving();
		}, this);

		this.deleteCommand = Utils.createCommand(this, function () {

			require('App:RainLoop').deleteMessagesFromFolderWithoutCheck(this.draftFolder(), [this.draftUid()]);
			kn.hideScreenPopup(PopupsComposeViewModel);

		}, function () {
			return this.isDraftFolderMessage();
		});

		this.sendMessageResponse = _.bind(this.sendMessageResponse, this);
		this.saveMessageResponse = _.bind(this.saveMessageResponse, this);

		this.sendCommand = Utils.createCommand(this, function () {
			var
				sTo = Utils.trim(this.to()),
				sSentFolder = Data.sentFolder(),
				aFlagsCache = []
			;

			if (0 < this.attachmentsInProcess().length)
			{
				this.attachmentsInProcessError(true);
			}
			else if (0 === sTo.length)
			{
				this.emptyToError(true);
			}
			else
			{
				if (Data.replySameFolder())
				{
					if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length && Utils.isNormal(this.aDraftInfo[2]) && 0 < this.aDraftInfo[2].length)
					{
						sSentFolder = this.aDraftInfo[2];
					}
				}

				if ('' === sSentFolder)
				{
					kn.showScreenPopup(require('View:Popup:FolderSystem'), [Enums.SetSystemFoldersNotification.Sent]);
				}
				else
				{
					this.sendError(false);
					this.sending(true);

					if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length)
					{
						aFlagsCache = Cache.getMessageFlagsFromCache(this.aDraftInfo[2], this.aDraftInfo[1]);
						if (aFlagsCache)
						{
							if ('forward' === this.aDraftInfo[0])
							{
								aFlagsCache[3] = true;
							}
							else
							{
								aFlagsCache[2] = true;
							}

							Cache.setMessageFlagsToCache(this.aDraftInfo[2], this.aDraftInfo[1], aFlagsCache);
							require('App:RainLoop').reloadFlagsCurrentMessageListAndMessageFromCache();
							Cache.setFolderHash(this.aDraftInfo[2], '');
						}
					}

					sSentFolder = Consts.Values.UnuseOptionValue === sSentFolder ? '' : sSentFolder;

					Cache.setFolderHash(this.draftFolder(), '');
					Cache.setFolderHash(sSentFolder, '');

					Remote.sendMessage(
						this.sendMessageResponse,
						this.draftFolder(),
						this.draftUid(),
						sSentFolder,
						this.currentIdentityResultEmail(),
						sTo,
						this.cc(),
						this.bcc(),
						this.subject(),
						this.oEditor ? this.oEditor.isHtml() : false,
						this.oEditor ? this.oEditor.getData(true) : '',
						this.prepearAttachmentsForSendOrSave(),
						this.aDraftInfo,
						this.sInReplyTo,
						this.sReferences,
						this.requestReadReceipt()
					);
				}
			}
		}, this.canBeSendedOrSaved);

		this.saveCommand = Utils.createCommand(this, function () {

			if (Data.draftFolderNotEnabled())
			{
				kn.showScreenPopup(require('View:Popup:FolderSystem'), [Enums.SetSystemFoldersNotification.Draft]);
			}
			else
			{
				this.savedError(false);
				this.saving(true);

				this.bSkipNext = true;

				Cache.setFolderHash(Data.draftFolder(), '');

				Remote.saveMessage(
					this.saveMessageResponse,
					this.draftFolder(),
					this.draftUid(),
					Data.draftFolder(),
					this.currentIdentityResultEmail(),
					this.to(),
					this.cc(),
					this.bcc(),
					this.subject(),
					this.oEditor ? this.oEditor.isHtml() : false,
					this.oEditor ? this.oEditor.getData(true) : '',
					this.prepearAttachmentsForSendOrSave(),
					this.aDraftInfo,
					this.sInReplyTo,
					this.sReferences
				);
			}

		}, this.canBeSendedOrSaved);

		Events.sub('interval.1m', function () {
			if (this.modalVisibility() && !Data.draftFolderNotEnabled() && !this.isEmptyForm(false) &&
				!this.bSkipNext && !this.saving() && !this.sending() && !this.savedError())
			{
				this.bSkipNext = false;
				this.saveCommand();
			}
		}, this);

		this.showCcAndBcc.subscribe(function () {
			this.triggerForResize();
		}, this);

		this.dropboxEnabled = ko.observable(!!Settings.settingsGet('DropboxApiKey'));

		this.dropboxCommand = Utils.createCommand(this, function () {

			if (window.Dropbox)
			{
				window.Dropbox.choose({
					//'iframe': true,
					'success': function(aFiles) {

						if (aFiles && aFiles[0] && aFiles[0]['link'])
						{
							self.addDropboxAttachment(aFiles[0]);
						}
					},
					'linkType': "direct",
					'multiselect': false
				});
			}

			return true;

		}, function () {
			return this.dropboxEnabled();
		});

		this.driveEnabled = ko.observable(Globals.bXMLHttpRequestSupported &&
			!!Settings.settingsGet('GoogleClientID') && !!Settings.settingsGet('GoogleApiKey'));

		this.driveVisible = ko.observable(false);

		this.driveCommand = Utils.createCommand(this, function () {

			this.driveOpenPopup();
			return true;

		}, function () {
			return this.driveEnabled();
		});

		this.driveCallback = _.bind(this.driveCallback, this);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.Compose;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

		this.emailsSource = _.bind(this.emailsSource, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Compose', 'PopupsComposeViewModel'], PopupsComposeViewModel);
	_.extend(PopupsComposeViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsComposeViewModel.prototype.emailsSource = function (oData, fResponse)
	{
		require('App:RainLoop').getAutocomplete(oData.term, function (aData) {
			fResponse(_.map(aData, function (oEmailItem) {
				return oEmailItem.toLine(false);
			}));
		});
	};

	PopupsComposeViewModel.prototype.openOpenPgpPopup = function ()
	{
		if (this.capaOpenPGP() && this.oEditor && !this.oEditor.isHtml())
		{
			var self = this;
			kn.showScreenPopup(require('View:Popup:ComposeOpenPgp'), [
				function (sResult) {
					self.editor(function (oEditor) {
						oEditor.setPlain(sResult);
					});
				},
				this.oEditor.getData(),
				this.currentIdentityResultEmail(),
				this.to(),
				this.cc(),
				this.bcc()
			]);
		}
	};

	PopupsComposeViewModel.prototype.reloadDraftFolder = function ()
	{
		var
			sDraftFolder = Data.draftFolder()
		;

		if ('' !== sDraftFolder)
		{
			Cache.setFolderHash(sDraftFolder, '');
			if (Data.currentFolderFullNameRaw() === sDraftFolder)
			{
				require('App:RainLoop').reloadMessageList(true);
			}
			else
			{
				require('App:RainLoop').folderInformation(sDraftFolder);
			}
		}
	};

	PopupsComposeViewModel.prototype.findIdentityIdByMessage = function (sComposeType, oMessage)
	{
		var
			oIDs = {},
			sResult = '',
			fFindHelper = function (oItem) {
				if (oItem && oItem.email && oIDs[oItem.email])
				{
					sResult = oIDs[oItem.email];
					return true;
				}

				return false;
			}
		;

		if (this.bCapaAdditionalIdentities)
		{
			_.each(this.identities(), function (oItem) {
				oIDs[oItem.email()] = oItem['id'];
			});
		}

		oIDs[Data.accountEmail()] = Data.accountEmail();

		if (oMessage)
		{
			switch (sComposeType)
			{
				case Enums.ComposeType.Empty:
					break;
				case Enums.ComposeType.Reply:
				case Enums.ComposeType.ReplyAll:
				case Enums.ComposeType.Forward:
				case Enums.ComposeType.ForwardAsAttachment:
					_.find(_.union(oMessage.to, oMessage.cc, oMessage.bcc, oMessage.deliveredTo), fFindHelper);
					break;
				case Enums.ComposeType.Draft:
					_.find(_.union(oMessage.from, oMessage.replyTo), fFindHelper);
					break;
			}
		}

		if ('' === sResult)
		{
			sResult = this.defaultIdentityID();
		}

		if ('' === sResult)
		{
			sResult = Data.accountEmail();
		}

		return sResult;
	};

	PopupsComposeViewModel.prototype.selectIdentity = function (oIdentity)
	{
		if (oIdentity)
		{
			this.currentIdentityID(oIdentity.optValue);
		}
	};

	/**
	 *
	 * @param {boolean=} bHeaderResult = false
	 * @returns {string}
	 */
	PopupsComposeViewModel.prototype.formattedFrom = function (bHeaderResult)
	{
		var
			sDisplayName = Data.displayName(),
			sEmail = Data.accountEmail()
		;

		return '' === sDisplayName ? sEmail :
			((Utils.isUnd(bHeaderResult) ? false : !!bHeaderResult) ?
				'"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>' :
				sDisplayName + ' (' + sEmail + ')')
		;
	};

	PopupsComposeViewModel.prototype.sendMessageResponse = function (sResult, oData)
	{
		var
			bResult = false,
			sMessage = ''
		;

		this.sending(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			bResult = true;
			if (this.modalVisibility())
			{
				Utils.delegateRun(this, 'closeCommand');
			}
		}

		if (this.modalVisibility() && !bResult)
		{
			if (oData && Enums.Notification.CantSaveMessage === oData.ErrorCode)
			{
				this.sendSuccessButSaveError(true);
				window.alert(Utils.trim(Utils.i18n('COMPOSE/SAVED_ERROR_ON_SEND')));
			}
			else
			{
				sMessage = Utils.getNotification(oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantSendMessage,
					oData && oData.ErrorMessage ? oData.ErrorMessage : '');

				this.sendError(true);
				window.alert(sMessage || Utils.getNotification(Enums.Notification.CantSendMessage));
			}
		}

		this.reloadDraftFolder();
	};

	PopupsComposeViewModel.prototype.saveMessageResponse = function (sResult, oData)
	{
		var
			bResult = false,
			oMessage = null
		;

		this.saving(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			if (oData.Result.NewFolder && oData.Result.NewUid)
			{
				if (this.bFromDraft)
				{
					oMessage = Data.message();
					if (oMessage && this.draftFolder() === oMessage.folderFullNameRaw && this.draftUid() === oMessage.uid)
					{
						Data.message(null);
					}
				}

				this.draftFolder(oData.Result.NewFolder);
				this.draftUid(oData.Result.NewUid);

				if (this.modalVisibility())
				{
					this.savedTime(window.Math.round((new window.Date()).getTime() / 1000));

					this.savedOrSendingText(
						0 < this.savedTime() ? Utils.i18n('COMPOSE/SAVED_TIME', {
							'TIME': moment.unix(this.savedTime() - 1).format('LT')
						}) : ''
					);

					bResult = true;

					if (this.bFromDraft)
					{
						Cache.setFolderHash(this.draftFolder(), '');
					}
				}
			}
		}

		if (!this.modalVisibility() && !bResult)
		{
			this.savedError(true);
			this.savedOrSendingText(Utils.getNotification(Enums.Notification.CantSaveMessage));
		}

		this.reloadDraftFolder();
	};

	PopupsComposeViewModel.prototype.onHide = function ()
	{
		this.reset();
		kn.routeOn();
	};

	/**
	 * @param {string} sSignature
	 * @param {string=} sFrom
	 * @param {string=} sData
	 * @param {string=} sComposeType
	 * @return {string}
	 */
	PopupsComposeViewModel.prototype.convertSignature = function (sSignature, sFrom, sData, sComposeType)
	{
		var bHtml = false, bData = false;
		if ('' !== sSignature)
		{
			if (':HTML:' === sSignature.substr(0, 6))
			{
				bHtml = true;
				sSignature = sSignature.substr(6);
			}

			sSignature = sSignature.replace(/[\r]/g, '');

			sFrom = Utils.pString(sFrom);
			if ('' !== sFrom)
			{
				sSignature = sSignature.replace(/{{FROM}}/g, sFrom);
			}

			sSignature = sSignature.replace(/[\s]{1,2}{{FROM}}/g, '{{FROM}}');

			sSignature = sSignature.replace(/{{FROM}}/g, '');
			sSignature = sSignature.replace(/{{DATE}}/g, moment().format('llll'));

			if (sData && Enums.ComposeType.Empty === sComposeType &&
				-1 < sSignature.indexOf('{{DATA}}'))
			{
				bData = true;
				sSignature = sSignature.replace('{{DATA}}', sData);
			}

			sSignature = sSignature.replace(/{{DATA}}/g, '');

			if (!bHtml)
			{
				sSignature = Utils.convertPlainTextToHtml(sSignature);
			}
		}

		if (sData && !bData)
		{
			switch (sComposeType)
			{
				case Enums.ComposeType.Empty:
					sSignature = sData + '<br />' + sSignature;
					break;
				default:
					sSignature = sSignature + '<br />' + sData;
					break;
			}
		}

		return sSignature;
	};

	PopupsComposeViewModel.prototype.editor = function (fOnInit)
	{
		if (fOnInit)
		{
			var self = this;
			if (!this.oEditor && this.composeEditorArea())
			{
				_.delay(function () {
					self.oEditor = new HtmlEditor(self.composeEditorArea(), null, function () {
						fOnInit(self.oEditor);
					}, function (bHtml) {
						self.isHtml(!!bHtml);
					});
				}, 300);
			}
			else if (this.oEditor)
			{
				fOnInit(this.oEditor);
			}
		}
	};

	/**
	 * @param {string=} sType = Enums.ComposeType.Empty
	 * @param {?MessageModel|Array=} oMessageOrArray = null
	 * @param {Array=} aToEmails = null
	 * @param {string=} sCustomSubject = null
	 * @param {string=} sCustomPlainText = null
	 */
	PopupsComposeViewModel.prototype.onShow = function (sType, oMessageOrArray, aToEmails, sCustomSubject, sCustomPlainText)
	{
		kn.routeOff();

		var
			self = this,
			sFrom = '',
			sTo = '',
			sCc = '',
			sDate = '',
			sSubject = '',
			oText = null,
			sText = '',
			sReplyTitle = '',
			aResplyAllParts = [],
			oExcludeEmail = {},
			mEmail = Data.accountEmail(),
			sSignature = Data.signature(),
			bSignatureToAll = Data.signatureToAll(),
			aDownloads = [],
			aDraftInfo = null,
			oMessage = null,
			sComposeType = sType || Enums.ComposeType.Empty,
			fEmailArrayToStringLineHelper = function (aList, bFriendly) {

				var
					iIndex = 0,
					iLen = aList.length,
					aResult = []
				;

				for (; iIndex < iLen; iIndex++)
				{
					aResult.push(aList[iIndex].toLine(!!bFriendly));
				}

				return aResult.join(', ');
			}
		;

		oMessageOrArray = oMessageOrArray || null;
		if (oMessageOrArray && Utils.isNormal(oMessageOrArray))
		{
			oMessage = Utils.isArray(oMessageOrArray) && 1 === oMessageOrArray.length ? oMessageOrArray[0] :
				(!Utils.isArray(oMessageOrArray) ? oMessageOrArray : null);
		}

		if (null !== mEmail)
		{
			oExcludeEmail[mEmail] = true;
		}

		this.currentIdentityID(this.findIdentityIdByMessage(sComposeType, oMessage));
		this.reset();

		if (Utils.isNonEmptyArray(aToEmails))
		{
			this.to(fEmailArrayToStringLineHelper(aToEmails));
		}

		if ('' !== sComposeType && oMessage)
		{
			sDate = oMessage.fullFormatDateValue();
			sSubject = oMessage.subject();
			aDraftInfo = oMessage.aDraftInfo;

			oText = $(oMessage.body).clone();
			if (oText)
			{
				oText.find('blockquote.rl-bq-switcher').each(function () {
					$(this).removeClass('rl-bq-switcher hidden-bq');
				});
				oText.find('.rlBlockquoteSwitcher').each(function () {
					$(this).remove();
				});
			}

			oText.find('[data-html-editor-font-wrapper]').removeAttr('data-html-editor-font-wrapper');
			sText = oText.html();

			switch (sComposeType)
			{
				case Enums.ComposeType.Empty:
					break;

				case Enums.ComposeType.Reply:
					this.to(fEmailArrayToStringLineHelper(oMessage.replyEmails(oExcludeEmail)));
					this.subject(Utils.replySubjectAdd('Re', sSubject));
					this.prepearMessageAttachments(oMessage, sComposeType);
					this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
					this.sInReplyTo = oMessage.sMessageId;
					this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
					break;

				case Enums.ComposeType.ReplyAll:
					aResplyAllParts = oMessage.replyAllEmails(oExcludeEmail);
					this.to(fEmailArrayToStringLineHelper(aResplyAllParts[0]));
					this.cc(fEmailArrayToStringLineHelper(aResplyAllParts[1]));
					this.subject(Utils.replySubjectAdd('Re', sSubject));
					this.prepearMessageAttachments(oMessage, sComposeType);
					this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
					this.sInReplyTo = oMessage.sMessageId;
					this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.references());
					break;

				case Enums.ComposeType.Forward:
					this.subject(Utils.replySubjectAdd('Fwd', sSubject));
					this.prepearMessageAttachments(oMessage, sComposeType);
					this.aDraftInfo = ['forward', oMessage.uid, oMessage.folderFullNameRaw];
					this.sInReplyTo = oMessage.sMessageId;
					this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
					break;

				case Enums.ComposeType.ForwardAsAttachment:
					this.subject(Utils.replySubjectAdd('Fwd', sSubject));
					this.prepearMessageAttachments(oMessage, sComposeType);
					this.aDraftInfo = ['forward', oMessage.uid, oMessage.folderFullNameRaw];
					this.sInReplyTo = oMessage.sMessageId;
					this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
					break;

				case Enums.ComposeType.Draft:
					this.to(fEmailArrayToStringLineHelper(oMessage.to));
					this.cc(fEmailArrayToStringLineHelper(oMessage.cc));
					this.bcc(fEmailArrayToStringLineHelper(oMessage.bcc));

					this.bFromDraft = true;

					this.draftFolder(oMessage.folderFullNameRaw);
					this.draftUid(oMessage.uid);

					this.subject(sSubject);
					this.prepearMessageAttachments(oMessage, sComposeType);

					this.aDraftInfo = Utils.isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
					this.sInReplyTo = oMessage.sInReplyTo;
					this.sReferences = oMessage.sReferences;
					break;

				case Enums.ComposeType.EditAsNew:
					this.to(fEmailArrayToStringLineHelper(oMessage.to));
					this.cc(fEmailArrayToStringLineHelper(oMessage.cc));
					this.bcc(fEmailArrayToStringLineHelper(oMessage.bcc));

					this.subject(sSubject);
					this.prepearMessageAttachments(oMessage, sComposeType);

					this.aDraftInfo = Utils.isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
					this.sInReplyTo = oMessage.sInReplyTo;
					this.sReferences = oMessage.sReferences;
					break;
			}

			switch (sComposeType)
			{
				case Enums.ComposeType.Reply:
				case Enums.ComposeType.ReplyAll:
					sFrom = oMessage.fromToLine(false, true);
					sReplyTitle = Utils.i18n('COMPOSE/REPLY_MESSAGE_TITLE', {
						'DATETIME': sDate,
						'EMAIL': sFrom
					});

					sText = '<br /><br />' + sReplyTitle + ':' +
						'<blockquote><p>' + sText + '</p></blockquote>';

					break;

				case Enums.ComposeType.Forward:
					sFrom = oMessage.fromToLine(false, true);
					sTo = oMessage.toToLine(false, true);
					sCc = oMessage.ccToLine(false, true);
					sText = '<br /><br /><br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TITLE') +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_FROM') + ': ' + sFrom +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TO') + ': ' + sTo +
							(0 < sCc.length ? '<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_CC') + ': ' + sCc : '') +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT') + ': ' + Utils.encodeHtml(sDate) +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SUBJECT') + ': ' + Utils.encodeHtml(sSubject) +
							'<br /><br />' + sText;
					break;
				case Enums.ComposeType.ForwardAsAttachment:
					sText = '';
					break;
			}

			if (bSignatureToAll && '' !== sSignature &&
				Enums.ComposeType.EditAsNew !== sComposeType && Enums.ComposeType.Draft !== sComposeType)
			{
				sText = this.convertSignature(sSignature, fEmailArrayToStringLineHelper(oMessage.from, true), sText, sComposeType);
			}

			this.editor(function (oEditor) {
				oEditor.setHtml(sText, false);
				if (!oMessage.isHtml())
				{
					oEditor.modeToggle(false);
				}
			});
		}
		else if (Enums.ComposeType.Empty === sComposeType)
		{
			this.subject(Utils.isNormal(sCustomSubject) ? '' + sCustomSubject : '');

			sText = Utils.isNormal(sCustomPlainText) ? '' + sCustomPlainText : '';
			if (bSignatureToAll && '' !== sSignature)
			{
				sText = this.convertSignature(sSignature, '',
					Utils.convertPlainTextToHtml(sText), sComposeType);
			}

			this.editor(function (oEditor) {
				oEditor.setHtml(sText, false);
				if (Enums.EditorDefaultType.Html !== Data.editorDefaultType())
				{
					oEditor.modeToggle(false);
				}
			});
		}
		else if (Utils.isNonEmptyArray(oMessageOrArray))
		{
			_.each(oMessageOrArray, function (oMessage) {
				self.addMessageAsAttachment(oMessage);
			});
		}

		aDownloads = this.getAttachmentsDownloadsForUpload();
		if (Utils.isNonEmptyArray(aDownloads))
		{
			Remote.messageUploadAttachments(function (sResult, oData) {

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					var
						oAttachment = null,
						sTempName = ''
					;

					if (!self.viewModelVisibility())
					{
						for (sTempName in oData.Result)
						{
							if (oData.Result.hasOwnProperty(sTempName))
							{
								oAttachment = self.getAttachmentById(oData.Result[sTempName]);
								if (oAttachment)
								{
									oAttachment.tempName(sTempName);
								}
							}
						}
					}
				}
				else
				{
					self.setMessageAttachmentFailedDowbloadText();
				}

			}, aDownloads);
		}

		this.triggerForResize();
	};

	PopupsComposeViewModel.prototype.onFocus = function ()
	{
		if ('' === this.to())
		{
			this.to.focusTrigger(!this.to.focusTrigger());
		}
		else if (this.oEditor)
		{
			this.oEditor.focus();
		}

		this.triggerForResize();
	};

	PopupsComposeViewModel.prototype.editorResize = function ()
	{
		if (this.oEditor)
		{
			this.oEditor.resize();
		}
	};

	PopupsComposeViewModel.prototype.tryToClosePopup = function ()
	{
		var
			self = this,
			PopupsAskViewModel = require('View:Popup:Ask')
		;

		if (!kn.isPopupVisible(PopupsAskViewModel))
		{
			kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
				if (self.modalVisibility())
				{
					Utils.delegateRun(self, 'closeCommand');
				}
			}]);
		}
	};

	PopupsComposeViewModel.prototype.onBuild = function ()
	{
		this.initUploader();

		var
			self = this,
			oScript = null
		;

		key('ctrl+q, command+q', Enums.KeyState.Compose, function () {
			self.identitiesDropdownTrigger(true);
			return false;
		});

		key('ctrl+s, command+s', Enums.KeyState.Compose, function () {
			self.saveCommand();
			return false;
		});

		key('ctrl+enter, command+enter', Enums.KeyState.Compose, function () {
			self.sendCommand();
			return false;
		});

		key('esc', Enums.KeyState.Compose, function () {
			if (self.modalVisibility())
			{
				self.tryToClosePopup();
			}
			return false;
		});

		Globals.$win.on('resize', function () {
			self.triggerForResize();
		});

		if (this.dropboxEnabled())
		{
			oScript = window.document.createElement('script');
			oScript.type = 'text/javascript';
			oScript.src = 'https://www.dropbox.com/static/api/1/dropins.js';
			$(oScript).attr('id', 'dropboxjs').attr('data-app-key', Settings.settingsGet('DropboxApiKey'));

			window.document.body.appendChild(oScript);
		}

		if (this.driveEnabled())
		{
			$.getScript('https://apis.google.com/js/api.js', function () {
				if (window.gapi)
				{
					self.driveVisible(true);
				}
			});
		}
	};

	PopupsComposeViewModel.prototype.driveCallback = function (sAccessToken, oData)
	{
		if (oData && window.XMLHttpRequest && window.google &&
			oData[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED &&
			oData[window.google.picker.Response.DOCUMENTS] && oData[window.google.picker.Response.DOCUMENTS][0] &&
			oData[window.google.picker.Response.DOCUMENTS][0]['id'])
		{
			var
				self = this,
				oRequest = new window.XMLHttpRequest()
			;

			oRequest.open('GET', 'https://www.googleapis.com/drive/v2/files/' + oData[window.google.picker.Response.DOCUMENTS][0]['id']);
			oRequest.setRequestHeader('Authorization', 'Bearer ' + sAccessToken);
			oRequest.addEventListener('load', function() {
				if (oRequest && oRequest.responseText)
				{
					var oItem = JSON.parse(oRequest.responseText), fExport = function (oItem, sMimeType, sExt) {
						if (oItem && oItem['exportLinks'])
						{
							if (oItem['exportLinks'][sMimeType])
							{
								oItem['downloadUrl'] = oItem['exportLinks'][sMimeType];
								oItem['title'] = oItem['title'] + '.' + sExt;
								oItem['mimeType'] = sMimeType;
							}
							else if (oItem['exportLinks']['application/pdf'])
							{
								oItem['downloadUrl'] = oItem['exportLinks']['application/pdf'];
								oItem['title'] = oItem['title'] + '.pdf';
								oItem['mimeType'] = 'application/pdf';
							}
						}
					};

					if (oItem && !oItem['downloadUrl'] && oItem['mimeType'] && oItem['exportLinks'])
					{
						switch (oItem['mimeType'].toString().toLowerCase())
						{
							case 'application/vnd.google-apps.document':
								fExport(oItem, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
								break;
							case 'application/vnd.google-apps.spreadsheet':
								fExport(oItem, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx');
								break;
							case 'application/vnd.google-apps.drawing':
								fExport(oItem, 'image/png', 'png');
								break;
							case 'application/vnd.google-apps.presentation':
								fExport(oItem, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx');
								break;
							default:
								fExport(oItem, 'application/pdf', 'pdf');
								break;
						}
					}

					if (oItem && oItem['downloadUrl'])
					{
						self.addDriveAttachment(oItem, sAccessToken);
					}
				}
			});

			oRequest.send();
		}
	};

	PopupsComposeViewModel.prototype.driveCreatePiker = function (oOauthToken)
	{
		if (window.gapi && oOauthToken && oOauthToken.access_token)
		{
			var self = this;

			window.gapi.load('picker', {'callback': function () {

				if (window.google && window.google.picker)
				{
					var drivePicker = new window.google.picker.PickerBuilder()
						.addView(
							new window.google.picker.DocsView()
								.setIncludeFolders(true)
						)
						.setAppId(Settings.settingsGet('GoogleClientID'))
						.setOAuthToken(oOauthToken.access_token)
						.setCallback(_.bind(self.driveCallback, self, oOauthToken.access_token))
						.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
						.build()
					;

					drivePicker.setVisible(true);
				}
			}});
		}
	};

	PopupsComposeViewModel.prototype.driveOpenPopup = function ()
	{
		if (window.gapi)
		{
			var self = this;

			window.gapi.load('auth', {'callback': function () {

				var oAuthToken = window.gapi.auth.getToken();
				if (!oAuthToken)
				{
					window.gapi.auth.authorize({
						'client_id': Settings.settingsGet('GoogleClientID'),
						'scope': 'https://www.googleapis.com/auth/drive.readonly',
						'immediate': true
					}, function (oAuthResult) {
						if (oAuthResult && !oAuthResult.error)
						{
							var oAuthToken = window.gapi.auth.getToken();
							if (oAuthToken)
							{
								self.driveCreatePiker(oAuthToken);
							}
						}
						else
						{
							window.gapi.auth.authorize({
								'client_id': Settings.settingsGet('GoogleClientID'),
								'scope': 'https://www.googleapis.com/auth/drive.readonly',
								'immediate': false
							}, function (oAuthResult) {
								if (oAuthResult && !oAuthResult.error)
								{
									var oAuthToken = window.gapi.auth.getToken();
									if (oAuthToken)
									{
										self.driveCreatePiker(oAuthToken);
									}
								}
							});
						}
					});
				}
				else
				{
					self.driveCreatePiker(oAuthToken);
				}
			}});
		}
	};

	/**
	 * @param {string} sId
	 * @return {?Object}
	 */
	PopupsComposeViewModel.prototype.getAttachmentById = function (sId)
	{
		var
			aAttachments = this.attachments(),
			iIndex = 0,
			iLen = aAttachments.length
		;

		for (; iIndex < iLen; iIndex++)
		{
			if (aAttachments[iIndex] && sId === aAttachments[iIndex].id)
			{
				return aAttachments[iIndex];
			}
		}

		return null;
	};

	PopupsComposeViewModel.prototype.initUploader = function ()
	{
		if (this.composeUploaderButton())
		{
			var
				oUploadCache = {},
				iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
				oJua = new Jua({
					'action': LinkBuilder.upload(),
					'name': 'uploader',
					'queueSize': 2,
					'multipleSizeLimit': 50,
					'disableFolderDragAndDrop': false,
					'clickElement': this.composeUploaderButton(),
					'dragAndDropElement': this.composeUploaderDropPlace()
				})
			;

			if (oJua)
			{
				oJua
	//				.on('onLimitReached', function (iLimit) {
	//					alert(iLimit);
	//				})
					.on('onDragEnter', _.bind(function () {
						this.dragAndDropOver(true);
					}, this))
					.on('onDragLeave', _.bind(function () {
						this.dragAndDropOver(false);
					}, this))
					.on('onBodyDragEnter', _.bind(function () {
						this.dragAndDropVisible(true);
					}, this))
					.on('onBodyDragLeave', _.bind(function () {
						this.dragAndDropVisible(false);
					}, this))
					.on('onProgress', _.bind(function (sId, iLoaded, iTotal) {
						var oItem = null;
						if (Utils.isUnd(oUploadCache[sId]))
						{
							oItem = this.getAttachmentById(sId);
							if (oItem)
							{
								oUploadCache[sId] = oItem;
							}
						}
						else
						{
							oItem = oUploadCache[sId];
						}

						if (oItem)
						{
							oItem.progress(' - ' + window.Math.floor(iLoaded / iTotal * 100) + '%');
						}

					}, this))
					.on('onSelect', _.bind(function (sId, oData) {

						this.dragAndDropOver(false);

						var
							that = this,
							sFileName = Utils.isUnd(oData.FileName) ? '' : oData.FileName.toString(),
							mSize = Utils.isNormal(oData.Size) ? Utils.pInt(oData.Size) : null,
							oAttachment = new ComposeAttachmentModel(sId, sFileName, mSize)
						;

						oAttachment.cancel = (function (sId) {

							return function () {
								that.attachments.remove(function (oItem) {
									return oItem && oItem.id === sId;
								});

								if (oJua)
								{
									oJua.cancel(sId);
								}
							};

						}(sId));

						this.attachments.push(oAttachment);

						if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
						{
							oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
							return false;
						}

						return true;

					}, this))
					.on('onStart', _.bind(function (sId) {

						var
							oItem = null
						;

						if (Utils.isUnd(oUploadCache[sId]))
						{
							oItem = this.getAttachmentById(sId);
							if (oItem)
							{
								oUploadCache[sId] = oItem;
							}
						}
						else
						{
							oItem = oUploadCache[sId];
						}

						if (oItem)
						{
							oItem.waiting(false);
							oItem.uploading(true);
						}

					}, this))
					.on('onComplete', _.bind(function (sId, bResult, oData) {

						var
							sError = '',
							mErrorCode = null,
							oAttachmentJson = null,
							oAttachment = this.getAttachmentById(sId)
						;

						oAttachmentJson = bResult && oData && oData.Result && oData.Result.Attachment ? oData.Result.Attachment : null;
						mErrorCode = oData && oData.Result && oData.Result.ErrorCode ? oData.Result.ErrorCode : null;

						if (null !== mErrorCode)
						{
							sError = Utils.getUploadErrorDescByCode(mErrorCode);
						}
						else if (!oAttachmentJson)
						{
							sError = Utils.i18n('UPLOAD/ERROR_UNKNOWN');
						}

						if (oAttachment)
						{
							if ('' !== sError && 0 < sError.length)
							{
								oAttachment
									.waiting(false)
									.uploading(false)
									.error(sError)
								;
							}
							else if (oAttachmentJson)
							{
								oAttachment
									.waiting(false)
									.uploading(false)
								;

								oAttachment.initByUploadJson(oAttachmentJson);
							}

							if (Utils.isUnd(oUploadCache[sId]))
							{
								delete (oUploadCache[sId]);
							}
						}

					}, this))
				;

				this
					.addAttachmentEnabled(true)
					.dragAndDropEnabled(oJua.isDragAndDropSupported())
				;
			}
			else
			{
				this
					.addAttachmentEnabled(false)
					.dragAndDropEnabled(false)
				;
			}
		}
	};

	/**
	 * @return {Object}
	 */
	PopupsComposeViewModel.prototype.prepearAttachmentsForSendOrSave = function ()
	{
		var oResult = {};
		_.each(this.attachmentsInReady(), function (oItem) {
			if (oItem && '' !== oItem.tempName() && oItem.enabled())
			{
				oResult[oItem.tempName()] = [
					oItem.fileName(),
					oItem.isInline ? '1' : '0',
					oItem.CID,
					oItem.contentLocation
				];
			}
		});

		return oResult;
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	PopupsComposeViewModel.prototype.addMessageAsAttachment = function (oMessage)
	{
		if (oMessage)
		{
			var
				self = this,
				oAttachment = null,
				sTemp = oMessage.subject(),
				fCancelFunc = function (sId) {
					return function () {
						self.attachments.remove(function (oItem) {
							return oItem && oItem.id === sId;
						});
					};
				}
			;

			sTemp = '.eml' === sTemp.substr(-4).toLowerCase() ? sTemp : sTemp + '.eml';
			oAttachment = new ComposeAttachmentModel(
				oMessage.requestHash, sTemp, oMessage.size()
			);

			oAttachment.fromMessage = true;
			oAttachment.cancel = fCancelFunc(oMessage.requestHash);
			oAttachment.waiting(false).uploading(true);

			this.attachments.push(oAttachment);
		}
	};

	/**
	 * @param {Object} oDropboxFile
	 * @return {boolean}
	 */
	PopupsComposeViewModel.prototype.addDropboxAttachment = function (oDropboxFile)
	{
		var
			self = this,
			oAttachment = null,
			fCancelFunc = function (sId) {
				return function () {
					self.attachments.remove(function (oItem) {
						return oItem && oItem.id === sId;
					});
				};
			},
			iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
			mSize = oDropboxFile['bytes']
		;

		oAttachment = new ComposeAttachmentModel(
			oDropboxFile['link'], oDropboxFile['name'], mSize
		);

		oAttachment.fromMessage = false;
		oAttachment.cancel = fCancelFunc(oDropboxFile['link']);
		oAttachment.waiting(false).uploading(true);

		this.attachments.push(oAttachment);

		if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
		{
			oAttachment.uploading(false);
			oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
			return false;
		}

		Remote.composeUploadExternals(function (sResult, oData) {

			var bResult = false;
			oAttachment.uploading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				if (oData.Result[oAttachment.id])
				{
					bResult = true;
					oAttachment.tempName(oData.Result[oAttachment.id]);
				}
			}

			if (!bResult)
			{
				oAttachment.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
			}

		}, [oDropboxFile['link']]);

		return true;
	};

	/**
	 * @param {Object} oDriveFile
	 * @param {string} sAccessToken
	 * @return {boolean}
	 */
	PopupsComposeViewModel.prototype.addDriveAttachment = function (oDriveFile, sAccessToken)
	{
		var
			self = this,
			fCancelFunc = function (sId) {
				return function () {
					self.attachments.remove(function (oItem) {
						return oItem && oItem.id === sId;
					});
				};
			},
			iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
			oAttachment = null,
			mSize = oDriveFile['fileSize'] ? Utils.pInt(oDriveFile['fileSize']) : 0
		;

		oAttachment = new ComposeAttachmentModel(
			oDriveFile['downloadUrl'], oDriveFile['title'], mSize
		);

		oAttachment.fromMessage = false;
		oAttachment.cancel = fCancelFunc(oDriveFile['downloadUrl']);
		oAttachment.waiting(false).uploading(true);

		this.attachments.push(oAttachment);

		if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
		{
			oAttachment.uploading(false);
			oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
			return false;
		}

		Remote.composeUploadDrive(function (sResult, oData) {

			var bResult = false;
			oAttachment.uploading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				if (oData.Result[oAttachment.id])
				{
					bResult = true;
					oAttachment.tempName(oData.Result[oAttachment.id][0]);
					oAttachment.size(Utils.pInt(oData.Result[oAttachment.id][1]));
				}
			}

			if (!bResult)
			{
				oAttachment.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
			}

		}, oDriveFile['downloadUrl'], sAccessToken);

		return true;
	};

	/**
	 * @param {MessageModel} oMessage
	 * @param {string} sType
	 */
	PopupsComposeViewModel.prototype.prepearMessageAttachments = function (oMessage, sType)
	{
		if (oMessage)
		{
			var
				self = this,
				aAttachments = Utils.isNonEmptyArray(oMessage.attachments()) ? oMessage.attachments() : [],
				iIndex = 0,
				iLen = aAttachments.length,
				oAttachment = null,
				oItem = null,
				bAdd = false,
				fCancelFunc = function (sId) {
					return function () {
						self.attachments.remove(function (oItem) {
							return oItem && oItem.id === sId;
						});
					};
				}
			;

			if (Enums.ComposeType.ForwardAsAttachment === sType)
			{
				this.addMessageAsAttachment(oMessage);
			}
			else
			{
				for (; iIndex < iLen; iIndex++)
				{
					oItem = aAttachments[iIndex];

					bAdd = false;
					switch (sType) {
					case Enums.ComposeType.Reply:
					case Enums.ComposeType.ReplyAll:
						bAdd = oItem.isLinked;
						break;

					case Enums.ComposeType.Forward:
					case Enums.ComposeType.Draft:
					case Enums.ComposeType.EditAsNew:
						bAdd = true;
						break;
					}

					if (bAdd)
					{
						oAttachment = new ComposeAttachmentModel(
							oItem.download, oItem.fileName, oItem.estimatedSize,
							oItem.isInline, oItem.isLinked, oItem.cid, oItem.contentLocation
						);

						oAttachment.fromMessage = true;
						oAttachment.cancel = fCancelFunc(oItem.download);
						oAttachment.waiting(false).uploading(true);

						this.attachments.push(oAttachment);
					}
				}
			}
		}
	};

	PopupsComposeViewModel.prototype.removeLinkedAttachments = function ()
	{
		this.attachments.remove(function (oItem) {
			return oItem && oItem.isLinked;
		});
	};

	PopupsComposeViewModel.prototype.setMessageAttachmentFailedDowbloadText = function ()
	{
		_.each(this.attachments(), function(oAttachment) {
			if (oAttachment && oAttachment.fromMessage)
			{
				oAttachment
					.waiting(false)
					.uploading(false)
					.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded))
				;
			}
		}, this);
	};

	/**
	 * @param {boolean=} bIncludeAttachmentInProgress = true
	 * @return {boolean}
	 */
	PopupsComposeViewModel.prototype.isEmptyForm = function (bIncludeAttachmentInProgress)
	{
		bIncludeAttachmentInProgress = Utils.isUnd(bIncludeAttachmentInProgress) ? true : !!bIncludeAttachmentInProgress;
		var bAttach = bIncludeAttachmentInProgress ?
			0 === this.attachments().length : 0 === this.attachmentsInReady().length;

		return 0 === this.to().length &&
			0 === this.cc().length &&
			0 === this.bcc().length &&
			0 === this.subject().length &&
			bAttach &&
			(!this.oEditor || '' === this.oEditor.getData())
		;
	};

	PopupsComposeViewModel.prototype.reset = function ()
	{
		this.to('');
		this.cc('');
		this.bcc('');
		this.replyTo('');
		this.subject('');

		this.requestReadReceipt(false);

		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.sReferences = '';

		this.sendError(false);
		this.sendSuccessButSaveError(false);
		this.savedError(false);
		this.savedTime(0);
		this.savedOrSendingText('');
		this.emptyToError(false);
		this.attachmentsInProcessError(false);
		this.showCcAndBcc(false);

		this.attachments([]);
		this.dragAndDropOver(false);
		this.dragAndDropVisible(false);

		this.draftFolder('');
		this.draftUid('');

		this.sending(false);
		this.saving(false);

		if (this.oEditor)
		{
			this.oEditor.clear(false);
		}
	};

	/**
	 * @return {Array}
	 */
	PopupsComposeViewModel.prototype.getAttachmentsDownloadsForUpload = function ()
	{
		return _.map(_.filter(this.attachments(), function (oItem) {
			return oItem && '' === oItem.tempName();
		}), function (oItem) {
			return oItem.id;
		});
	};

	PopupsComposeViewModel.prototype.triggerForResize = function ()
	{
		this.resizer(!this.resizer());
		this.editorResizeThrottle();
	};

	module.exports = PopupsComposeViewModel;

}(module, require));
},{"$":20,"App:Knoin":27,"App:RainLoop":3,"Consts":6,"Enums":7,"Events":8,"Globals":9,"HtmlEditor":10,"JSON":15,"Jua":16,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Model:ComposeAttachment":33,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"View:Popup:Ask":80,"View:Popup:ComposeOpenPgp":81,"View:Popup:FolderSystem":87,"_":25,"ko":22,"moment":23,"window":26}],83:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Selector = require('Selector'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		EmailModel = require('Model:Email'),
		ContactModel = require('Model:Contact'),
		ContactTagModel = require('Model:ContactTag'),
		ContactPropertyModel = require('Model:ContactProperty'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsContactsViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsContacts');

		var
			self = this,
			fFastClearEmptyListHelper = function (aList) {
				if (aList && 0 < aList.length) {
					self.viewProperties.removeAll(aList);
				}
			}
		;

		this.allowContactsSync = Data.allowContactsSync;
		this.enableContactsSync = Data.enableContactsSync;
		this.allowExport = !Globals.bMobileDevice;

		this.search = ko.observable('');
		this.contactsCount = ko.observable(0);
		this.contacts = Data.contacts;
		this.contactTags = Data.contactTags;

		this.currentContact = ko.observable(null);

		this.importUploaderButton = ko.observable(null);

		this.contactsPage = ko.observable(1);
		this.contactsPageCount = ko.computed(function () {
			var iPage = window.Math.ceil(this.contactsCount() / Consts.Defaults.ContactsPerPage);
			return 0 >= iPage ? 1 : iPage;
		}, this);

		this.contactsPagenator = ko.computed(Utils.computedPagenatorHelper(this.contactsPage, this.contactsPageCount));

		this.emptySelection = ko.observable(true);
		this.viewClearSearch = ko.observable(false);

		this.viewID = ko.observable('');
		this.viewReadOnly = ko.observable(false);
		this.viewProperties = ko.observableArray([]);

		this.viewTags = ko.observable('');
		this.viewTags.visibility = ko.observable(false);
		this.viewTags.focusTrigger = ko.observable(false);

		this.viewTags.focusTrigger.subscribe(function (bValue) {
			if (!bValue && '' === this.viewTags())
			{
				this.viewTags.visibility(false);
			}
			else if (bValue)
			{
				this.viewTags.visibility(true);
			}
		}, this);

		this.viewSaveTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.viewPropertiesNames = this.viewProperties.filter(function(oProperty) {
			return -1 < Utils.inArray(oProperty.type(), [
				Enums.ContactPropertyType.FirstName, Enums.ContactPropertyType.LastName
			]);
		});

		this.viewPropertiesOther = this.viewProperties.filter(function(oProperty) {
			return -1 < Utils.inArray(oProperty.type(), [
				Enums.ContactPropertyType.Note
			]);
		});

		this.viewPropertiesOther = ko.computed(function () {

			var aList = _.filter(this.viewProperties(), function (oProperty) {
				return -1 < Utils.inArray(oProperty.type(), [
					Enums.ContactPropertyType.Nick
				]);
			});

			return _.sortBy(aList, function (oProperty) {
				return oProperty.type();
			});

		}, this);

		this.viewPropertiesEmails = this.viewProperties.filter(function(oProperty) {
			return Enums.ContactPropertyType.Email === oProperty.type();
		});

		this.viewPropertiesWeb = this.viewProperties.filter(function(oProperty) {
			return Enums.ContactPropertyType.Web === oProperty.type();
		});

		this.viewHasNonEmptyRequaredProperties = ko.computed(function() {

			var
				aNames = this.viewPropertiesNames(),
				aEmail = this.viewPropertiesEmails(),
				fHelper = function (oProperty) {
					return '' !== Utils.trim(oProperty.value());
				}
			;

			return !!(_.find(aNames, fHelper) || _.find(aEmail, fHelper));
		}, this);

		this.viewPropertiesPhones = this.viewProperties.filter(function(oProperty) {
			return Enums.ContactPropertyType.Phone === oProperty.type();
		});

		this.viewPropertiesEmailsNonEmpty = this.viewPropertiesNames.filter(function(oProperty) {
			return '' !== Utils.trim(oProperty.value());
		});

		this.viewPropertiesEmailsEmptyAndOnFocused = this.viewPropertiesEmails.filter(function(oProperty) {
			var bF = oProperty.focused();
			return '' === Utils.trim(oProperty.value()) && !bF;
		});

		this.viewPropertiesPhonesEmptyAndOnFocused = this.viewPropertiesPhones.filter(function(oProperty) {
			var bF = oProperty.focused();
			return '' === Utils.trim(oProperty.value()) && !bF;
		});

		this.viewPropertiesWebEmptyAndOnFocused = this.viewPropertiesWeb.filter(function(oProperty) {
			var bF = oProperty.focused();
			return '' === Utils.trim(oProperty.value()) && !bF;
		});

		this.viewPropertiesOtherEmptyAndOnFocused = ko.computed(function () {
			return _.filter(this.viewPropertiesOther(), function (oProperty) {
				var bF = oProperty.focused();
				return '' === Utils.trim(oProperty.value()) && !bF;
			});
		}, this);

		this.viewPropertiesEmailsEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewPropertiesPhonesEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewPropertiesWebEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewPropertiesOtherEmptyAndOnFocused.subscribe(function(aList) {
			fFastClearEmptyListHelper(aList);
		});

		this.viewSaving = ko.observable(false);

		this.useCheckboxesInList = Data.useCheckboxesInList;

		this.search.subscribe(function () {
			this.reloadContactList();
		}, this);

		this.contacts.subscribe(function () {
			Utils.windowResize();
		}, this);

		this.viewProperties.subscribe(function () {
			Utils.windowResize();
		}, this);

		this.contactsChecked = ko.computed(function () {
			return _.filter(this.contacts(), function (oItem) {
				return oItem.checked();
			});
		}, this);

		this.contactsCheckedOrSelected = ko.computed(function () {

			var
				aChecked = this.contactsChecked(),
				oSelected = this.currentContact()
			;

			return _.union(aChecked, oSelected ? [oSelected] : []);

		}, this);

		this.contactsCheckedOrSelectedUids = ko.computed(function () {
			return _.map(this.contactsCheckedOrSelected(), function (oContact) {
				return oContact.idContact;
			});
		}, this);

		this.selector = new Selector(this.contacts, this.currentContact,
			'.e-contact-item .actionHandle', '.e-contact-item.selected', '.e-contact-item .checkboxItem',
				'.e-contact-item.focused');

		this.selector.on('onItemSelect', _.bind(function (oContact) {
			this.populateViewContact(oContact ? oContact : null);
			if (!oContact)
			{
				this.emptySelection(true);
			}
		}, this));

		this.selector.on('onItemGetUid', function (oContact) {
			return oContact ? oContact.generateUid() : '';
		});

		this.newCommand = Utils.createCommand(this, function () {
			this.populateViewContact(null);
			this.currentContact(null);
		});

		this.deleteCommand = Utils.createCommand(this, function () {
			this.deleteSelectedContacts();
			this.emptySelection(true);
		}, function () {
			return 0 < this.contactsCheckedOrSelected().length;
		});

		this.newMessageCommand = Utils.createCommand(this, function () {
			var aC = this.contactsCheckedOrSelected(), aE = [];
			if (Utils.isNonEmptyArray(aC))
			{
				aE = _.map(aC, function (oItem) {
					if (oItem)
					{
						var
							aData = oItem.getNameAndEmailHelper(),
							oEmail = aData ? new EmailModel(aData[0], aData[1]) : null
						;

						if (oEmail && oEmail.validate())
						{
							return oEmail;
						}
					}

					return null;
				});

				aE = _.compact(aE);
			}

			if (Utils.isNonEmptyArray(aE))
			{
				kn.hideScreenPopup(require('View:Popup:Contacts'));
				kn.showScreenPopup(require('View:Popup:Compose'), [Enums.ComposeType.Empty, null, aE]);
			}

		}, function () {
			return 0 < this.contactsCheckedOrSelected().length;
		});

		this.clearCommand = Utils.createCommand(this, function () {
			this.search('');
		});

		this.saveCommand = Utils.createCommand(this, function () {

			this.viewSaving(true);
			this.viewSaveTrigger(Enums.SaveSettingsStep.Animate);

			var
				sRequestUid = Utils.fakeMd5(),
				aProperties = []
			;

			_.each(this.viewProperties(), function (oItem) {
				if (oItem.type() && '' !== Utils.trim(oItem.value()))
				{
					aProperties.push([oItem.type(), oItem.value(), oItem.typeStr()]);
				}
			});

			Remote.contactSave(function (sResult, oData) {

				var bRes = false;
				self.viewSaving(false);

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
					oData.Result.RequestUid === sRequestUid && 0 < Utils.pInt(oData.Result.ResultID))
				{
					if ('' === self.viewID())
					{
						self.viewID(Utils.pInt(oData.Result.ResultID));
					}

					self.reloadContactList();
					bRes = true;
				}

				_.delay(function () {
					self.viewSaveTrigger(bRes ? Enums.SaveSettingsStep.TrueResult : Enums.SaveSettingsStep.FalseResult);
				}, 300);

				if (bRes)
				{
					self.watchDirty(false);

					_.delay(function () {
						self.viewSaveTrigger(Enums.SaveSettingsStep.Idle);
					}, 1000);
				}

			}, sRequestUid, this.viewID(), this.viewTags(), aProperties);

		}, function () {
			var
				bV = this.viewHasNonEmptyRequaredProperties(),
				bReadOnly = this.viewReadOnly()
			;
			return !this.viewSaving() && bV && !bReadOnly;
		});

		this.syncCommand = Utils.createCommand(this, function () {

			var self = this;
			require('App:RainLoop').contactsSync(function (sResult, oData) {
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					window.alert(Utils.getNotification(
						oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.ContactsSyncError));
				}

				self.reloadContactList(true);
			});

		}, function () {
			return !this.contacts.syncing() && !this.contacts.importing();
		});

		this.bDropPageAfterDelete = false;

		this.watchDirty = ko.observable(false);
		this.watchHash = ko.observable(false);

		this.viewHash = ko.computed(function () {
			return '' + self.viewTags() + '|' + _.map(self.viewProperties(), function (oItem) {
				return oItem.value();
			}).join('');
		});

	//	this.saveCommandDebounce = _.debounce(_.bind(this.saveCommand, this), 1000);

		this.viewHash.subscribe(function () {
			if (this.watchHash() && !this.viewReadOnly() && !this.watchDirty())
			{
				this.watchDirty(true);
			}
		}, this);

		this.sDefaultKeyScope = Enums.KeyState.ContactList;

		this.contactTagsSource = _.bind(this.contactTagsSource, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Contacts', 'PopupsContactsViewModel'], PopupsContactsViewModel);
	_.extend(PopupsContactsViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsContactsViewModel.prototype.contactTagsSource = function (oData, fResponse)
	{
		require('App:RainLoop').getContactTagsAutocomplete(oData.term, function (aData) {
			fResponse(_.map(aData, function (oTagItem) {
				return oTagItem.toLine(false);
			}));
		});
	};

	PopupsContactsViewModel.prototype.getPropertyPlceholder = function (sType)
	{
		var sResult = '';
		switch (sType)
		{
			case Enums.ContactPropertyType.LastName:
				sResult = 'CONTACTS/PLACEHOLDER_ENTER_LAST_NAME';
				break;
			case Enums.ContactPropertyType.FirstName:
				sResult = 'CONTACTS/PLACEHOLDER_ENTER_FIRST_NAME';
				break;
			case Enums.ContactPropertyType.Nick:
				sResult = 'CONTACTS/PLACEHOLDER_ENTER_NICK_NAME';
				break;
		}

		return sResult;
	};

	PopupsContactsViewModel.prototype.addNewProperty = function (sType, sTypeStr)
	{
		this.viewProperties.push(new ContactPropertyModel(sType, sTypeStr || '', '', true, this.getPropertyPlceholder(sType)));
	};

	PopupsContactsViewModel.prototype.addNewOrFocusProperty = function (sType, sTypeStr)
	{
		var oItem = _.find(this.viewProperties(), function (oItem) {
			return sType === oItem.type();
		});

		if (oItem)
		{
			oItem.focused(true);
		}
		else
		{
			this.addNewProperty(sType, sTypeStr);
		}
	};

	PopupsContactsViewModel.prototype.addNewTag = function ()
	{
		this.viewTags.visibility(true);
		this.viewTags.focusTrigger(true);
	};

	PopupsContactsViewModel.prototype.addNewEmail = function ()
	{
		this.addNewProperty(Enums.ContactPropertyType.Email, 'Home');
	};

	PopupsContactsViewModel.prototype.addNewPhone = function ()
	{
		this.addNewProperty(Enums.ContactPropertyType.Phone, 'Mobile');
	};

	PopupsContactsViewModel.prototype.addNewWeb = function ()
	{
		this.addNewProperty(Enums.ContactPropertyType.Web);
	};

	PopupsContactsViewModel.prototype.addNewNickname = function ()
	{
		this.addNewOrFocusProperty(Enums.ContactPropertyType.Nick);
	};

	PopupsContactsViewModel.prototype.addNewNotes = function ()
	{
		this.addNewOrFocusProperty(Enums.ContactPropertyType.Note);
	};

	PopupsContactsViewModel.prototype.addNewBirthday = function ()
	{
		this.addNewOrFocusProperty(Enums.ContactPropertyType.Birthday);
	};

	PopupsContactsViewModel.prototype.exportVcf = function ()
	{
		require('App:RainLoop').download(LinkBuilder.exportContactsVcf());
	};

	PopupsContactsViewModel.prototype.exportCsv = function ()
	{
		require('App:RainLoop').download(LinkBuilder.exportContactsCsv());
	};

	PopupsContactsViewModel.prototype.initUploader = function ()
	{
		if (this.importUploaderButton())
		{
			var
				oJua = new Jua({
					'action': LinkBuilder.uploadContacts(),
					'name': 'uploader',
					'queueSize': 1,
					'multipleSizeLimit': 1,
					'disableFolderDragAndDrop': true,
					'disableDragAndDrop': true,
					'disableMultiple': true,
					'disableDocumentDropPrevent': true,
					'clickElement': this.importUploaderButton()
				})
			;

			if (oJua)
			{
				oJua
					.on('onStart', _.bind(function () {
						this.contacts.importing(true);
					}, this))
					.on('onComplete', _.bind(function (sId, bResult, oData) {

						this.contacts.importing(false);
						this.reloadContactList();

						if (!sId || !bResult || !oData || !oData.Result)
						{
							window.alert(Utils.i18n('CONTACTS/ERROR_IMPORT_FILE'));
						}

					}, this))
				;
			}
		}
	};

	PopupsContactsViewModel.prototype.removeCheckedOrSelectedContactsFromList = function ()
	{
		var
			self = this,
			oKoContacts = this.contacts,
			oCurrentContact = this.currentContact(),
			iCount = this.contacts().length,
			aContacts = this.contactsCheckedOrSelected()
		;

		if (0 < aContacts.length)
		{
			_.each(aContacts, function (oContact) {

				if (oCurrentContact && oCurrentContact.idContact === oContact.idContact)
				{
					oCurrentContact = null;
					self.currentContact(null);
				}

				oContact.deleted(true);
				iCount--;
			});

			if (iCount <= 0)
			{
				this.bDropPageAfterDelete = true;
			}

			_.delay(function () {

				_.each(aContacts, function (oContact) {
					oKoContacts.remove(oContact);
				});

			}, 500);
		}
	};

	PopupsContactsViewModel.prototype.deleteSelectedContacts = function ()
	{
		if (0 < this.contactsCheckedOrSelected().length)
		{
			Remote.contactsDelete(
				_.bind(this.deleteResponse, this),
				this.contactsCheckedOrSelectedUids()
			);

			this.removeCheckedOrSelectedContactsFromList();
		}
	};

	/**
	 * @param {string} sResult
	 * @param {AjaxJsonDefaultResponse} oData
	 */
	PopupsContactsViewModel.prototype.deleteResponse = function (sResult, oData)
	{
		if (500 < (Enums.StorageResultType.Success === sResult && oData && oData.Time ? Utils.pInt(oData.Time) : 0))
		{
			this.reloadContactList(this.bDropPageAfterDelete);
		}
		else
		{
			_.delay((function (self) {
				return function () {
					self.reloadContactList(self.bDropPageAfterDelete);
				};
			}(this)), 500);
		}
	};

	PopupsContactsViewModel.prototype.removeProperty = function (oProp)
	{
		this.viewProperties.remove(oProp);
	};

	/**
	 * @param {?ContactModel} oContact
	 */
	PopupsContactsViewModel.prototype.populateViewContact = function (oContact)
	{
		var
			sId = '',
			sLastName = '',
			sFirstName = '',
			aList = []
		;

		this.watchHash(false);

		this.emptySelection(false);
		this.viewReadOnly(false);
		this.viewTags('');

		if (oContact)
		{
			sId = oContact.idContact;
			if (Utils.isNonEmptyArray(oContact.properties))
			{
				_.each(oContact.properties, function (aProperty) {
					if (aProperty && aProperty[0])
					{
						if (Enums.ContactPropertyType.LastName === aProperty[0])
						{
							sLastName = aProperty[1];
						}
						else if (Enums.ContactPropertyType.FirstName === aProperty[0])
						{
							sFirstName = aProperty[1];
						}
						else
						{
							aList.push(new ContactPropertyModel(aProperty[0], aProperty[2] || '', aProperty[1]));
						}
					}
				});
			}

			this.viewTags(oContact.tags);

			this.viewReadOnly(!!oContact.readOnly);
		}

		this.viewTags.focusTrigger.valueHasMutated();
		this.viewTags.visibility('' !== this.viewTags());

		aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.LastName, '', sLastName, false,
			this.getPropertyPlceholder(Enums.ContactPropertyType.LastName)));

		aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.FirstName, '', sFirstName, !oContact,
			this.getPropertyPlceholder(Enums.ContactPropertyType.FirstName)));

		this.viewID(sId);
		this.viewProperties([]);
		this.viewProperties(aList);

		this.watchDirty(false);
		this.watchHash(true);
	};

	/**
	 * @param {boolean=} bDropPagePosition = false
	 */
	PopupsContactsViewModel.prototype.reloadContactList = function (bDropPagePosition)
	{
		var
			self = this,
			iOffset = (this.contactsPage() - 1) * Consts.Defaults.ContactsPerPage
		;

		this.bDropPageAfterDelete = false;

		if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
		{
			this.contactsPage(1);
			iOffset = 0;
		}

		this.contacts.loading(true);
		Remote.contacts(function (sResult, oData) {
			var
				iCount = 0,
				aList = [],
				aTagsList = []
			;

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.List)
			{
				if (Utils.isNonEmptyArray(oData.Result.List))
				{
					aList = _.map(oData.Result.List, function (oItem) {
						var oContact = new ContactModel();
						return oContact.parse(oItem) ? oContact : null;
					});

					aList = _.compact(aList);

					iCount = Utils.pInt(oData.Result.Count);
					iCount = 0 < iCount ? iCount : 0;
				}

				if (Utils.isNonEmptyArray(oData.Result.Tags))
				{
					aTagsList = _.map(oData.Result.Tags, function (oItem) {
						var oContactTag = new ContactTagModel();
						return oContactTag.parse(oItem) ? oContactTag : null;
					});

					aTagsList = _.compact(aTagsList);
				}
			}

			self.contactsCount(iCount);

			self.contacts(aList);
			self.contacts.loading(false);
			self.contactTags(aTagsList);

			self.viewClearSearch('' !== self.search());

		}, iOffset, Consts.Defaults.ContactsPerPage, this.search());
	};

	PopupsContactsViewModel.prototype.onBuild = function (oDom)
	{
		this.oContentVisible = $('.b-list-content', oDom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.ContactList);

		var self = this;

		key('delete', Enums.KeyState.ContactList, function () {
			self.deleteCommand();
			return false;
		});

		oDom
			.on('click', '.e-pagenator .e-page', function () {
				var oPage = ko.dataFor(this);
				if (oPage)
				{
					self.contactsPage(Utils.pInt(oPage.value));
					self.reloadContactList();
				}
			})
		;

		this.initUploader();
	};

	PopupsContactsViewModel.prototype.onShow = function ()
	{
		kn.routeOff();
		this.reloadContactList(true);
	};

	PopupsContactsViewModel.prototype.onHide = function ()
	{
		kn.routeOn();
		this.currentContact(null);
		this.emptySelection(true);
		this.search('');
		this.contactsCount(0);
		this.contacts([]);
	};

	module.exports = PopupsContactsViewModel;

}(module, require));
},{"$":20,"App:Knoin":27,"App:RainLoop":3,"Consts":6,"Enums":7,"Globals":9,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Model:Contact":34,"Model:ContactProperty":35,"Model:ContactTag":36,"Model:Email":37,"Selector":13,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"View:Popup:Compose":82,"View:Popup:Contacts":83,"_":25,"key":21,"ko":22,"window":26}],84:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Consts = require('Consts'),
		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFilterViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFilter');

		this.filter = ko.observable(null);

		this.selectedFolderValue = ko.observable(Consts.Values.UnuseOptionValue);
		this.folderSelectList = Data.folderMenuForMove;
		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Filter', 'PopupsFilterViewModel'], PopupsFilterViewModel);
	_.extend(PopupsFilterViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsFilterViewModel.prototype.clearPopup = function ()
	{
		// TODO
	};

	PopupsFilterViewModel.prototype.onShow = function (oFilter)
	{
		this.clearPopup();

		this.filter(oFilter);
	};

	module.exports = PopupsFilterViewModel;

}(module, require));
},{"App:Knoin":27,"Consts":6,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Utils":14,"_":25,"ko":22}],85:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),
		Cache = require('Storage:RainLoop:Cache'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFolderClearViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderClear');

		this.selectedFolder = ko.observable(null);
		this.clearingProcess = ko.observable(false);
		this.clearingError = ko.observable('');

		this.folderFullNameForClear = ko.computed(function () {
			var oFolder = this.selectedFolder();
			return oFolder ? oFolder.printableFullName() : '';
		}, this);

		this.folderNameForClear = ko.computed(function () {
			var oFolder = this.selectedFolder();
			return oFolder ? oFolder.localName() : '';
		}, this);

		this.dangerDescHtml = ko.computed(function () {
			return Utils.i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', {
				'FOLDER': this.folderNameForClear()
			});
		}, this);

		this.clearCommand = Utils.createCommand(this, function () {

			var
				self = this,
				oFolderToClear = this.selectedFolder()
			;

			if (oFolderToClear)
			{
				Data.message(null);
				Data.messageList([]);

				this.clearingProcess(true);

				oFolderToClear.messageCountAll(0);
				oFolderToClear.messageCountUnread(0);

				Cache.setFolderHash(oFolderToClear.fullNameRaw, '');

				Remote.folderClear(function (sResult, oData) {

					self.clearingProcess(false);
					if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
					{
						require('App:RainLoop').reloadMessageList(true);
						self.cancelCommand();
					}
					else
					{
						if (oData && oData.ErrorCode)
						{
							self.clearingError(Utils.getNotification(oData.ErrorCode));
						}
						else
						{
							self.clearingError(Utils.getNotification(Enums.Notification.MailServerError));
						}
					}
				}, oFolderToClear.fullNameRaw);
			}

		}, function () {

			var
				oFolder = this.selectedFolder(),
				bIsClearing = this.clearingProcess()
			;

			return !bIsClearing && null !== oFolder;

		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:FolderClear', 'PopupsFolderClearViewModel'], PopupsFolderClearViewModel);
	_.extend(PopupsFolderClearViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsFolderClearViewModel.prototype.clearPopup = function ()
	{
		this.clearingProcess(false);
		this.selectedFolder(null);
	};

	PopupsFolderClearViewModel.prototype.onShow = function (oFolder)
	{
		this.clearPopup();
		if (oFolder)
		{
			this.selectedFolder(oFolder);
		}
	};

	module.exports = PopupsFolderClearViewModel;

}(module, require));

},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Cache":63,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],86:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFolderCreateViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderCreate');

		Utils.initOnStartOrLangChange(function () {
			this.sNoParentText = Utils.i18n('POPUPS_CREATE_FOLDER/SELECT_NO_PARENT');
		}, this);

		this.folderName = ko.observable('');
		this.folderName.focused = ko.observable(false);

		this.selectedParentValue = ko.observable(Consts.Values.UnuseOptionValue);

		this.parentFolderSelectList = ko.computed(function () {

			var
				aTop = [],
				fDisableCallback = null,
				fVisibleCallback = null,
				aList = Data.folderList(),
				fRenameCallback = function (oItem) {
					return oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';
				}
			;

			aTop.push(['', this.sNoParentText]);

			if ('' !== Data.namespace)
			{
				fDisableCallback = function (oItem)
				{
					return Data.namespace !== oItem.fullNameRaw.substr(0, Data.namespace.length);
				};
			}

			return Utils.folderListOptionsBuilder([], aList, [], aTop, null, fDisableCallback, fVisibleCallback, fRenameCallback);

		}, this);

		// commands
		this.createFolder = Utils.createCommand(this, function () {

			var
				sParentFolderName = this.selectedParentValue()
			;

			if ('' === sParentFolderName && 1 < Data.namespace.length)
			{
				sParentFolderName = Data.namespace.substr(0, Data.namespace.length - 1);
			}

			Data.foldersCreating(true);
			Remote.folderCreate(function (sResult, oData) {

				Data.foldersCreating(false);
				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					require('App:RainLoop').folders();
				}
				else
				{
					Data.foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER'));
				}

			},	this.folderName(), sParentFolderName);

			this.cancelCommand();

		}, function () {
			return this.simpleFolderNameValidation(this.folderName());
		});

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:FolderCreate', 'PopupsFolderCreateViewModel'], PopupsFolderCreateViewModel);
	_.extend(PopupsFolderCreateViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsFolderCreateViewModel.prototype.sNoParentText = '';

	PopupsFolderCreateViewModel.prototype.simpleFolderNameValidation = function (sName)
	{
		return (/^[^\\\/]+$/g).test(Utils.trim(sName));
	};

	PopupsFolderCreateViewModel.prototype.clearPopup = function ()
	{
		this.folderName('');
		this.selectedParentValue('');
		this.folderName.focused(false);
	};

	PopupsFolderCreateViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsFolderCreateViewModel.prototype.onFocus = function ()
	{
		this.folderName.focused(true);
	};

	module.exports = PopupsFolderCreateViewModel;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Consts":6,"Enums":7,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],87:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsFolderSystemViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderSystem');

		Utils.initOnStartOrLangChange(function () {
			this.sChooseOnText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
			this.sUnuseText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
		}, this);

		this.notification = ko.observable('');

		this.folderSelectList = ko.computed(function () {
			return Utils.folderListOptionsBuilder([], Data.folderList(), Data.folderListSystemNames(), [
				['', this.sChooseOnText],
				[Consts.Values.UnuseOptionValue, this.sUnuseText]
			]);
		}, this);

		var
			self = this,
			fSaveSystemFolders = null,
			fCallback = null
		;

		this.sentFolder = Data.sentFolder;
		this.draftFolder = Data.draftFolder;
		this.spamFolder = Data.spamFolder;
		this.trashFolder = Data.trashFolder;
		this.archiveFolder = Data.archiveFolder;

		fSaveSystemFolders = _.debounce(function () {

			Settings.settingsSet('SentFolder', self.sentFolder());
			Settings.settingsSet('DraftFolder', self.draftFolder());
			Settings.settingsSet('SpamFolder', self.spamFolder());
			Settings.settingsSet('TrashFolder', self.trashFolder());
			Settings.settingsSet('ArchiveFolder', self.archiveFolder());

			Remote.saveSystemFolders(Utils.emptyFunction, {
				'SentFolder': self.sentFolder(),
				'DraftFolder': self.draftFolder(),
				'SpamFolder': self.spamFolder(),
				'TrashFolder': self.trashFolder(),
				'ArchiveFolder': self.archiveFolder(),
				'NullFolder': 'NullFolder'
			});

		}, 1000);

		fCallback = function () {

			Settings.settingsSet('SentFolder', self.sentFolder());
			Settings.settingsSet('DraftFolder', self.draftFolder());
			Settings.settingsSet('SpamFolder', self.spamFolder());
			Settings.settingsSet('TrashFolder', self.trashFolder());
			Settings.settingsSet('ArchiveFolder', self.archiveFolder());

			fSaveSystemFolders();
		};

		this.sentFolder.subscribe(fCallback);
		this.draftFolder.subscribe(fCallback);
		this.spamFolder.subscribe(fCallback);
		this.trashFolder.subscribe(fCallback);
		this.archiveFolder.subscribe(fCallback);

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:FolderSystem', 'PopupsFolderSystemViewModel'], PopupsFolderSystemViewModel);
	_.extend(PopupsFolderSystemViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsFolderSystemViewModel.prototype.sChooseOnText = '';
	PopupsFolderSystemViewModel.prototype.sUnuseText = '';

	/**
	 * @param {number=} iNotificationType = Enums.SetSystemFoldersNotification.None
	 */
	PopupsFolderSystemViewModel.prototype.onShow = function (iNotificationType)
	{
		var sNotification = '';

		iNotificationType = Utils.isUnd(iNotificationType) ? Enums.SetSystemFoldersNotification.None : iNotificationType;

		switch (iNotificationType)
		{
			case Enums.SetSystemFoldersNotification.Sent:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
				break;
			case Enums.SetSystemFoldersNotification.Draft:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
				break;
			case Enums.SetSystemFoldersNotification.Spam:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
				break;
			case Enums.SetSystemFoldersNotification.Trash:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
				break;
			case Enums.SetSystemFoldersNotification.Archive:
				sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
				break;
		}

		this.notification(sNotification);
	};

	module.exports = PopupsFolderSystemViewModel;

}(module, require));
},{"App:Knoin":27,"Consts":6,"Enums":7,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Storage:Settings":69,"Utils":14,"_":25,"ko":22}],88:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote'),
		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsIdentityViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsIdentity');

		this.id = '';
		this.edit = ko.observable(false);
		this.owner = ko.observable(false);

		this.email = ko.observable('').validateEmail();
		this.email.focused = ko.observable(false);
		this.name = ko.observable('');
		this.name.focused = ko.observable(false);
		this.replyTo = ko.observable('').validateSimpleEmail();
		this.replyTo.focused = ko.observable(false);
		this.bcc = ko.observable('').validateSimpleEmail();
		this.bcc.focused = ko.observable(false);

	//	this.email.subscribe(function () {
	//		this.email.hasError(false);
	//	}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.addOrEditIdentityCommand = Utils.createCommand(this, function () {

			if (!this.email.hasError())
			{
				this.email.hasError('' === Utils.trim(this.email()));
			}

			if (this.email.hasError())
			{
				if (!this.owner())
				{
					this.email.focused(true);
				}

				return false;
			}

			if (this.replyTo.hasError())
			{
				this.replyTo.focused(true);
				return false;
			}

			if (this.bcc.hasError())
			{
				this.bcc.focused(true);
				return false;
			}

			this.submitRequest(true);

			Remote.identityUpdate(_.bind(function (sResult, oData) {

				this.submitRequest(false);
				if (Enums.StorageResultType.Success === sResult && oData)
				{
					if (oData.Result)
					{
						require('App:RainLoop').accountsAndIdentities();
						this.cancelCommand();
					}
					else if (oData.ErrorCode)
					{
						this.submitError(Utils.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.id, this.email(), this.name(), this.replyTo(), this.bcc());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		this.label = ko.computed(function () {
			return Utils.i18n('POPUPS_IDENTITIES/' + (this.edit() ? 'TITLE_UPDATE_IDENTITY': 'TITLE_ADD_IDENTITY'));
		}, this);

		this.button = ko.computed(function () {
			return Utils.i18n('POPUPS_IDENTITIES/' + (this.edit() ? 'BUTTON_UPDATE_IDENTITY': 'BUTTON_ADD_IDENTITY'));
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Identity', 'PopupsIdentityViewModel'], PopupsIdentityViewModel);
	_.extend(PopupsIdentityViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsIdentityViewModel.prototype.clearPopup = function ()
	{
		this.id = '';
		this.edit(false);
		this.owner(false);

		this.name('');
		this.email('');
		this.replyTo('');
		this.bcc('');

		this.email.hasError(false);
		this.replyTo.hasError(false);
		this.bcc.hasError(false);

		this.submitRequest(false);
		this.submitError('');
	};

	/**
	 * @param {?IdentityModel} oIdentity
	 */
	PopupsIdentityViewModel.prototype.onShow = function (oIdentity)
	{
		this.clearPopup();

		if (oIdentity)
		{
			this.edit(true);

			this.id = oIdentity.id;
			this.name(oIdentity.name());
			this.email(oIdentity.email());
			this.replyTo(oIdentity.replyTo());
			this.bcc(oIdentity.bcc());

			this.owner(this.id === Data.accountEmail());
		}
	};

	PopupsIdentityViewModel.prototype.onFocus = function ()
	{
		if (!this.owner())
		{
			this.email.focused(true);
		}
	};

	module.exports = PopupsIdentityViewModel;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Enums":7,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],89:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		key = require('key'),

		Enums = require('Enums'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsKeyboardShortcutsHelpViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

		this.sDefaultKeyScope = Enums.KeyState.PopupKeyboardShortcutsHelp;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:KeyboardShortcutsHelp', 'PopupsKeyboardShortcutsHelpViewModel'], PopupsKeyboardShortcutsHelpViewModel);
	_.extend(PopupsKeyboardShortcutsHelpViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsKeyboardShortcutsHelpViewModel.prototype.onBuild = function (oDom)
	{
		key('tab, shift+tab, left, right', Enums.KeyState.PopupKeyboardShortcutsHelp, _.bind(function (event, handler) {
			if (event && handler)
			{
				var
					$tabs = oDom.find('.nav.nav-tabs > li'),
					bNext = handler && ('tab' === handler.shortcut || 'right' === handler.shortcut),
					iIndex = $tabs.index($tabs.filter('.active'))
				;

				if (!bNext && iIndex > 0)
				{
					iIndex--;
				}
				else if (bNext && iIndex < $tabs.length - 1)
				{
					iIndex++;
				}
				else
				{
					iIndex = bNext ? 0 : $tabs.length - 1;
				}

				$tabs.eq(iIndex).find('a[data-toggle="tab"]').tab('show');
				return false;
			}
		}, this));
	};

	module.exports = PopupsKeyboardShortcutsHelpViewModel;

}(module, require));
},{"App:Knoin":27,"Enums":7,"Knoin:AbstractViewModel":30,"_":25,"key":21}],90:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),
		Globals = require('Globals'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsLanguagesViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

		this.Data = Globals.__APP.data(); // TODO

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(this.Data.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		}, this);

		this.Data.mainLanguage.subscribe(function () {
			this.resetMainLanguage();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Languages', 'PopupsLanguagesViewModel'], PopupsLanguagesViewModel);
	_.extend(PopupsLanguagesViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
	{
		return Utils.convertLangName(sLanguage, true);
	};

	PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
	{
		var sCurrent = this.Data.mainLanguage();
		_.each(this.languages(), function (oItem) {
			oItem['selected'](oItem['key'] === sCurrent);
		});
	};

	PopupsLanguagesViewModel.prototype.onShow = function ()
	{
		this.exp(true);

		this.resetMainLanguage();
	};

	PopupsLanguagesViewModel.prototype.onHide = function ()
	{
		this.exp(false);
	};

	PopupsLanguagesViewModel.prototype.changeLanguage = function (sLang)
	{
		this.Data.mainLanguage(sLang);
		this.cancelCommand();
	};

	module.exports = PopupsLanguagesViewModel;

}(module, require));
},{"App:Knoin":27,"Globals":9,"Knoin:AbstractViewModel":30,"Utils":14,"_":25,"ko":22}],91:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsNewOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsNewOpenPgpKey');

		this.email = ko.observable('');
		this.email.focus = ko.observable('');
		this.email.error = ko.observable(false);

		this.name = ko.observable('');
		this.password = ko.observable('');
		this.keyBitLength = ko.observable(2048);

		this.submitRequest = ko.observable(false);

		this.email.subscribe(function () {
			this.email.error(false);
		}, this);

		this.generateOpenPgpKeyCommand = Utils.createCommand(this, function () {

			var
				self = this,
				sUserID = '',
				mKeyPair = null,
				oOpenpgpKeyring = Data.openpgpKeyring
			;

			this.email.error('' === Utils.trim(this.email()));
			if (!oOpenpgpKeyring || this.email.error())
			{
				return false;
			}

			sUserID = this.email();
			if ('' !== this.name())
			{
				sUserID = this.name() + ' <' + sUserID + '>';
			}

			this.submitRequest(true);

			_.delay(function () {
	//			mKeyPair = window.openpgp.generateKeyPair(1, Utils.pInt(self.keyBitLength()), sUserID, Utils.trim(self.password()));
				mKeyPair = window.openpgp.generateKeyPair({
					'userId': sUserID,
					'numBits': Utils.pInt(self.keyBitLength()),
					'passphrase': Utils.trim(self.password())
				});

				if (mKeyPair && mKeyPair.privateKeyArmored)
				{
					oOpenpgpKeyring.privateKeys.importKey(mKeyPair.privateKeyArmored);
					oOpenpgpKeyring.publicKeys.importKey(mKeyPair.publicKeyArmored);
					oOpenpgpKeyring.store();

					require('App:RainLoop').reloadOpenPgpKeys();
					Utils.delegateRun(self, 'cancelCommand');
				}

				self.submitRequest(false);
			}, 100);

			return true;
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:NewOpenPgpKey', 'PopupsNewOpenPgpKeyViewModel'], PopupsNewOpenPgpKeyViewModel);
	_.extend(PopupsNewOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsNewOpenPgpKeyViewModel.prototype.clearPopup = function ()
	{
		this.name('');
		this.password('');

		this.email('');
		this.email.error(false);
		this.keyBitLength(2048);
	};

	PopupsNewOpenPgpKeyViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsNewOpenPgpKeyViewModel.prototype.onFocus = function ()
	{
		this.email.focus(true);
	};

	module.exports = PopupsNewOpenPgpKeyViewModel;

}(module, require));
},{"App:Knoin":27,"App:RainLoop":3,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Data":64,"Utils":14,"_":25,"ko":22,"window":26}],92:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsTwoFactorTestViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsTwoFactorTest');

		var self = this;

		this.code = ko.observable('');
		this.code.focused = ko.observable(false);
		this.code.status = ko.observable(null);

		this.testing = ko.observable(false);

		// commands
		this.testCode = Utils.createCommand(this, function () {

			this.testing(true);
			Remote.testTwoFactor(function (sResult, oData) {

				self.testing(false);
				self.code.status(Enums.StorageResultType.Success === sResult && oData && oData.Result ? true : false);

			}, this.code());

		}, function () {
			return '' !== this.code() && !this.testing();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:TwoFactorTest', 'PopupsTwoFactorTestViewModel'], PopupsTwoFactorTestViewModel);
	_.extend(PopupsTwoFactorTestViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsTwoFactorTestViewModel.prototype.clearPopup = function ()
	{
		this.code('');
		this.code.focused(false);
		this.code.status(null);
		this.testing(false);
	};

	PopupsTwoFactorTestViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsTwoFactorTestViewModel.prototype.onFocus = function ()
	{
		this.code.focused(true);
	};

	module.exports = PopupsTwoFactorTestViewModel;

}(module, require));
},{"App:Knoin":27,"Enums":7,"Knoin:AbstractViewModel":30,"Storage:RainLoop:Remote":68,"Utils":14,"_":25,"ko":22}],93:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsViewOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsViewOpenPgpKey');

		this.key = ko.observable('');
		this.keyDom = ko.observable(null);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:ViewOpenPgpKey', 'PopupsViewOpenPgpKeyViewModel'], PopupsViewOpenPgpKeyViewModel);
	_.extend(PopupsViewOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsViewOpenPgpKeyViewModel.prototype.clearPopup = function ()
	{
		this.key('');
	};

	PopupsViewOpenPgpKeyViewModel.prototype.selectKey = function ()
	{
		var oEl = this.keyDom();
		if (oEl)
		{
			Utils.selectElement(oEl);
		}
	};

	PopupsViewOpenPgpKeyViewModel.prototype.onShow = function (oOpenPgpKey)
	{
		this.clearPopup();

		if (oOpenPgpKey)
		{
			this.key(oOpenPgpKey.armor);
		}
	};

	module.exports = PopupsViewOpenPgpKeyViewModel;

}(module, require));
},{"App:Knoin":27,"Knoin:AbstractViewModel":30,"Utils":14,"_":25,"ko":22}],94:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		
		Globals = require('Globals'),
		LinkBuilder = require('LinkBuilder'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function SettingsMenuViewModel(oScreen)
	{
		KnoinAbstractViewModel.call(this, 'Left', 'SettingsMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:SettingsMenu', 'SettingsMenuViewModel'], SettingsMenuViewModel);
	_.extend(SettingsMenuViewModel.prototype, KnoinAbstractViewModel.prototype);

	SettingsMenuViewModel.prototype.link = function (sRoute)
	{
		return LinkBuilder.settings(sRoute);
	};

	SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = SettingsMenuViewModel;

}(module, require));
},{"App:Knoin":27,"Globals":9,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"_":25}],95:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		key = require('key'),

		Enums = require('Enums'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function SettingsPaneViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'SettingsPane');

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:SettingsPane', 'SettingsPaneViewModel'], SettingsPaneViewModel);
	_.extend(SettingsPaneViewModel.prototype, KnoinAbstractViewModel.prototype);

	SettingsPaneViewModel.prototype.onBuild = function ()
	{
		var self = this;
		key('esc', Enums.KeyState.Settings, function () {
			self.backToMailBoxClick();
		});
	};

	SettingsPaneViewModel.prototype.onShow = function ()
	{
		Data.message(null);
	};

	SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = SettingsPaneViewModel;

}(module, require));
},{"App:Knoin":27,"Enums":7,"Knoin:AbstractViewModel":30,"LinkBuilder":11,"Storage:RainLoop:Data":64,"_":25,"key":21}],96:[function(require,module,exports){

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		
		kn = require('App:Knoin'),
		AbstractSystemDropDownViewModel = require('View:RainLoop:AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownViewModel
	 */
	function SettingsSystemDropDownViewModel()
	{
		AbstractSystemDropDownViewModel.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:RainLoop:SettingsSystemDropDown', 'SettingsSystemDropDownViewModel'], SettingsSystemDropDownViewModel);
	_.extend(SettingsSystemDropDownViewModel.prototype, AbstractSystemDropDownViewModel.prototype);

	module.exports = SettingsSystemDropDownViewModel;

}(module, require));
},{"App:Knoin":27,"View:RainLoop:AbstractSystemDropDown":71,"_":25}]},{},[1]);
