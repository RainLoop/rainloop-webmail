(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (require) {
	'use strict';
	require('App:Boot')(require('App:Admin'));
}(require));
},{"App:Admin":3,"App:Boot":4}],2:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		$ = require('$'),
		_ = require('_'),
		window = require('window'),

		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),
		Events = require('Events'),

		Settings = require('Storage:Settings'),

		KnoinAbstractBoot = require('Knoin:AbstractBoot')
	;

	/**
	 * @param {*} Remote
	 * @constructor
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
},{"$":15,"App:Knoin":22,"Events":7,"Globals":8,"Knoin:AbstractBoot":23,"LinkBuilder":9,"Storage:Settings":53,"Utils":11,"_":20,"ssm":19,"window":21}],3:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),
		_ = require('_'),
		window = require('window'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		kn = require('App:Knoin'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote'),

		AdminSettingsScreen = require('Screen:Admin:Settings'),
		AdminLoginScreen = require('Screen:Admin:Login'),

		AbstractApp = require('App:Abstract')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function AdminApp()
	{
		AbstractApp.call(this, Remote);
	}

	_.extend(AdminApp.prototype, AbstractApp.prototype);

	AdminApp.prototype.remote = function ()
	{
		return Remote;
	};

	AdminApp.prototype.data = function ()
	{
		return Data;
	};

	AdminApp.prototype.setupSettings = function ()
	{
		kn.addSettingsViewModel(require('Settings:Admin:General'),
			'AdminSettingsGeneral', 'General', 'general', true);

		kn.addSettingsViewModel(require('Settings:Admin:Login'),
			'AdminSettingsLogin', 'Login', 'login');

		if (Settings.capa(Enums.Capa.Prem))
		{
			kn.addSettingsViewModel(require('Settings:Admin:Branding'),
				'AdminSettingsBranding', 'Branding', 'branding');
		}

		kn.addSettingsViewModel(require('Settings:Admin:Contacts'),
			'AdminSettingsContacts', 'Contacts', 'contacts');

		kn.addSettingsViewModel(require('Settings:Admin:Domains'),
			'AdminSettingsDomains', 'Domains', 'domains');

		kn.addSettingsViewModel(require('Settings:Admin:Security'),
			'AdminSettingsSecurity', 'Security', 'security');

		kn.addSettingsViewModel(require('Settings:Admin:Social'),
			'AdminSettingsSocial', 'Social', 'social');

		kn.addSettingsViewModel(require('Settings:Admin:Plugins'),
			'AdminSettingsPlugins', 'Plugins', 'plugins');

		kn.addSettingsViewModel(require('Settings:Admin:Packages'),
			'AdminSettingsPackages', 'Packages', 'packages');

		kn.addSettingsViewModel(require('Settings:Admin:Licensing'),
			'AdminSettingsLicensing', 'Licensing', 'licensing');

		kn.addSettingsViewModel(require('Settings:Admin:About'),
			'AdminSettingsAbout', 'About', 'about');

		return true;
	};

	AdminApp.prototype.reloadDomainList = function ()
	{
		Data.domainsLoading(true);

		Remote.domainList(function (sResult, oData) {
			Data.domainsLoading(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (bEnabled, sName) {
					return {
						'name': sName,
						'disabled': ko.observable(!bEnabled),
						'deleteAccess': ko.observable(false)
					};
				}, this);

				Data.domains(aList);
			}
		});
	};

	AdminApp.prototype.reloadPluginList = function ()
	{
		Data.pluginsLoading(true);
		Remote.pluginList(function (sResult, oData) {

			Data.pluginsLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (oItem) {
					return {
						'name': oItem['Name'],
						'disabled': ko.observable(!oItem['Enabled']),
						'configured': ko.observable(!!oItem['Configured'])
					};
				}, this);

				Data.plugins(aList);
			}
		});
	};

	AdminApp.prototype.reloadPackagesList = function ()
	{
		Data.packagesLoading(true);
		Data.packagesReal(true);

		Remote.packagesList(function (sResult, oData) {

			Data.packagesLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.packagesReal(!!oData.Result.Real);
				Data.packagesMainUpdatable(!!oData.Result.MainUpdatable);

				var
					aList = [],
					aLoading = {}
				;

				_.each(Data.packages(), function (oItem) {
					if (oItem && oItem['loading']())
					{
						aLoading[oItem['file']] = oItem;
					}
				});

				if (Utils.isArray(oData.Result.List))
				{
					aList = _.compact(_.map(oData.Result.List, function (oItem) {
						if (oItem)
						{
							oItem['loading'] = ko.observable(!Utils.isUnd(aLoading[oItem['file']]));
							return 'core' === oItem['type'] && !oItem['canBeInstalled'] ? null : oItem;
						}
						return null;
					}));
				}

				Data.packages(aList);
			}
			else
			{
				Data.packagesReal(false);
			}
		});
	};

	AdminApp.prototype.updateCoreData = function ()
	{
		Data.coreUpdating(true);
		Remote.updateCoreData(function (sResult, oData) {

			Data.coreUpdating(false);
			Data.coreRemoteVersion('');
			Data.coreRemoteRelease('');
			Data.coreVersionCompare(-2);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.coreReal(true);
				window.location.reload();
			}
			else
			{
				Data.coreReal(false);
			}
		});

	};

	AdminApp.prototype.reloadCoreData = function ()
	{
		Data.coreChecking(true);
		Data.coreReal(true);

		Remote.coreData(function (sResult, oData) {

			Data.coreChecking(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.coreReal(!!oData.Result.Real);
				Data.coreUpdatable(!!oData.Result.Updatable);
				Data.coreAccess(!!oData.Result.Access);
				Data.coreRemoteVersion(oData.Result.RemoteVersion || '');
				Data.coreRemoteRelease(oData.Result.RemoteRelease || '');
				Data.coreVersionCompare(Utils.pInt(oData.Result.VersionCompare));
			}
			else
			{
				Data.coreReal(false);
				Data.coreRemoteVersion('');
				Data.coreRemoteRelease('');
				Data.coreVersionCompare(-2);
			}
		});
	};

	/**
	 *
	 * @param {boolean=} bForce = false
	 */
	AdminApp.prototype.reloadLicensing = function (bForce)
	{
		bForce = Utils.isUnd(bForce) ? false : !!bForce;

		Data.licensingProcess(true);
		Data.licenseError('');

		Remote.licensing(function (sResult, oData) {
			Data.licensingProcess(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
			{
				Data.licenseValid(true);
				Data.licenseExpired(Utils.pInt(oData.Result['Expired']));
				Data.licenseError('');

				Data.licensing(true);
			}
			else
			{
				if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
					Enums.Notification.LicensingServerIsUnavailable,
					Enums.Notification.LicensingExpired
				]))
				{
					Data.licenseError(Utils.getNotification(Utils.pInt(oData.ErrorCode)));
					Data.licensing(true);
				}
				else
				{
					if (Enums.StorageResultType.Abort === sResult)
					{
						Data.licenseError(Utils.getNotification(Enums.Notification.LicensingServerIsUnavailable));
						Data.licensing(true);
					}
					else
					{
						Data.licensing(false);
					}
				}
			}
		}, bForce);
	};

	AdminApp.prototype.bootstart = function ()
	{
		AbstractApp.prototype.bootstart.call(this);

		Data.populateDataOnStart();

		kn.hideLoading();

		if (!Settings.settingsGet('AllowAdminPanel'))
		{
			kn.routeOff();
			kn.setHash(LinkBuilder.root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = '/';
			});
		}
		else
		{
			if (!!Settings.settingsGet('Auth'))
			{
				kn.startScreens([AdminSettingsScreen]);
			}
			else
			{
				kn.startScreens([AdminLoginScreen]);
			}
		}

		if (window.SimplePace)
		{
			window.SimplePace.set(100);
		}
	};

	module.exports = new AdminApp();

}(module, require));
},{"App:Abstract":2,"App:Knoin":22,"Enums":6,"LinkBuilder":9,"Screen:Admin:Login":31,"Screen:Admin:Settings":32,"Settings:Admin:About":33,"Settings:Admin:Branding":34,"Settings:Admin:Contacts":35,"Settings:Admin:Domains":36,"Settings:Admin:General":37,"Settings:Admin:Licensing":38,"Settings:Admin:Login":39,"Settings:Admin:Packages":40,"Settings:Admin:Plugins":41,"Settings:Admin:Security":42,"Settings:Admin:Social":43,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"_":20,"ko":17,"window":21}],4:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
		window['rl']['addHook'] = Plugins.addHook;
		window['rl']['settingsGet'] = Plugins.mainSettingsGet;
		window['rl']['remoteRequest'] = Plugins.remoteRequest;
		window['rl']['pluginSettingsGet'] = Plugins.settingsGet;
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
},{"$":15,"Enums":6,"Globals":8,"Model:Email":28,"Plugins":10,"Utils":11,"_":20,"window":21}],5:[function(require,module,exports){
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

}(module, require));
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
},{"Plugins":10,"Utils":11,"_":20}],8:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		Globals = {},
		window = require('window'),
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
},{"$":15,"Enums":6,"key":16,"ko":17,"window":21}],9:[function(require,module,exports){
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
},{"Storage:Settings":53,"Utils":11,"window":21}],10:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		Plugins = {
			__boot: null,
			__remote: null,
			__data: null
		},
		_ = require('_'),
		Utils = require('Utils'),
		Settings = require('Storage:Settings')
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
		return Settings.settingsGet(sName);
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
		if (Plugins.__remote)
		{
			Plugins.__remote.defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
		}
	};

	/**
	 * @param {string} sPluginSection
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.settingsGet = function (sPluginSection, sName)
	{
		var oPlugin = Settings.settingsGet('Plugins');
		oPlugin = oPlugin && !Utils.isUnd(oPlugin[sPluginSection]) ? oPlugin[sPluginSection] : null;
		return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
	};

	module.exports = Plugins;

}(module, require));
},{"Storage:Settings":53,"Utils":11,"_":20}],11:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		Utils = {},

		$ = require('$'),
		_ = require('_'),
		ko = require('ko'),
		window = require('window'),

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
		/* jshint onevar: false */
		if (window.getSelection)
		{
			var sel = window.getSelection();
			sel.removeAllRanges();
			var range = window.document.createRange();
			range.selectNodeContents(element);
			sel.addRange(range);
		}
		else if (window.document.selection)
		{
			var textRange = window.document.body.createTextRange();
			textRange.moveToElementText(element);
			textRange.select();
		}
		/* jshint onevar: true */
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

}(module, require));
},{"$":15,"Consts":5,"Enums":6,"Globals":8,"_":20,"ko":17,"window":21}],12:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = JSON;
},{}],13:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = crossroads;
},{}],14:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = hasher;
},{}],15:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = $;
},{}],16:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = key;
},{}],17:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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

},{"$":15,"Globals":8,"Model:ContactTag":27,"Model:Email":28,"Utils":11,"_":20,"window":21}],18:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = moment;
},{}],19:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = ssm;
},{}],20:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = _;
},{}],21:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

