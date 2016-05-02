
import {window, _, $, key} from 'common';
import Globals from 'Common/Globals';
import * as Enums from 'Common/Enums';
import Utils from 'Common/Utils';
import Links from 'Common/Links';
import Events from 'Common/Events';
import Translator from 'Common/Translator';
import Settings from 'Storage/Settings';

import {AbstractBoot} from 'Knoin/AbstractBoot';

class AbstractApp extends AbstractBoot
{
	googlePreviewSupportedCache = null;
	isLocalAutocomplete = true;
	iframe = null;

	/**
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 */
	constructor(Remote)
	{
		super();

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

	remote() {
		return null;
	}

	data() {
		return null;
	}

	getApplicationConfiguration(name, default_) {
		return this.applicationConfiguration[name] || default_;
	}

	/**
	 * @param {string} link
	 * @return {boolean}
	 */
	download(link) {

		if (Globals.sUserAgent && (Globals.sUserAgent.indexOf('chrome') > -1 || Globals.sUserAgent.indexOf('chrome') > -1))
		{
			const oLink = window.document.createElement('a');
			oLink.href = link;

			if (window.document && window.document.createEvent)
			{
				const oE = window.document.createEvent.MouseEvents;
				if (oE && oE.initEvent && oLink.dispatchEvent)
				{
					oE.initEvent('click', true, true);
					oLink.dispatchEvent(oE);
					return true;
				}
			}
		}

		if (Globals.bMobileDevice)
		{
			window.open(link, '_self');
			window.focus();
		}
		else
		{
			this.iframe.attr('src', link);
	//		window.document.location.href = link;
		}

		return true;
	}

	/**
	 * @return {boolean}
	 */
	googlePreviewSupported() {
		if (null === this.googlePreviewSupportedCache)
		{
			this.googlePreviewSupportedCache = !!Settings.settingsGet('AllowGoogleSocial') &&
				!!Settings.settingsGet('AllowGoogleSocialPreview');
		}

		return this.googlePreviewSupportedCache;
	}

	/**
	 * @param {string} title
	 */
	setWindowTitle(title) {
		title = ((Utils.isNormal(title) && 0 < title.length) ? '' + title : '');
		if (Settings.settingsGet('Title'))
		{
			title += (title ? ' - ' : '') + Settings.settingsGet('Title');
		}

		window.document.title = title + ' ...';
		window.document.title = title;
	}

	redirectToAdminPanel() {
		_.delay(() => window.location.href = Links.rootAdmin(), 100);
	}

	clearClientSideToken() {
		if (window.__rlah_clear)
		{
			window.__rlah_clear();
		}
	}

	/**
	 * @param {string} token
	 */
	setClientSideToken(token) {
		if (window.__rlah_set)
		{
			window.__rlah_set(token);

			require('Storage/Settings').settingsSet('AuthAccountHash', token);
			require('Common/Links').populateAuthSuffix();
		}
	}

	/**
	 * @param {boolean=} admin = false
	 * @param {boolean=} logout = false
	 * @param {boolean=} close = false
	 */
	loginAndLogoutReload(admin = false, logout = false, close = false) {

		const
			kn = require('Knoin/Knoin'),
			mobile = Settings.appSettingsGet('mobile'),
			inIframe = !!Settings.appSettingsGet('inIframe')
		;

		let customLogoutLink = Utils.pString(Settings.appSettingsGet('customLogoutLink'));

		if (logout)
		{
			this.clearClientSideToken();
		}

		if (logout && close && window.close)
		{
			window.close();
		}

		customLogoutLink = customLogoutLink || (admin ? Links.rootAdmin(mobile) : Links.rootUser(mobile));

		if (logout && window.location.href !== customLogoutLink)
		{
			_.delay(() => {
				if (inIframe && window.parent)
				{
					window.parent.location.href = customLogoutLink;
				}
				else
				{
					window.location.href = customLogoutLink;
				}
			}, 100);
		}
		else
		{
			kn.routeOff();
			kn.setHash(Links.root(), true);
			kn.routeOff();

			_.delay(() => {
				if (inIframe && window.parent)
				{
					window.parent.location.reload();
				}
				else
				{
					window.location.reload();
				}
			}, 100);
		}
	}

	historyBack() {
		window.history.back();
	}

	bootstart() {

		// Utils.log('Ps' + 'ss, hac' + 'kers! The' + 're\'s not' + 'hing inte' + 'resting :' + ')');

		Events.pub('rl.bootstart');

		const
			mobile = Settings.appSettingsGet('mobile'),
			ssm = require('ssm'),
			ko = require('ko')
		;

		ko.components.register('SaveTrigger', require('Component/SaveTrigger'));
		ko.components.register('Input', require('Component/Input'));
		ko.components.register('Select', require('Component/Select'));
		ko.components.register('Radio', require('Component/Radio'));
		ko.components.register('TextArea', require('Component/TextArea'));

		ko.components.register('x-script', require('Component/Script'));
//		ko.components.register('svg-icon', require('Component/SvgIcon'));

		if (Settings.appSettingsGet('materialDesign') && Globals.bAnimationSupported)
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

		Events.sub('ssm.mobile-enter', () => {
			Globals.leftPanelDisabled(true);
		});

		Events.sub('ssm.mobile-leave', () => {
			Globals.leftPanelDisabled(false);
		});

		if (!mobile)
		{
			ssm.addState({
				id: 'mobile',
				maxWidth: 767,
				onEnter: () => {
					Globals.$html.addClass('ssm-state-mobile');
					Events.pub('ssm.mobile-enter');
				},
				onLeave: () => {
					Globals.$html.removeClass('ssm-state-mobile');
					Events.pub('ssm.mobile-leave');
				}
			});

			ssm.addState({
				id: 'tablet',
				minWidth: 768,
				maxWidth: 999,
				onEnter: function() {
					Globals.$html.addClass('ssm-state-tablet');
				},
				onLeave: function() {
					Globals.$html.removeClass('ssm-state-tablet');
				}
			});

			ssm.addState({
				id: 'desktop',
				minWidth: 1000,
				maxWidth: 1400,
				onEnter: () => {
					Globals.$html.addClass('ssm-state-desktop');
				},
				onLeave: () => {
					Globals.$html.removeClass('ssm-state-desktop');
				}
			});

			ssm.addState({
				id: 'desktop-large',
				minWidth: 1400,
				onEnter: () => {
					Globals.$html.addClass('ssm-state-desktop-large');
				},
				onLeave: () => {
					Globals.$html.removeClass('ssm-state-desktop-large');
				}
			});
		}
		else
		{
			Globals.$html.addClass('ssm-state-mobile').addClass('rl-mobile');
			Events.pub('ssm.mobile-enter');
		}

		Globals.leftPanelDisabled.subscribe((bValue) => {
			Globals.$html.toggleClass('rl-left-panel-disabled', bValue);
			Globals.$html.toggleClass('rl-left-panel-enabled', !bValue);
		});

		Globals.leftPanelType.subscribe((sValue) => {
			Globals.$html.toggleClass('rl-left-panel-none', 'none' === sValue);
			Globals.$html.toggleClass('rl-left-panel-short', 'short' === sValue);
		});

		Globals.leftPanelDisabled.valueHasMutated();

		ssm.ready();

		require('Stores/Language').populate();
		require('Stores/Theme').populate();
		require('Stores/Social').populate();
	}
}

export {AbstractApp, AbstractApp as default};
