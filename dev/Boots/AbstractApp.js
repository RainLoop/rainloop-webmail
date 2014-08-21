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