module.exports = window;
},{}],22:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		$ = require('$'),
		_ = require('_'),
		ko = require('ko'),
		hasher = require('hasher'),
		crossroads = require('crossroads'),

		Globals = require('Globals'),
		Plugins = require('Plugins'),
		Utils = require('Utils'),

		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
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
				kn = this,
				oViewModel = new ViewModelClass(oScreen),
				sPosition = oViewModel.viewModelPosition(),
				oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
				oViewModelDom = null
			;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = oViewModel;

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

							Globals.popupVisibilityNames.remove(this.viewModelName);
							oViewModel.viewModelDom.css('z-index', 2000);

							Globals.tooltipTrigger(!Globals.tooltipTrigger());

							_.delay(function () {
								self.viewModelDom.hide();
							}, 300);
						}

					}, oViewModel);
				}

				Plugins.runHook('view-model-pre-build', [ViewModelClass.__name, oViewModel, oViewModelDom]);

				ko.applyBindingAccessorsToNode(oViewModelDom[0], {
					'i18nInit': true,
					'template': function () { return {'name': oViewModel.viewModelTemplate()};}
				}, oViewModel);

				Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
				if (oViewModel && 'Popups' === sPosition)
				{
					oViewModel.registerPopupKeyDown();
				}

				Plugins.runHook('view-model-post-build', [ViewModelClass.__name, oViewModel, oViewModelDom]);
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
			Plugins.runHook('view-model-on-hide', [ViewModelClassToHide.__name, ViewModelClassToHide.__vm]);
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
				Plugins.runHook('view-model-on-show', [ViewModelClassToShow.__name, ViewModelClassToShow.__vm, aParameters || []]);
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

									Plugins.runHook('view-model-on-show', [ViewModelClass.__name, ViewModelClass.__vm]);
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
},{"$":15,"Globals":8,"Knoin:AbstractViewModel":25,"Plugins":10,"Utils":11,"_":20,"crossroads":13,"hasher":14,"ko":17}],23:[function(require,module,exports){
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

}(module, require));
},{}],24:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
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
},{"Utils":11,"crossroads":13}],25:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils')
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
},{"Enums":6,"Globals":8,"Utils":11,"ko":17}],26:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
},{"Globals":8,"LinkBuilder":9,"Utils":11,"window":21}],27:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
},{"Utils":11,"ko":17}],28:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		Enums = require('Enums'),
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
},{"Enums":6,"Utils":11}],29:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		$ = require('$'),
		_ = require('_'),
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
},{"$":15,"Enums":6,"Globals":8,"LinkBuilder":9,"Model:Attachment":26,"Model:Email":28,"Storage:RainLoop:Data":49,"Utils":11,"_":20,"ko":17,"moment":18,"window":21}],30:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		$ = require('$'),
		_ = require('_'),
		ko = require('ko'),

		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		kn = require('App:Knoin'),
		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @param {Array} aViewModels
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function AbstractSettings(aViewModels)
	{
		KnoinAbstractScreen.call(this, 'settings', aViewModels);

		this.menu = ko.observableArray([]);

		this.oCurrentSubScreen = null;
		this.oViewModelPlace = null;
	}

	_.extend(AbstractSettings.prototype, KnoinAbstractScreen.prototype);

	AbstractSettings.prototype.onRoute = function (sSubName)
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

	AbstractSettings.prototype.onHide = function ()
	{
		if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
		{
			Utils.delegateRun(this.oCurrentSubScreen, 'onHide');
			this.oCurrentSubScreen.viewModelDom.hide();
		}
	};

	AbstractSettings.prototype.onBuild = function ()
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

	AbstractSettings.prototype.routes = function ()
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

	module.exports = AbstractSettings;

}(module, require));
},{"$":15,"App:Knoin":22,"Globals":8,"Knoin:AbstractScreen":24,"LinkBuilder":9,"Utils":11,"_":20,"ko":17}],31:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
	function AdminLoginScreen()
	{
		KnoinAbstractScreen.call(this, 'login', [
			require('View:Admin:Login')
		]);
	}

	_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

	AdminLoginScreen.prototype.onShow = function ()
	{
		require('App:Admin').setTitle('');
	};

	module.exports = AdminLoginScreen;

}(module, require));
},{"App:Admin":3,"Knoin:AbstractScreen":24,"View:Admin:Login":54,"_":20}],32:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		AbstractSettings = require('Screen:AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function AdminSettingsScreen()
	{
		AbstractSettings.call(this, [
			require('View:Admin:SettingsMenu'),
			require('View:Admin:SettingsPane')
		]);
	}

	_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

	AdminSettingsScreen.prototype.onShow = function ()
	{
		require('App:Admin').setTitle('');
	};

	module.exports = AdminSettingsScreen;

}(module, require));
},{"App:Admin":3,"Screen:AbstractSettings":30,"View:Admin:SettingsMenu":55,"View:Admin:SettingsPane":56,"_":20}],33:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsAbout()
	{
		var
			Settings = require('Storage:Settings'),
			Data = require('Storage:Admin:Data')
		;

		this.version = ko.observable(Settings.settingsGet('Version'));
		this.access = ko.observable(!!Settings.settingsGet('CoreAccess'));
		this.errorDesc = ko.observable('');

		this.coreReal = Data.coreReal;
		this.coreUpdatable = Data.coreUpdatable;
		this.coreAccess = Data.coreAccess;
		this.coreChecking = Data.coreChecking;
		this.coreUpdating = Data.coreUpdating;
		this.coreRemoteVersion = Data.coreRemoteVersion;
		this.coreRemoteRelease = Data.coreRemoteRelease;
		this.coreVersionCompare = Data.coreVersionCompare;

		this.statusType = ko.computed(function () {

			var
				sType = '',
				iVersionCompare = this.coreVersionCompare(),
				bChecking = this.coreChecking(),
				bUpdating = this.coreUpdating(),
				bReal = this.coreReal()
			;

			if (bChecking)
			{
				sType = 'checking';
			}
			else if (bUpdating)
			{
				sType = 'updating';
			}
			else if (bReal && 0 === iVersionCompare)
			{
				sType = 'up-to-date';
			}
			else if (bReal && -1 === iVersionCompare)
			{
				sType = 'available';
			}
			else if (!bReal)
			{
				sType = 'error';
				this.errorDesc('Cannot access the repository at the moment.');
			}

			return sType;

		}, this);
	}

	AdminSettingsAbout.prototype.onBuild = function ()
	{
		if (this.access())
		{
			require('App:Admin').reloadCoreData();
		}
	};

	AdminSettingsAbout.prototype.updateCoreData = function ()
	{
		if (!this.coreUpdating())
		{
			require('App:Admin').updateCoreData();
		}
	};

	module.exports = AdminSettingsAbout;

}(module, require));
},{"App:Admin":3,"Storage:Admin:Data":46,"Storage:Settings":53,"ko":17}],34:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsBranding()
	{
		var
			Enums = require('Enums'),
			Settings = require('Storage:Settings')
		;

		this.title = ko.observable(Settings.settingsGet('Title'));
		this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loadingDesc = ko.observable(Settings.settingsGet('LoadingDescription'));
		this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginLogo = ko.observable(Settings.settingsGet('LoginLogo'));
		this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginDescription = ko.observable(Settings.settingsGet('LoginDescription'));
		this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.loginCss = ko.observable(Settings.settingsGet('LoginCss'));
		this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsBranding.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage:Admin:Remote')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.title.trigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.loadingDesc.trigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.loginLogo.trigger, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.loginDescription.trigger, self),
				f5 = Utils.settingsSaveHelperSimpleFunction(self.loginCss.trigger, self)
			;

			self.title.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'Title': Utils.trim(sValue)
				});
			});

			self.loadingDesc.subscribe(function (sValue) {
				Remote.saveAdminConfig(f2, {
					'LoadingDescription': Utils.trim(sValue)
				});
			});

			self.loginLogo.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'LoginLogo': Utils.trim(sValue)
				});
			});

			self.loginDescription.subscribe(function (sValue) {
				Remote.saveAdminConfig(f4, {
					'LoginDescription': Utils.trim(sValue)
				});
			});

			self.loginCss.subscribe(function (sValue) {
				Remote.saveAdminConfig(f5, {
					'LoginCss': Utils.trim(sValue)
				});
			});

		}, 50);
	};

	module.exports = AdminSettingsBranding;

}(module, require));
},{"Enums":6,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"_":20,"ko":17}],35:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsContacts()
	{
		var
			Remote = require('Storage:Admin:Remote')
		;

		this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
		this.enableContacts = ko.observable(!!Settings.settingsGet('ContactsEnable'));
		this.contactsSharing = ko.observable(!!Settings.settingsGet('ContactsSharing'));
		this.contactsSync = ko.observable(!!Settings.settingsGet('ContactsSync'));

		var
			aTypes = ['sqlite', 'mysql', 'pgsql'],
			aSupportedTypes = [],
			getTypeName = function(sName) {
				switch (sName)
				{
					case 'sqlite':
						sName = 'SQLite';
						break;
					case 'mysql':
						sName = 'MySQL';
						break;
					case 'pgsql':
						sName = 'PostgreSQL';
						break;
				}

				return sName;
			}
		;

		if (!!Settings.settingsGet('SQLiteIsSupported'))
		{
			aSupportedTypes.push('sqlite');
		}
		if (!!Settings.settingsGet('MySqlIsSupported'))
		{
			aSupportedTypes.push('mysql');
		}
		if (!!Settings.settingsGet('PostgreSqlIsSupported'))
		{
			aSupportedTypes.push('pgsql');
		}

		this.contactsSupported = 0 < aSupportedTypes.length;

		this.contactsTypes = ko.observableArray([]);
		this.contactsTypesOptions = this.contactsTypes.map(function (sValue) {
			var bDisabled = -1 === Utils.inArray(sValue, aSupportedTypes);
			return {
				'id': sValue,
				'name': getTypeName(sValue) + (bDisabled ? ' (not supported)' : ''),
				'disabled': bDisabled
			};
		});

		this.contactsTypes(aTypes);
		this.contactsType = ko.observable('');

		this.mainContactsType = ko.computed({
			'owner': this,
			'read': this.contactsType,
			'write': function (sValue) {
				if (sValue !== this.contactsType())
				{
					if (-1 < Utils.inArray(sValue, aSupportedTypes))
					{
						this.contactsType(sValue);
					}
					else if (0 < aSupportedTypes.length)
					{
						this.contactsType('');
					}
				}
				else
				{
					this.contactsType.valueHasMutated();
				}
			}
		});

		this.contactsType.subscribe(function () {
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');
		}, this);

		this.pdoDsn = ko.observable(Settings.settingsGet('ContactsPdoDsn'));
		this.pdoUser = ko.observable(Settings.settingsGet('ContactsPdoUser'));
		this.pdoPassword = ko.observable(Settings.settingsGet('ContactsPdoPassword'));

		this.pdoDsnTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.pdoUserTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.pdoPasswordTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.contactsTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.testing = ko.observable(false);
		this.testContactsSuccess = ko.observable(false);
		this.testContactsError = ko.observable(false);
		this.testContactsErrorMessage = ko.observable('');

		this.testContactsCommand = Utils.createCommand(this, function () {

			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');
			this.testing(true);

			Remote.testContacts(this.onTestContactsResponse, {
				'ContactsPdoType': this.contactsType(),
				'ContactsPdoDsn': this.pdoDsn(),
				'ContactsPdoUser': this.pdoUser(),
				'ContactsPdoPassword': this.pdoPassword()
			});

		}, function () {
			return '' !== this.pdoDsn() && '' !== this.pdoUser();
		});

		this.contactsType(Settings.settingsGet('ContactsPdoType'));

		this.onTestContactsResponse = _.bind(this.onTestContactsResponse, this);
	}

	AdminSettingsContacts.prototype.onTestContactsResponse = function (sResult, oData)
	{
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.Result)
		{
			this.testContactsSuccess(true);
		}
		else
		{
			this.testContactsError(true);
			if (oData && oData.Result)
			{
				this.testContactsErrorMessage(oData.Result.Message || '');
			}
			else
			{
				this.testContactsErrorMessage('');
			}
		}

		this.testing(false);
	};

	AdminSettingsContacts.prototype.onShow = function ()
	{
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
	};

	AdminSettingsContacts.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage:Admin:Remote')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.pdoDsnTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.pdoUserTrigger, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.pdoPasswordTrigger, self),
				f5 = Utils.settingsSaveHelperSimpleFunction(self.contactsTypeTrigger, self)
			;

			self.enableContacts.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'ContactsEnable': bValue ? '1' : '0'
				});
			});

			self.contactsSharing.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'ContactsSharing': bValue ? '1' : '0'
				});
			});

			self.contactsSync.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'ContactsSync': bValue ? '1' : '0'
				});
			});

			self.contactsType.subscribe(function (sValue) {
				Remote.saveAdminConfig(f5, {
					'ContactsPdoType': sValue
				});
			});

			self.pdoDsn.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'ContactsPdoDsn': Utils.trim(sValue)
				});
			});

			self.pdoUser.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'ContactsPdoUser': Utils.trim(sValue)
				});
			});

			self.pdoPassword.subscribe(function (sValue) {
				Remote.saveAdminConfig(f4, {
					'ContactsPdoPassword': Utils.trim(sValue)
				});
			});

			self.contactsType(Settings.settingsGet('ContactsPdoType'));

		}, 50);
	};

	module.exports = AdminSettingsContacts;

}(module, require));
},{"Enums":6,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"_":20,"ko":17}],36:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),

		PopupsDomainViewModel = require('View:Popup:Domain'),

		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsDomains()
	{
		this.domains = Data.domains;
		this.domainsLoading = Data.domainsLoading;

		this.iDomainForDeletionTimeout = 0;

		this.visibility = ko.computed(function () {
			return Data.domainsLoading() ? 'visible' : 'hidden';
		}, this);

		this.domainForDeletion = ko.observable(null).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
					this.startDomainForDeletionTimeout();
				}
			}
		]});
	}

	AdminSettingsDomains.prototype.startDomainForDeletionTimeout = function ()
	{
		var self = this;
		window.clearInterval(this.iDomainForDeletionTimeout);
		this.iDomainForDeletionTimeout = window.setTimeout(function () {
			self.domainForDeletion(null);
		}, 1000 * 3);
	};

	AdminSettingsDomains.prototype.createDomain = function ()
	{
		require('App:Knoin').showScreenPopup(PopupsDomainViewModel);
	};

	AdminSettingsDomains.prototype.deleteDomain = function (oDomain)
	{
		this.domains.remove(oDomain);
		Remote.domainDelete(_.bind(this.onDomainListChangeRequest, this), oDomain.name);
	};

	AdminSettingsDomains.prototype.disableDomain = function (oDomain)
	{
		oDomain.disabled(!oDomain.disabled());
		Remote.domainDisable(_.bind(this.onDomainListChangeRequest, this), oDomain.name, oDomain.disabled());
	};

	AdminSettingsDomains.prototype.onBuild = function (oDom)
	{
		var self = this;
		oDom
			.on('click', '.b-admin-domains-list-table .e-item .e-action', function () {
				var oDomainItem = ko.dataFor(this);
				if (oDomainItem)
				{
					Remote.domain(_.bind(self.onDomainLoadRequest, self), oDomainItem.name);
				}
			})
		;

		require('App:Admin').reloadDomainList();
	};

	AdminSettingsDomains.prototype.onDomainLoadRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			require('App:Knoin').showScreenPopup(PopupsDomainViewModel, [oData.Result]);
		}
	};

	AdminSettingsDomains.prototype.onDomainListChangeRequest = function ()
	{
		require('App:Admin').reloadDomainList();
	};

	module.exports = AdminSettingsDomains;

}(module, require));
},{"App:Admin":3,"App:Knoin":22,"Enums":6,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"View:Popup:Domain":59,"_":20,"ko":17,"window":21}],37:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsGeneral()
	{
		this.mainLanguage = Data.mainLanguage;
		this.mainTheme = Data.mainTheme;

		this.language = Data.language;
		this.theme = Data.theme;

		this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;
		this.capaThemes = Data.capaThemes;
		this.capaGravatar = Data.capaGravatar;
		this.capaAdditionalAccounts = Data.capaAdditionalAccounts;
		this.capaAdditionalIdentities = Data.capaAdditionalIdentities;

		this.mainAttachmentLimit = ko.observable(Utils.pInt(Settings.settingsGet('AttachmentLimit')) / (1024 * 1024)).extend({'posInterer': 25});
		this.uploadData = Settings.settingsGet('PhpUploadSizes');
		this.uploadDataDesc = this.uploadData && (this.uploadData['upload_max_filesize'] || this.uploadData['post_max_size']) ?
			[
				this.uploadData['upload_max_filesize'] ? 'upload_max_filesize = ' + this.uploadData['upload_max_filesize'] + '; ' : '',
				this.uploadData['post_max_size'] ? 'post_max_size = ' + this.uploadData['post_max_size'] : ''
			].join('')
				: '';

		this.themesOptions = ko.computed(function () {
			return _.map(Data.themes(), function (sTheme) {
				return {
					'optValue': sTheme,
					'optText': Utils.convertThemeName(sTheme)
				};
			});
		});

		this.mainLanguageFullName = ko.computed(function () {
			return Utils.convertLangName(this.mainLanguage());
		}, this);

		this.weakPassword = !!Settings.settingsGet('WeakPassword');

		this.attachmentLimitTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsGeneral.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage:Admin:Remote')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.attachmentLimitTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.languageTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.themeTrigger, self)
			;

			self.mainAttachmentLimit.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'AttachmentLimit': Utils.pInt(sValue)
				});
			});

			self.language.subscribe(function (sValue) {
				Remote.saveAdminConfig(f2, {
					'Language': Utils.trim(sValue)
				});
			});

			self.theme.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'Theme': Utils.trim(sValue)
				});
			});

			self.capaAdditionalAccounts.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaAdditionalAccounts': bValue ? '1' : '0'
				});
			});

			self.capaAdditionalIdentities.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaAdditionalIdentities': bValue ? '1' : '0'
				});
			});

			self.capaGravatar.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaGravatar': bValue ? '1' : '0'
				});
			});

			self.capaThemes.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaThemes': bValue ? '1' : '0'
				});
			});

			self.allowLanguagesOnSettings.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnSettings': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	AdminSettingsGeneral.prototype.selectLanguage = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:Languages'));
	};

	/**
	 * @return {string}
	 */
	AdminSettingsGeneral.prototype.phpInfoLink = function ()
	{
		return LinkBuilder.phpInfo();
	};

	module.exports = AdminSettingsGeneral;

}(module, require));
},{"App:Knoin":22,"Enums":6,"LinkBuilder":9,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"View:Popup:Languages":60,"_":20,"ko":17}],38:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		ko = require('ko'),
		moment = require('moment'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsLicensing()
	{
		this.licensing = Data.licensing;
		this.licensingProcess = Data.licensingProcess;
		this.licenseValid = Data.licenseValid;
		this.licenseExpired = Data.licenseExpired;
		this.licenseError = Data.licenseError;
		this.licenseTrigger = Data.licenseTrigger;

		this.adminDomain = ko.observable('');
		this.subscriptionEnabled = ko.observable(!!Settings.settingsGet('SubscriptionEnabled'));

		this.licenseTrigger.subscribe(function () {
			if (this.subscriptionEnabled())
			{
				require('App:Admin').reloadLicensing(true);
			}
		}, this);
	}

	AdminSettingsLicensing.prototype.onBuild = function ()
	{
		if (this.subscriptionEnabled())
		{
			require('App:Admin').reloadLicensing(false);
		}
	};

	AdminSettingsLicensing.prototype.onShow = function ()
	{
		this.adminDomain(Settings.settingsGet('AdminDomain'));
	};

	AdminSettingsLicensing.prototype.showActivationForm = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:Activate'));
	};

	/**
	 * @returns {string}
	 */
	AdminSettingsLicensing.prototype.licenseExpiredMomentValue = function ()
	{
		var
			iTime = this.licenseExpired(),
			oDate = moment.unix(iTime)
		;

		return iTime && 1898625600 === iTime ? 'Never' : (oDate.format('LL') + ' (' + oDate.from(moment()) + ')');
	};

	module.exports = AdminSettingsLicensing;

}(module, require));
},{"App:Admin":3,"App:Knoin":22,"Storage:Admin:Data":46,"Storage:Settings":53,"View:Popup:Activate":57,"ko":17,"moment":18}],39:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsLogin()
	{
		this.determineUserLanguage = Data.determineUserLanguage;
		this.determineUserDomain = Data.determineUserDomain;

		this.defaultDomain = ko.observable(Settings.settingsGet('LoginDefaultDomain'));

		this.allowLanguagesOnLogin = Data.allowLanguagesOnLogin;
		this.defaultDomainTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsLogin.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage:Admin:Remote')
		;

		_.delay(function () {

			var f1 = Utils.settingsSaveHelperSimpleFunction(self.defaultDomainTrigger, self);

			self.determineUserLanguage.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'DetermineUserLanguage': bValue ? '1' : '0'
				});
			});

			self.determineUserDomain.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'DetermineUserDomain': bValue ? '1' : '0'
				});
			});

			self.allowLanguagesOnLogin.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnLogin': bValue ? '1' : '0'
				});
			});

			self.defaultDomain.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'LoginDefaultDomain': Utils.trim(sValue)
				});
			});

		}, 50);
	};

	module.exports = AdminSettingsLogin;

}(module, require));
},{"Enums":6,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"_":20,"ko":17}],40:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		window = require('window'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsPackages()
	{
		this.packagesError = ko.observable('');

		this.packages = Data.packages;
		this.packagesLoading = Data.packagesLoading;
		this.packagesReal = Data.packagesReal;
		this.packagesMainUpdatable = Data.packagesMainUpdatable;

		this.packagesCurrent = this.packages.filter(function (oItem) {
			return oItem && '' !== oItem['installed'] && !oItem['compare'];
		});

		this.packagesAvailableForUpdate = this.packages.filter(function (oItem) {
			return oItem && '' !== oItem['installed'] && !!oItem['compare'];
		});

		this.packagesAvailableForInstallation = this.packages.filter(function (oItem) {
			return oItem && '' === oItem['installed'];
		});

		this.visibility = ko.computed(function () {
			return Data.packagesLoading() ? 'visible' : 'hidden';
		}, this);
	}

	AdminSettingsPackages.prototype.onShow = function ()
	{
		this.packagesError('');
	};

	AdminSettingsPackages.prototype.onBuild = function ()
	{
		require('App:Admin').reloadPackagesList();
	};

	AdminSettingsPackages.prototype.requestHelper = function (oPackage, bInstall)
	{
		var self = this;
		return function (sResult, oData) {

			if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
			{
				if (oData && oData.ErrorCode)
				{
					self.packagesError(Utils.getNotification(oData.ErrorCode));
				}
				else
				{
					self.packagesError(Utils.getNotification(
						bInstall ? Enums.Notification.CantInstallPackage : Enums.Notification.CantDeletePackage));
				}
			}

			_.each(Data.packages(), function (oItem) {
				if (oItem && oPackage && oItem['loading']() && oPackage['file'] === oItem['file'])
				{
					oPackage['loading'](false);
					oItem['loading'](false);
				}
			});

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result['Reload'])
			{
				window.location.reload();
			}
			else
			{
				require('App:Admin').reloadPackagesList();
			}
		};
	};

	AdminSettingsPackages.prototype.deletePackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageDelete(this.requestHelper(oPackage, false), oPackage);
		}
	};

	AdminSettingsPackages.prototype.installPackage = function (oPackage)
	{
		if (oPackage)
		{
			oPackage['loading'](true);
			Remote.packageInstall(this.requestHelper(oPackage, true), oPackage);
		}
	};

	module.exports = AdminSettingsPackages;

}(module, require));
},{"App:Admin":3,"Enums":6,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Utils":11,"ko":17,"window":21}],41:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsPlugins()
	{
		this.enabledPlugins = ko.observable(!!Settings.settingsGet('EnabledPlugins'));

		this.pluginsError = ko.observable('');

		this.plugins = Data.plugins;
		this.pluginsLoading = Data.pluginsLoading;

		this.visibility = ko.computed(function () {
			return Data.pluginsLoading() ? 'visible' : 'hidden';
		}, this);

		this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
		this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
	}

	AdminSettingsPlugins.prototype.disablePlugin = function (oPlugin)
	{
		oPlugin.disabled(!oPlugin.disabled());
		Remote.pluginDisable(this.onPluginDisableRequest, oPlugin.name, oPlugin.disabled());
	};

	AdminSettingsPlugins.prototype.configurePlugin = function (oPlugin)
	{
		Remote.plugin(this.onPluginLoadRequest, oPlugin.name);
	};

	AdminSettingsPlugins.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.e-item .configure-plugin-action', function () {
				var oPlugin = ko.dataFor(this);
				if (oPlugin)
				{
					self.configurePlugin(oPlugin);
				}
			})
			.on('click', '.e-item .disabled-plugin', function () {
				var oPlugin = ko.dataFor(this);
				if (oPlugin)
				{
					self.disablePlugin(oPlugin);
				}
			})
		;

		this.enabledPlugins.subscribe(function (bValue) {
			Remote.saveAdminConfig(Utils.emptyFunction, {
				'EnabledPlugins': bValue ? '1' : '0'
			});
		});
	};

	AdminSettingsPlugins.prototype.onShow = function ()
	{
		this.pluginsError('');
		require('App:Admin').reloadPluginList();
	};

	AdminSettingsPlugins.prototype.onPluginLoadRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			require('App:Knoin').showScreenPopup(require('View:Popup:Plugin'), [oData.Result]);
		}
	};

	AdminSettingsPlugins.prototype.onPluginDisableRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData)
		{
			if (!oData.Result && oData.ErrorCode)
			{
				if (Enums.Notification.UnsupportedPluginPackage === oData.ErrorCode && oData.ErrorMessage && '' !== oData.ErrorMessage)
				{
					this.pluginsError(oData.ErrorMessage);
				}
				else
				{
					this.pluginsError(Utils.getNotification(oData.ErrorCode));
				}
			}
		}

		require('App:Admin').reloadPluginList();
	};

	module.exports = AdminSettingsPlugins;

}(module, require));
},{"App:Admin":3,"App:Knoin":22,"Enums":6,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"View:Popup:Plugin":61,"_":20,"ko":17}],42:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsSecurity()
	{
		this.useLocalProxyForExternalImages = Data.useLocalProxyForExternalImages;

		this.capaOpenPGP = ko.observable(Settings.capa(Enums.Capa.OpenPGP));
		this.capaTwoFactorAuth = ko.observable(Settings.capa(Enums.Capa.TwoFactor));

		this.adminLogin = ko.observable(Settings.settingsGet('AdminLogin'));
		this.adminPassword = ko.observable('');
		this.adminPasswordNew = ko.observable('');
		this.adminPasswordNew2 = ko.observable('');
		this.adminPasswordNewError = ko.observable(false);

		this.adminPasswordUpdateError = ko.observable(false);
		this.adminPasswordUpdateSuccess = ko.observable(false);

		this.adminPassword.subscribe(function () {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
		}, this);

		this.adminPasswordNew.subscribe(function () {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		}, this);

		this.adminPasswordNew2.subscribe(function () {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		}, this);

		this.saveNewAdminPasswordCommand = Utils.createCommand(this, function () {

			if (this.adminPasswordNew() !== this.adminPasswordNew2())
			{
				this.adminPasswordNewError(true);
				return false;
			}

			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);

			Remote.saveNewAdminPassword(this.onNewAdminPasswordResponse, {
				'Password': this.adminPassword(),
				'NewPassword': this.adminPasswordNew()
			});

		}, function () {
			return '' !== this.adminPassword() && '' !== this.adminPasswordNew() && '' !== this.adminPasswordNew2();
		});

		this.onNewAdminPasswordResponse = _.bind(this.onNewAdminPasswordResponse, this);
	}

	AdminSettingsSecurity.prototype.onNewAdminPasswordResponse = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.adminPassword('');
			this.adminPasswordNew('');
			this.adminPasswordNew2('');

			this.adminPasswordUpdateSuccess(true);
		}
		else
		{
			this.adminPasswordUpdateError(true);
		}
	};

	AdminSettingsSecurity.prototype.onBuild = function ()
	{
		var
			Remote = require('Storage:Admin:Remote')
		;

		this.capaOpenPGP.subscribe(function (bValue) {
			Remote.saveAdminConfig(Utils.emptyFunction, {
				'CapaOpenPGP': bValue ? '1' : '0'
			});
		});

		this.capaTwoFactorAuth.subscribe(function (bValue) {
			Remote.saveAdminConfig(Utils.emptyFunction, {
				'CapaTwoFactorAuth': bValue ? '1' : '0'
			});
		});

		this.useLocalProxyForExternalImages.subscribe(function (bValue) {
			Remote.saveAdminConfig(null, {
				'UseLocalProxyForExternalImages': bValue ? '1' : '0'
			});
		});
	};

	AdminSettingsSecurity.prototype.onHide = function ()
	{
		this.adminPassword('');
		this.adminPasswordNew('');
		this.adminPasswordNew2('');
	};

	/**
	 * @return {string}
	 */
	AdminSettingsSecurity.prototype.phpInfoLink = function ()
	{
		return LinkBuilder.phpInfo();
	};

	module.exports = AdminSettingsSecurity;

}(module, require));

},{"Enums":6,"LinkBuilder":9,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"_":20,"ko":17}],43:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsSocial()
	{
		var Data = require('Storage:Admin:Data');

		this.googleEnable = Data.googleEnable;
		this.googleClientID = Data.googleClientID;
		this.googleApiKey = Data.googleApiKey;
		this.googleClientSecret = Data.googleClientSecret;
		this.googleTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.googleTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.googleTrigger3 = ko.observable(Enums.SaveSettingsStep.Idle);

		this.facebookSupported = Data.facebookSupported;
		this.facebookEnable = Data.facebookEnable;
		this.facebookAppID = Data.facebookAppID;
		this.facebookAppSecret = Data.facebookAppSecret;
		this.facebookTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.facebookTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

		this.twitterEnable = Data.twitterEnable;
		this.twitterConsumerKey = Data.twitterConsumerKey;
		this.twitterConsumerSecret = Data.twitterConsumerSecret;
		this.twitterTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		this.twitterTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

		this.dropboxEnable = Data.dropboxEnable;
		this.dropboxApiKey = Data.dropboxApiKey;
		this.dropboxTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsSocial.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage:Admin:Remote')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger1, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger2, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger1, self),
				f4 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger2, self),
				f5 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger1, self),
				f6 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger2, self),
				f7 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger3, self),
				f8 = Utils.settingsSaveHelperSimpleFunction(self.dropboxTrigger1, self)
			;

			self.facebookEnable.subscribe(function (bValue) {
				if (self.facebookSupported())
				{
					Remote.saveAdminConfig(Utils.emptyFunction, {
						'FacebookEnable': bValue ? '1' : '0'
					});
				}
			});

			self.facebookAppID.subscribe(function (sValue) {
				if (self.facebookSupported())
				{
					Remote.saveAdminConfig(f1, {
						'FacebookAppID': Utils.trim(sValue)
					});
				}
			});

			self.facebookAppSecret.subscribe(function (sValue) {
				if (self.facebookSupported())
				{
					Remote.saveAdminConfig(f2, {
						'FacebookAppSecret': Utils.trim(sValue)
					});
				}
			});

			self.twitterEnable.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'TwitterEnable': bValue ? '1' : '0'
				});
			});

			self.twitterConsumerKey.subscribe(function (sValue) {
				Remote.saveAdminConfig(f3, {
					'TwitterConsumerKey': Utils.trim(sValue)
				});
			});

			self.twitterConsumerSecret.subscribe(function (sValue) {
				Remote.saveAdminConfig(f4, {
					'TwitterConsumerSecret': Utils.trim(sValue)
				});
			});

			self.googleEnable.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'GoogleEnable': bValue ? '1' : '0'
				});
			});

			self.googleClientID.subscribe(function (sValue) {
				Remote.saveAdminConfig(f5, {
					'GoogleClientID': Utils.trim(sValue)
				});
			});

			self.googleClientSecret.subscribe(function (sValue) {
				Remote.saveAdminConfig(f6, {
					'GoogleClientSecret': Utils.trim(sValue)
				});
			});

			self.googleApiKey.subscribe(function (sValue) {
				Remote.saveAdminConfig(f7, {
					'GoogleApiKey': Utils.trim(sValue)
				});
			});

			self.dropboxEnable.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'DropboxEnable': bValue ? '1' : '0'
				});
			});

			self.dropboxApiKey.subscribe(function (sValue) {
				Remote.saveAdminConfig(f8, {
					'DropboxApiKey': Utils.trim(sValue)
				});
			});

		}, 50);
	};

	module.exports = AdminSettingsSocial;

}(module, require));
},{"Enums":6,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Utils":11,"_":20,"ko":17}],44:[function(require,module,exports){
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
},{"Enums":6,"Storage:Settings":53,"Utils":11}],45:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		$ = require('$'),
		_ = require('_'),

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
},{"$":15,"Consts":5,"Enums":6,"Globals":8,"LinkBuilder":9,"Plugins":10,"Storage:Settings":53,"Utils":11,"_":20,"window":21}],46:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		AbstractData = require('Storage:Abstract:Data')
	;

	/**
	 * @constructor
	 * @extends AbstractData
	 */
	function AdminDataStorage()
	{
		AbstractData.call(this);

		this.domainsLoading = ko.observable(false).extend({'throttle': 100});
		this.domains = ko.observableArray([]);

		this.pluginsLoading = ko.observable(false).extend({'throttle': 100});
		this.plugins = ko.observableArray([]);

		this.packagesReal = ko.observable(true);
		this.packagesMainUpdatable = ko.observable(true);
		this.packagesLoading = ko.observable(false).extend({'throttle': 100});
		this.packages = ko.observableArray([]);

		this.coreReal = ko.observable(true);
		this.coreUpdatable = ko.observable(true);
		this.coreAccess = ko.observable(true);
		this.coreChecking = ko.observable(false).extend({'throttle': 100});
		this.coreUpdating = ko.observable(false).extend({'throttle': 100});
		this.coreRemoteVersion = ko.observable('');
		this.coreRemoteRelease = ko.observable('');
		this.coreVersionCompare = ko.observable(-2);

		this.licensing = ko.observable(false);
		this.licensingProcess = ko.observable(false);
		this.licenseValid = ko.observable(false);
		this.licenseExpired = ko.observable(0);
		this.licenseError = ko.observable('');

		this.licenseTrigger = ko.observable(false);

		this.adminManLoading = ko.computed(function () {
			return '000' !== [this.domainsLoading() ? '1' : '0', this.pluginsLoading() ? '1' : '0', this.packagesLoading() ? '1' : '0'].join('');
		}, this);

		this.adminManLoadingVisibility = ko.computed(function () {
			return this.adminManLoading() ? 'visible' : 'hidden';
		}, this).extend({'rateLimit': 300});
	}

	_.extend(AdminDataStorage.prototype, AbstractData.prototype);

	AdminDataStorage.prototype.populateDataOnStart = function()
	{
		AbstractData.prototype.populateDataOnStart.call(this);
	};

	module.exports = new AdminDataStorage();

}(module, require));
},{"Storage:Abstract:Data":44,"_":20,"ko":17}],47:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),

		AbstractRemoteStorage = require('Storage:Abstract:Remote')
	;

	/**
	 * @constructor
	 * @extends AbstractRemoteStorage
	 */
	function AdminRemoteStorage()
	{
		AbstractRemoteStorage.call(this);

		this.oRequests = {};
	}

	_.extend(AdminRemoteStorage.prototype, AbstractRemoteStorage.prototype);

	/**
	 * @param {?Function} fCallback
	 * @param {string} sLogin
	 * @param {string} sPassword
	 */
	AdminRemoteStorage.prototype.adminLogin = function (fCallback, sLogin, sPassword)
	{
		this.defaultRequest(fCallback, 'AdminLogin', {
			'Login': sLogin,
			'Password': sPassword
		});
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.adminLogout = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminLogout');
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminRemoteStorage.prototype.saveAdminConfig = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.domainList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminDomainList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.pluginList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPluginList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.packagesList = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPackagesList');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.coreData = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminCoreData');
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.updateCoreData = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminUpdateCoreData', {}, 90000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	AdminRemoteStorage.prototype.packageInstall = function (fCallback, oPackage)
	{
		this.defaultRequest(fCallback, 'AdminPackageInstall', {
			'Id': oPackage.id,
			'Type': oPackage.type,
			'File': oPackage.file
		}, 60000);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oPackage
	 */
	AdminRemoteStorage.prototype.packageDelete = function (fCallback, oPackage)
	{
		this.defaultRequest(fCallback, 'AdminPackageDelete', {
			'Id': oPackage.id
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminRemoteStorage.prototype.domain = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminDomainLoad', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminRemoteStorage.prototype.plugin = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminPluginLoad', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 */
	AdminRemoteStorage.prototype.domainDelete = function (fCallback, sName)
	{
		this.defaultRequest(fCallback, 'AdminDomainDelete', {
			'Name': sName
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	AdminRemoteStorage.prototype.domainDisable = function (fCallback, sName, bDisabled)
	{
		return this.defaultRequest(fCallback, 'AdminDomainDisable', {
			'Name': sName,
			'Disabled': !!bDisabled ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {Object} oConfig
	 */
	AdminRemoteStorage.prototype.pluginSettingsUpdate = function (fCallback, oConfig)
	{
		return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {boolean} bForce
	 */
	AdminRemoteStorage.prototype.licensing = function (fCallback, bForce)
	{
		return this.defaultRequest(fCallback, 'AdminLicensing', {
			'Force' : bForce ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sDomain
	 * @param {string} sKey
	 */
	AdminRemoteStorage.prototype.licensingActivate = function (fCallback, sDomain, sKey)
	{
		return this.defaultRequest(fCallback, 'AdminLicensingActivate', {
			'Domain' : sDomain,
			'Key' : sKey
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {string} sName
	 * @param {boolean} bDisabled
	 */
	AdminRemoteStorage.prototype.pluginDisable = function (fCallback, sName, bDisabled)
	{
		return this.defaultRequest(fCallback, 'AdminPluginDisable', {
			'Name': sName,
			'Disabled': !!bDisabled ? '1' : '0'
		});
	};

	AdminRemoteStorage.prototype.createOrUpdateDomain = function (fCallback,
		bCreate, sName, sIncHost, iIncPort, sIncSecure, bIncShortLogin,
		sOutHost, iOutPort, sOutSecure, bOutShortLogin, bOutAuth, sWhiteList)
	{
		this.defaultRequest(fCallback, 'AdminDomainSave', {
			'Create': bCreate ? '1' : '0',
			'Name': sName,
			'IncHost': sIncHost,
			'IncPort': iIncPort,
			'IncSecure': sIncSecure,
			'IncShortLogin': bIncShortLogin ? '1' : '0',
			'OutHost': sOutHost,
			'OutPort': iOutPort,
			'OutSecure': sOutSecure,
			'OutShortLogin': bOutShortLogin ? '1' : '0',
			'OutAuth': bOutAuth ? '1' : '0',
			'WhiteList': sWhiteList
		});
	};

	AdminRemoteStorage.prototype.testConnectionForDomain = function (fCallback, sName,
		sIncHost, iIncPort, sIncSecure,
		sOutHost, iOutPort, sOutSecure, bOutAuth)
	{
		this.defaultRequest(fCallback, 'AdminDomainTest', {
			'Name': sName,
			'IncHost': sIncHost,
			'IncPort': iIncPort,
			'IncSecure': sIncSecure,
			'OutHost': sOutHost,
			'OutPort': iOutPort,
			'OutSecure': sOutSecure,
			'OutAuth': bOutAuth ? '1' : '0'
		});
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminRemoteStorage.prototype.testContacts = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminContactsTest', oData);
	};

	/**
	 * @param {?Function} fCallback
	 * @param {?} oData
	 */
	AdminRemoteStorage.prototype.saveNewAdminPassword = function (fCallback, oData)
	{
		this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
	};

	/**
	 * @param {?Function} fCallback
	 */
	AdminRemoteStorage.prototype.adminPing = function (fCallback)
	{
		this.defaultRequest(fCallback, 'AdminPing');
	};

	module.exports = new AdminRemoteStorage();

}(module, require));
},{"Storage:Abstract:Remote":45,"_":20}],48:[function(require,module,exports){
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
},{"Enums":6,"LinkBuilder":9,"Storage:Settings":53,"Utils":11,"_":20}],49:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		window = require('window'),
		$ = require('$'),
		_ = require('_'),
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
					Utils.initBlockquoteSwitcher(oBody);
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

},{"$":15,"App:Knoin":22,"Consts":5,"Enums":6,"Globals":8,"LinkBuilder":9,"Model:Message":29,"Storage:Abstract:Data":44,"Storage:LocalStorage":50,"Storage:RainLoop:Cache":48,"Storage:Settings":53,"Utils":11,"_":20,"ko":17,"moment":18,"window":21}],50:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	/**
	 * @constructor
	 */
	function LocalStorage()
	{
		var
			_ = require('_'),
			NextStorageDriver = _.find([
				require('Storage:LocalStorage:Cookie'),
				require('Storage:LocalStorage:LocalStorage')
			], function (NextStorageDriver) {
				return NextStorageDriver.supported();
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
},{"Storage:LocalStorage:Cookie":51,"Storage:LocalStorage:LocalStorage":52,"_":20}],51:[function(require,module,exports){
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
},{"$":15,"Consts":5,"JSON":12,"Utils":11}],52:[function(require,module,exports){
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
},{"Consts":5,"JSON":12,"Utils":11,"window":21}],53:[function(require,module,exports){
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
},{"Utils":11,"window":21}],54:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminLoginViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Center', 'AdminLogin');

		this.login = ko.observable('');
		this.password = ko.observable('');

		this.loginError = ko.observable(false);
		this.passwordError = ko.observable(false);

		this.loginFocus = ko.observable(false);

		this.login.subscribe(function () {
			this.loginError(false);
		}, this);

		this.password.subscribe(function () {
			this.passwordError(false);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.submitCommand = Utils.createCommand(this, function () {

			Utils.triggerAutocompleteInputChange();

			this.loginError('' === Utils.trim(this.login()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.loginError() || this.passwordError())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.adminLogin(_.bind(function (sResult, oData) {

				if (Enums.StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action)
				{
					if (oData.Result)
					{
						require('App:Admin').loginAndLogoutReload();
					}
					else if (oData.ErrorCode)
					{
						this.submitRequest(false);
						this.submitError(Utils.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitRequest(false);
					this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.login(), this.password());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminLoginViewModel', AdminLoginViewModel);

	AdminLoginViewModel.prototype.onShow = function ()
	{
		kn.routeOff();

		_.delay(_.bind(function () {
			this.loginFocus(true);
		}, this), 100);

	};

	AdminLoginViewModel.prototype.onHide = function ()
	{
		this.loginFocus(false);
	};

	AdminLoginViewModel.prototype.onBuild = function ()
	{
		Utils.triggerAutocompleteInputChange(true);
	};

	AdminLoginViewModel.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	module.exports = AdminLoginViewModel;

}(module, require));
},{"App:Admin":3,"App:Knoin":22,"Enums":6,"Knoin:AbstractViewModel":25,"Storage:Admin:Remote":47,"Utils":11,"_":20,"ko":17}],55:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		kn = require('App:Knoin'),
		Globals = require('Globals'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminMenuViewModel(oScreen)
	{
		KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminMenuViewModel', AdminMenuViewModel);

	AdminMenuViewModel.prototype.link = function (sRoute)
	{
		return '#/' + sRoute;
	};

	module.exports = AdminMenuViewModel;

}(module, require));

},{"App:Knoin":22,"Globals":8,"Knoin:AbstractViewModel":25}],56:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminPaneViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

		this.adminDomain = ko.observable(Settings.settingsGet('AdminDomain'));
		this.version = ko.observable(Settings.settingsGet('Version'));

		this.adminManLoadingVisibility = Data.adminManLoadingVisibility;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminPaneViewModel', AdminPaneViewModel);

	AdminPaneViewModel.prototype.logoutClick = function ()
	{
		Remote.adminLogout(function () {
			require('App:Admin').loginAndLogoutReload();
		});
	};

	module.exports = AdminPaneViewModel;

}(module, require));
},{"App:Admin":3,"App:Knoin":22,"Knoin:AbstractViewModel":25,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"ko":17}],57:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsActivateViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsActivate');

		var self = this;

		this.domain = ko.observable('');
		this.key = ko.observable('');
		this.key.focus = ko.observable(false);
		this.activationSuccessed = ko.observable(false);

		this.licenseTrigger = Data.licenseTrigger;

		this.activateProcess = ko.observable(false);
		this.activateText = ko.observable('');
		this.activateText.isError = ko.observable(false);

		this.key.subscribe(function () {
			this.activateText('');
			this.activateText.isError(false);
		}, this);

		this.activationSuccessed.subscribe(function (bValue) {
			if (bValue)
			{
				this.licenseTrigger(!this.licenseTrigger());
			}
		}, this);

		this.activateCommand = Utils.createCommand(this, function () {

			this.activateProcess(true);
			if (this.validateSubscriptionKey())
			{
				Remote.licensingActivate(function (sResult, oData) {

					self.activateProcess(false);
					if (Enums.StorageResultType.Success === sResult && oData.Result)
					{
						if (true === oData.Result)
						{
							self.activationSuccessed(true);
							self.activateText('Subscription Key Activated Successfully');
							self.activateText.isError(false);
						}
						else
						{
							self.activateText(oData.Result);
							self.activateText.isError(true);
							self.key.focus(true);
						}
					}
					else if (oData.ErrorCode)
					{
						self.activateText(Utils.getNotification(oData.ErrorCode));
						self.activateText.isError(true);
						self.key.focus(true);
					}
					else
					{
						self.activateText(Utils.getNotification(Enums.Notification.UnknownError));
						self.activateText.isError(true);
						self.key.focus(true);
					}

				}, this.domain(), this.key());
			}
			else
			{
				this.activateProcess(false);
				this.activateText('Invalid Subscription Key');
				this.activateText.isError(true);
				this.key.focus(true);
			}

		}, function () {
			return !this.activateProcess() && '' !== this.domain() && '' !== this.key() && !this.activationSuccessed();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsActivateViewModel', PopupsActivateViewModel);

	PopupsActivateViewModel.prototype.onShow = function ()
	{
		this.domain(Settings.settingsGet('AdminDomain'));
		if (!this.activateProcess())
		{
			this.key('');
			this.activateText('');
			this.activateText.isError(false);
			this.activationSuccessed(false);
		}
	};

	PopupsActivateViewModel.prototype.onFocus = function ()
	{
		if (!this.activateProcess())
		{
			this.key.focus(true);
		}
	};

	/**
	 * @returns {boolean}
	 */
	PopupsActivateViewModel.prototype.validateSubscriptionKey = function ()
	{
		var sValue = this.key();
		return '' === sValue || !!/^RL[\d]+-[A-Z0-9\-]+Z$/.test(Utils.trim(sValue));
	};

	module.exports = PopupsActivateViewModel;

}(module, require));
},{"App:Knoin":22,"Enums":6,"Knoin:AbstractViewModel":25,"Storage:Admin:Data":46,"Storage:Admin:Remote":47,"Storage:Settings":53,"Utils":11,"ko":17}],58:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
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

	module.exports = PopupsAskViewModel;

}(module, require));
},{"App:Knoin":22,"Enums":6,"Knoin:AbstractViewModel":25,"Utils":11,"key":16,"ko":17}],59:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Utils = require('Utils'),

		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsDomainViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsDomain');

		this.edit = ko.observable(false);
		this.saving = ko.observable(false);
		this.savingError = ko.observable('');
		this.whiteListPage = ko.observable(false);

		this.testing = ko.observable(false);
		this.testingDone = ko.observable(false);
		this.testingImapError = ko.observable(false);
		this.testingSmtpError = ko.observable(false);
		this.testingImapErrorDesc = ko.observable('');
		this.testingSmtpErrorDesc = ko.observable('');

		this.testingImapError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingImapErrorDesc('');
			}
		}, this);

		this.testingSmtpError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingSmtpErrorDesc('');
			}
		}, this);

		this.testingImapErrorDesc = ko.observable('');
		this.testingSmtpErrorDesc = ko.observable('');

		this.imapServerFocus = ko.observable(false);
		this.smtpServerFocus = ko.observable(false);

		this.name = ko.observable('');
		this.name.focused = ko.observable(false);

		this.imapServer = ko.observable('');
		this.imapPort = ko.observable('' + Consts.Values.ImapDefaulPort);
		this.imapSecure = ko.observable(Enums.ServerSecure.None);
		this.imapShortLogin = ko.observable(false);
		this.smtpServer = ko.observable('');
		this.smtpPort = ko.observable('' + Consts.Values.SmtpDefaulPort);
		this.smtpSecure = ko.observable(Enums.ServerSecure.None);
		this.smtpShortLogin = ko.observable(false);
		this.smtpAuth = ko.observable(true);
		this.whiteList = ko.observable('');

		this.headerText = ko.computed(function () {
			var sName = this.name();
			return this.edit() ? 'Edit Domain "' + sName + '"' :
				'Add Domain' + ('' === sName ? '' : ' "' + sName + '"');
		}, this);

		this.domainIsComputed = ko.computed(function () {
			return '' !== this.name() &&
				'' !== this.imapServer() &&
				'' !== this.imapPort() &&
				'' !== this.smtpServer() &&
				'' !== this.smtpPort();
		}, this);

		this.canBeTested = ko.computed(function () {
			return !this.testing() && this.domainIsComputed();
		}, this);

		this.canBeSaved = ko.computed(function () {
			return !this.saving() && this.domainIsComputed();
		}, this);

		this.createOrAddCommand = Utils.createCommand(this, function () {
			this.saving(true);
			Remote.createOrUpdateDomain(
				_.bind(this.onDomainCreateOrSaveResponse, this),
				!this.edit(),
				this.name(),
				this.imapServer(),
				Utils.pInt(this.imapPort()),
				this.imapSecure(),
				this.imapShortLogin(),
				this.smtpServer(),
				Utils.pInt(this.smtpPort()),
				this.smtpSecure(),
				this.smtpShortLogin(),
				this.smtpAuth(),
				this.whiteList()
			);
		}, this.canBeSaved);

		this.testConnectionCommand = Utils.createCommand(this, function () {
			this.whiteListPage(false);
			this.testingDone(false);
			this.testingImapError(false);
			this.testingSmtpError(false);
			this.testing(true);
			Remote.testConnectionForDomain(
				_.bind(this.onTestConnectionResponse, this),
				this.name(),
				this.imapServer(),
				Utils.pInt(this.imapPort()),
				this.imapSecure(),
				this.smtpServer(),
				Utils.pInt(this.smtpPort()),
				this.smtpSecure(),
				this.smtpAuth()
			);
		}, this.canBeTested);

		this.whiteListCommand = Utils.createCommand(this, function () {
			this.whiteListPage(!this.whiteListPage());
		});

		// smart form improvements
		this.imapServerFocus.subscribe(function (bValue) {
			if (bValue && '' !== this.name() && '' === this.imapServer())
			{
				this.imapServer(this.name().replace(/[.]?[*][.]?/g, ''));
			}
		}, this);

		this.smtpServerFocus.subscribe(function (bValue) {
			if (bValue && '' !== this.imapServer() && '' === this.smtpServer())
			{
				this.smtpServer(this.imapServer().replace(/imap/ig, 'smtp'));
			}
		}, this);

		this.imapSecure.subscribe(function (sValue) {
			var iPort = Utils.pInt(this.imapPort());
			sValue = Utils.pString(sValue);
			switch (sValue)
			{
				case '0':
					if (993 === iPort)
					{
						this.imapPort('143');
					}
					break;
				case '1':
					if (143 === iPort)
					{
						this.imapPort('993');
					}
					break;
			}
		}, this);

		this.smtpSecure.subscribe(function (sValue) {
			var iPort = Utils.pInt(this.smtpPort());
			sValue = Utils.pString(sValue);
			switch (sValue)
			{
				case '0':
					if (465 === iPort || 587 === iPort)
					{
						this.smtpPort('25');
					}
					break;
				case '1':
					if (25 === iPort || 587 === iPort)
					{
						this.smtpPort('465');
					}
					break;
				case '2':
					if (25 === iPort || 465 === iPort)
					{
						this.smtpPort('587');
					}
					break;
			}
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsDomainViewModel', PopupsDomainViewModel);

	PopupsDomainViewModel.prototype.onTestConnectionResponse = function (sResult, oData)
	{
		this.testing(false);
		if (Enums.StorageResultType.Success === sResult && oData.Result)
		{
			this.testingDone(true);
			this.testingImapError(true !== oData.Result.Imap);
			this.testingSmtpError(true !== oData.Result.Smtp);

			if (this.testingImapError() && oData.Result.Imap)
			{
				this.testingImapErrorDesc(oData.Result.Imap);
			}

			if (this.testingSmtpError() && oData.Result.Smtp)
			{
				this.testingSmtpErrorDesc(oData.Result.Smtp);
			}
		}
		else
		{
			this.testingImapError(true);
			this.testingSmtpError(true);
		}
	};

	PopupsDomainViewModel.prototype.onDomainCreateOrSaveResponse = function (sResult, oData)
	{
		this.saving(false);
		if (Enums.StorageResultType.Success === sResult && oData)
		{
			if (oData.Result)
			{
				require('App:Admin').reloadDomainList();
				this.closeCommand();
			}
			else if (Enums.Notification.DomainAlreadyExists === oData.ErrorCode)
			{
				this.savingError('Domain already exists');
			}
		}
		else
		{
			this.savingError('Unknown error');
		}
	};

	PopupsDomainViewModel.prototype.onHide = function ()
	{
		this.whiteListPage(false);
	};

	PopupsDomainViewModel.prototype.onShow = function (oDomain)
	{
		this.saving(false);
		this.whiteListPage(false);

		this.testing(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSmtpError(false);

		this.clearForm();
		if (oDomain)
		{
			this.edit(true);

			this.name(Utils.trim(oDomain.Name));
			this.imapServer(Utils.trim(oDomain.IncHost));
			this.imapPort('' + Utils.pInt(oDomain.IncPort));
			this.imapSecure(Utils.trim(oDomain.IncSecure));
			this.imapShortLogin(!!oDomain.IncShortLogin);
			this.smtpServer(Utils.trim(oDomain.OutHost));
			this.smtpPort('' + Utils.pInt(oDomain.OutPort));
			this.smtpSecure(Utils.trim(oDomain.OutSecure));
			this.smtpShortLogin(!!oDomain.OutShortLogin);
			this.smtpAuth(!!oDomain.OutAuth);
			this.whiteList(Utils.trim(oDomain.WhiteList));
		}
	};

	PopupsDomainViewModel.prototype.onFocus = function ()
	{
		if ('' === this.name())
		{
			this.name.focused(true);
		}
	};

	PopupsDomainViewModel.prototype.clearForm = function ()
	{
		this.edit(false);
		this.whiteListPage(false);

		this.savingError('');

		this.name('');
		this.name.focused(false);

		this.imapServer('');
		this.imapPort('' + Consts.Values.ImapDefaulPort);
		this.imapSecure(Enums.ServerSecure.None);
		this.imapShortLogin(false);
		this.smtpServer('');
		this.smtpPort('' + Consts.Values.SmtpDefaulPort);
		this.smtpSecure(Enums.ServerSecure.None);
		this.smtpShortLogin(false);
		this.smtpAuth(true);
		this.whiteList('');
	};

	module.exports = PopupsDomainViewModel;

}(module, require));
},{"App:Admin":3,"App:Knoin":22,"Consts":5,"Enums":6,"Knoin:AbstractViewModel":25,"Storage:Admin:Remote":47,"Utils":11,"_":20,"ko":17}],60:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
	function PopupsLanguagesViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(Data.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		});

		Data.mainLanguage.subscribe(function () {
			this.resetMainLanguage();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsLanguagesViewModel', PopupsLanguagesViewModel);

	PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
	{
		return Utils.convertLangName(sLanguage, true);
	};

	PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
	{
		var sCurrent = Data.mainLanguage();
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
		Data.mainLanguage(sLang);
		this.cancelCommand();
	};

	module.exports = PopupsLanguagesViewModel;

}(module, require));
},{"App:Knoin":22,"Knoin:AbstractViewModel":25,"Storage:RainLoop:Data":49,"Utils":11,"_":20,"ko":17}],61:[function(require,module,exports){
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsPluginViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsPlugin');

		var self = this;

		this.onPluginSettingsUpdateResponse = _.bind(this.onPluginSettingsUpdateResponse, this);

		this.saveError = ko.observable('');

		this.name = ko.observable('');
		this.readme = ko.observable('');

		this.configures = ko.observableArray([]);

		this.hasReadme = ko.computed(function () {
			return '' !== this.readme();
		}, this);

		this.hasConfiguration = ko.computed(function () {
			return 0 < this.configures().length;
		}, this);

		this.readmePopoverConf = {
			'placement': 'top',
			'trigger': 'hover',
			'title': 'About',
			'content': function () {
				return self.readme();
			}
		};

		this.saveCommand = Utils.createCommand(this, function () {

			var oList = {};

			oList['Name'] = this.name();

			_.each(this.configures(), function (oItem) {

				var mValue = oItem.value();
				if (false === mValue || true === mValue)
				{
					mValue = mValue ? '1' : '0';
				}

				oList['_' + oItem['Name']] = mValue;

			}, this);

			this.saveError('');
			Remote.pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, oList);

		}, this.hasConfiguration);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.All;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsPluginViewModel', PopupsPluginViewModel);

	PopupsPluginViewModel.prototype.onPluginSettingsUpdateResponse = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.cancelCommand();
		}
		else
		{
			this.saveError('');
			if (oData && oData.ErrorCode)
			{
				this.saveError(Utils.getNotification(oData.ErrorCode));
			}
			else
			{
				this.saveError(Utils.getNotification(Enums.Notification.CantSavePluginSettings));
			}
		}
	};

	PopupsPluginViewModel.prototype.onShow = function (oPlugin)
	{
		this.name();
		this.readme();
		this.configures([]);

		if (oPlugin)
		{
			this.name(oPlugin['Name']);
			this.readme(oPlugin['Readme']);

			var aConfig = oPlugin['Config'];
			if (Utils.isNonEmptyArray(aConfig))
			{
				this.configures(_.map(aConfig, function (aItem) {
					return {
						'value': ko.observable(aItem[0]),
						'Name': aItem[1],
						'Type': aItem[2],
						'Label': aItem[3],
						'Default': aItem[4],
						'Desc': aItem[5]
					};
				}));
			}
		}
	};

	PopupsPluginViewModel.prototype.tryToClosePopup = function ()
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
					Utils.delegateRun(self, 'cancelCommand');
				}
			}]);
		}
	};

	PopupsPluginViewModel.prototype.onBuild = function ()
	{
		key('esc', Enums.KeyState.All, _.bind(function () {
			if (this.modalVisibility())
			{
				this.tryToClosePopup();
			}
			return false;
		}, this));
	};

	module.exports = PopupsPluginViewModel;

}(module, require));
},{"App:Knoin":22,"Enums":6,"Knoin:AbstractViewModel":25,"Storage:Admin:Remote":47,"Utils":11,"View:Popup:Ask":58,"_":20,"key":16,"ko":17}]},{},[1]);
