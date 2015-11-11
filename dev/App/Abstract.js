
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		key = require('key'),

		Globals = require('Common/Globals'),
		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Events = require('Common/Events'),
		Translator = require('Common/Translator'),

		Settings = require('Storage/Settings'),

		AbstractBoot = require('Knoin/AbstractBoot')
	;

	/**
	 * @constructor
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 * @extends AbstractBoot
	 */
	function AbstractApp(Remote)
	{
		AbstractBoot.call(this);

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
					Utils.microtime() - Globals.startMicrotime
				);
			}
		});

		Globals.$win.on('resize', function () {
			Events.pub('window.resize');
		});

		Events.sub('window.resize', _.throttle(function () {

			var
				iH = Globals.$win.height(),
				iW = Globals.$win.height()
			;

			if (Globals.$win.__sizes[0] !== iH || Globals.$win.__sizes[1] !== iW)
			{
				Globals.$win.__sizes[0] = iH;
				Globals.$win.__sizes[1] = iW;

				Events.pub('window.resize.real');
			}

		}, 50));

		 // DEBUG
//		Events.sub({
//			'window.resize': function () {
//				window.console.log('window.resize');
//			},
//			'window.resize.real': function () {
//				window.console.log('window.resize.real');
//			}
//		});

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

		Globals.$doc.on('mousemove keypress click', _.debounce(function () {
			Events.pub('rl.auto-logout-refresh');
		}, 5000));

		key('esc, enter', Enums.KeyState.All, _.bind(function () {
			Utils.detectDropdownVisibility();
		}, this));
	}

	_.extend(AbstractApp.prototype, AbstractBoot.prototype);

	AbstractApp.prototype.remote = function ()
	{
		return null;
	};

	AbstractApp.prototype.data = function ()
	{
		return null;
	};

	/**
	 * @param {string} sLink
	 * @return {boolean}
	 */
	AbstractApp.prototype.download = function (sLink)
	{
		var
			oE = null,
			oLink = null
		;

		if (Globals.sUserAgent && (Globals.sUserAgent.indexOf('chrome') > -1 || Globals.sUserAgent.indexOf('chrome') > -1))
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

	AbstractApp.prototype.googlePreviewSupportedCache = null;

	/**
	 * @return {boolean}
	 */
	AbstractApp.prototype.googlePreviewSupported = function ()
	{
		if (null === this.googlePreviewSupportedCache)
		{
			this.googlePreviewSupportedCache = !!Settings.settingsGet('AllowGoogleSocial') &&
				!!Settings.settingsGet('AllowGoogleSocialPreview');
		}

		return this.googlePreviewSupportedCache;
	};

	/**
	 * @param {string} sTitle
	 */
	AbstractApp.prototype.setWindowTitle = function (sTitle)
	{
		sTitle = ((Utils.isNormal(sTitle) && 0 < sTitle.length) ? '' + sTitle : '');
		if (Settings.settingsGet('Title'))
		{
			sTitle += (sTitle ? ' - ' : '') + Settings.settingsGet('Title');
		}

		window.document.title = sTitle + ' ...';
		window.document.title = sTitle;
	};

	AbstractApp.prototype.redirectToAdminPanel = function ()
	{
		_.delay(function () {
			window.location.href = Links.rootAdmin();
		}, 100);
	};

	AbstractApp.prototype.clearClientSideToken = function ()
	{
		if (window.__rlah_clear)
		{
			window.__rlah_clear();
		}
	};

	/**
	 * @param {string} sKey
	 */
	AbstractApp.prototype.setClientSideToken = function (sKey)
	{
		if (window.__rlah_set)
		{
			window.__rlah_set(sKey);

			require('Storage/Settings').settingsSet('AuthAccountHash', sKey);
			require('Common/Links').populateAuthSuffix();
		}
	};

	/**
	 * @param {boolean=} bAdmin = false
	 * @param {boolean=} bLogout = false
	 * @param {boolean=} bClose = false
	 */
	AbstractApp.prototype.loginAndLogoutReload = function (bAdmin, bLogout, bClose)
	{
		var
			kn = require('Knoin/Knoin'),
			sCustomLogoutLink = Utils.pString(Settings.settingsGet('CustomLogoutLink')),
			bInIframe = !!Settings.settingsGet('InIframe')
		;

		bLogout = Utils.isUnd(bLogout) ? false : !!bLogout;
		bClose = Utils.isUnd(bClose) ? false : !!bClose;

		if (bLogout)
		{
			this.clearClientSideToken();
		}

		if (bLogout && bClose && window.close)
		{
			window.close();
		}

		sCustomLogoutLink = sCustomLogoutLink || (bAdmin ? Links.rootAdmin() : Links.rootUser());

		if (bLogout && window.location.href !== sCustomLogoutLink)
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
			kn.setHash(Links.root(), true);
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
		Utils.log('Ps' + 'ss, hac' + 'kers! The' + 're\'s not' + 'hing inte' + 'resting :' + ')');

		Events.pub('rl.bootstart');

		var
			ssm = require('ssm'),
			ko = require('ko')
		;

		ko.components.register('SaveTrigger', require('Component/SaveTrigger'));
		ko.components.register('Input', require('Component/Input'));
		ko.components.register('Select', require('Component/Select'));
		ko.components.register('Radio', require('Component/Radio'));
		ko.components.register('TextArea', require('Component/TextArea'));

		ko.components.register('x-script', require('Component/Script'));
		ko.components.register('svg-icon', require('Component/SvgIcon'));

		if (/**false && /**/Settings.settingsGet('MaterialDesign') && Globals.bAnimationSupported)
		{
			ko.components.register('Checkbox', require('Component/MaterialDesign/Checkbox'));
			ko.components.register('CheckboxSimple', require('Component/Checkbox'));
		}
		else
		{
//			ko.components.register('Checkbox', require('Component/Classic/Checkbox'));
//			ko.components.register('CheckboxSimple', require('Component/Classic/Checkbox'));
			ko.components.register('Checkbox', require('Component/Checkbox'));
			ko.components.register('CheckboxSimple', require('Component/Checkbox'));
		}

		Translator.initOnStartOrLangChange(Translator.initNotificationLanguage, Translator);

		_.delay(Utils.windowResizeCallback, 1000);

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

		Globals.leftPanelType.subscribe(function (sValue) {
			Globals.$html.toggleClass('rl-left-panel-none', 'none' === sValue);
			Globals.$html.toggleClass('rl-left-panel-short', 'short' === sValue);
		});

		ssm.ready();

		require('Stores/Language').populate();
		require('Stores/Theme').populate();
		require('Stores/Social').populate();
	};

	module.exports = AbstractApp;

}());