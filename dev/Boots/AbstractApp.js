/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		window = require('../External/window.js'),
		$html = require('../External/$html.js'),
		$window = require('../External/$window.js'),
		$doc = require('../External/$doc.js'),

		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),
		Events = require('../Common/Events.js'),

		AppSettings = require('../Storages/AppSettings.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractBoot = require('../Knoin/KnoinAbstractBoot.js')
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

		$window.on('error', function (oEvent) {
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
			AppSettings.settingsGet('Title') || '';

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
			sCustomLogoutLink = Utils.pString(AppSettings.settingsGet('CustomLogoutLink')),
			bInIframe = !!AppSettings.settingsGet('InIframe')
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

	AbstractApp.prototype.bootstart = function ()
	{
		Events.pub('rl.bootstart');
		
		var ssm = require('../External/ssm.js');

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
				Events.pub('ssm.mobile-enter');
			},
			'onLeave': function() {
				$html.removeClass('ssm-state-mobile');
				Events.pub('ssm.mobile-leave');
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

		Events.sub('ssm.mobile-enter', function () {
			Globals.leftPanelDisabled(true);
		});

		Events.sub('ssm.mobile-leave', function () {
			Globals.leftPanelDisabled(false);
		});

		Globals.leftPanelDisabled.subscribe(function (bValue) {
			$html.toggleClass('rl-left-panel-disabled', bValue);
		});

		ssm.ready();
	};

	module.exports = AbstractApp;

}(module));