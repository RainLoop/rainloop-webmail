
import {window, _, $, key} from 'common';

import {
	$win, $html, $doc,
	startMicrotime, leftPanelDisabled, leftPanelType,
	sUserAgent, bMobileDevice, bAnimationSupported
} from 'Common/Globals';

import {KeyState} from 'Common/Enums';
import {noop, isNormal, pString, inArray, microtime, timestamp, detectDropdownVisibility, windowResizeCallback} from 'Common/Utils';
import * as Links from 'Common/Links';
import * as Settings from 'Storage/Settings';
import * as Events from 'Common/Events';
import {initOnStartOrLangChange, initNotificationLanguage} from 'Common/Translator';

import {AbstractBoot} from 'Knoin/AbstractBoot';

class AbstractApp extends AbstractBoot
{
	/**
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 */
	constructor(Remote)
	{
		super();

		this.googlePreviewSupportedCache = null;
		this.isLocalAutocomplete = true;
		this.iframe = null;
		this.lastErrorTime = 0;

		this.iframe = $('<iframe class="internal-hiddden" />').appendTo('body');

		$win.on('error', (event) => {
			if (event && event.originalEvent && event.originalEvent.message &&
				-1 === inArray(event.originalEvent.message, [
					'Script error.', 'Uncaught Error: Error calling method on NPObject.'
				]))
			{
				const time = timestamp();
				if (this.lastErrorTime >= time)
				{
					return;
				}

				this.lastErrorTime = time;

				Remote.jsError(
					noop,
					event.originalEvent.message,
					event.originalEvent.filename,
					event.originalEvent.lineno,
					window.location && window.location.toString ? window.location.toString() : '',
					$html.attr('class'),
					microtime() - startMicrotime
				);
			}
		});

		$win.on('resize', function () {
			Events.pub('window.resize');
		});

		Events.sub('window.resize', _.throttle(function () {

			var
				iH = $win.height(),
				iW = $win.height()
			;

			if ($win.__sizes[0] !== iH || $win.__sizes[1] !== iW)
			{
				$win.__sizes[0] = iH;
				$win.__sizes[1] = iW;

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

		$doc.on('mousemove keypress click', _.debounce(function () {
			Events.pub('rl.auto-logout-refresh');
		}, 5000));

		key('esc, enter', KeyState.All, _.bind(function () {
			detectDropdownVisibility();
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

		if (sUserAgent && (sUserAgent.indexOf('chrome') > -1 || sUserAgent.indexOf('chrome') > -1))
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

		if (bMobileDevice)
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
		title = ((isNormal(title) && 0 < title.length) ? '' + title : '');
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

		let customLogoutLink = pString(Settings.appSettingsGet('customLogoutLink'));

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

		// log('Ps' + 'ss, hac' + 'kers! The' + 're\'s not' + 'hing inte' + 'resting :' + ')');

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
		ko.components.register('Date', require('Component/Date'));

		ko.components.register('x-script', require('Component/Script'));
//		ko.components.register('svg-icon', require('Component/SvgIcon'));

		if (Settings.appSettingsGet('materialDesign') && bAnimationSupported)
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

		initOnStartOrLangChange(initNotificationLanguage);

		_.delay(windowResizeCallback, 1000);

		Events.sub('ssm.mobile-enter', () => {
			leftPanelDisabled(true);
		});

		Events.sub('ssm.mobile-leave', () => {
			leftPanelDisabled(false);
		});

		if (!mobile)
		{
			ssm.addState({
				id: 'mobile',
				maxWidth: 767,
				onEnter: () => {
					$html.addClass('ssm-state-mobile');
					Events.pub('ssm.mobile-enter');
				},
				onLeave: () => {
					$html.removeClass('ssm-state-mobile');
					Events.pub('ssm.mobile-leave');
				}
			});

			ssm.addState({
				id: 'tablet',
				minWidth: 768,
				maxWidth: 999,
				onEnter: function() {
					$html.addClass('ssm-state-tablet');
				},
				onLeave: function() {
					$html.removeClass('ssm-state-tablet');
				}
			});

			ssm.addState({
				id: 'desktop',
				minWidth: 1000,
				maxWidth: 1400,
				onEnter: () => {
					$html.addClass('ssm-state-desktop');
				},
				onLeave: () => {
					$html.removeClass('ssm-state-desktop');
				}
			});

			ssm.addState({
				id: 'desktop-large',
				minWidth: 1400,
				onEnter: () => {
					$html.addClass('ssm-state-desktop-large');
				},
				onLeave: () => {
					$html.removeClass('ssm-state-desktop-large');
				}
			});
		}
		else
		{
			$html.addClass('ssm-state-mobile').addClass('rl-mobile');
			Events.pub('ssm.mobile-enter');
		}

		leftPanelDisabled.subscribe((bValue) => {
			$html.toggleClass('rl-left-panel-disabled', bValue);
			$html.toggleClass('rl-left-panel-enabled', !bValue);
		});

		leftPanelType.subscribe((sValue) => {
			$html.toggleClass('rl-left-panel-none', 'none' === sValue);
			$html.toggleClass('rl-left-panel-short', 'short' === sValue);
		});

		leftPanelDisabled.valueHasMutated();

		ssm.ready();

		require('Stores/Language').populate();
		require('Stores/Theme').populate();
		require('Stores/Social').populate();
	}
}

export {AbstractApp, AbstractApp as default};
