import window from 'window';
import $ from '$';
import _ from '_';
import ko from 'ko';
import key from 'key';
import ssm from 'ssm';

import {
	$win,
	$html,
	$doc,
	leftPanelDisabled,
	leftPanelType,
	sUserAgent,
	bMobileDevice,
	bAnimationSupported
} from 'Common/Globals';

import { isNormal, pString, detectDropdownVisibility, windowResizeCallback } from 'Common/Utils';

import { KeyState, Magics } from 'Common/Enums';
import { root, rootAdmin, rootUser, populateAuthSuffix } from 'Common/Links';
import { initOnStartOrLangChange, initNotificationLanguage } from 'Common/Translator';
import * as Events from 'Common/Events';
import * as Settings from 'Storage/Settings';

import LanguageStore from 'Stores/Language';
import ThemeStore from 'Stores/Theme';
import SocialStore from 'Stores/Social';

import { routeOff, setHash } from 'Knoin/Knoin';
import { AbstractBoot } from 'Knoin/AbstractBoot';

class AbstractApp extends AbstractBoot {
	/**
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 */
	constructor() {
		super();

		this.googlePreviewSupportedCache = null;
		this.isLocalAutocomplete = true;
		this.iframe = null;
		this.lastErrorTime = 0;

		this.iframe = $('<iframe class="internal-hiddden" />').appendTo('body');

		$win.on('resize', () => {
			Events.pub('window.resize');
		});

		Events.sub(
			'window.resize',
			_.throttle(() => {
				const iH = $win.height(),
					iW = $win.height();

				if ($win.__sizes[0] !== iH || $win.__sizes[1] !== iW) {
					$win.__sizes[0] = iH;
					$win.__sizes[1] = iW;

					Events.pub('window.resize.real');
				}
			}, Magics.Time50ms)
		);

		// DEBUG
		//		Events.sub({
		//			'window.resize': function() {
		//				window.console.log('window.resize');
		//			},
		//			'window.resize.real': function() {
		//				window.console.log('window.resize.real');
		//			}
		//		});

		$doc
			.on('keydown', (event) => {
				if (event && event.ctrlKey) {
					$html.addClass('rl-ctrl-key-pressed');
				}
			})
			.on('keyup', (event) => {
				if (event && !event.ctrlKey) {
					$html.removeClass('rl-ctrl-key-pressed');
				}
			});

		$doc.on(
			'mousemove keypress click',
			_.debounce(() => {
				Events.pub('rl.auto-logout-refresh');
			}, Magics.Time5s)
		);

		key('esc, enter', KeyState.All, () => {
			detectDropdownVisibility();
		});
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
	 * @returns {boolean}
	 */
	download(link) {
		if (sUserAgent && (-1 < sUserAgent.indexOf('chrome') || -1 < sUserAgent.indexOf('chrome'))) {
			const oLink = window.document.createElement('a');
			oLink.href = link;

			if (window.document && window.document.createEvent) {
				const oE = window.document.createEvent.MouseEvents;
				if (oE && oE.initEvent && oLink.dispatchEvent) {
					oE.initEvent('click', true, true);
					oLink.dispatchEvent(oE);
					return true;
				}
			}
		}

		if (bMobileDevice) {
			window.open(link, '_self');
			window.focus();
		} else {
			this.iframe.attr('src', link);
			// window.document.location.href = link;
		}

		return true;
	}

	/**
	 * @returns {boolean}
	 */
	googlePreviewSupported() {
		if (null === this.googlePreviewSupportedCache) {
			this.googlePreviewSupportedCache =
				!!Settings.settingsGet('AllowGoogleSocial') && !!Settings.settingsGet('AllowGoogleSocialPreview');
		}

		return this.googlePreviewSupportedCache;
	}

	/**
	 * @param {string} title
	 */
	setWindowTitle(title) {
		title = isNormal(title) && 0 < title.length ? '' + title : '';
		if (Settings.settingsGet('Title')) {
			title += (title ? ' - ' : '') + Settings.settingsGet('Title');
		}

		window.document.title = title + ' ...';
		window.document.title = title;
	}

	redirectToAdminPanel() {
		_.delay(() => {
			window.location.href = rootAdmin();
		}, Magics.Time100ms);
	}

	clearClientSideToken() {
		if (window.__rlah_clear) {
			window.__rlah_clear();
		}
	}

	/**
	 * @param {string} token
	 */
	setClientSideToken(token) {
		if (window.__rlah_set) {
			window.__rlah_set(token);

			Settings.settingsSet('AuthAccountHash', token);
			populateAuthSuffix();
		}
	}

	/**
	 * @param {boolean=} admin = false
	 * @param {boolean=} logout = false
	 * @param {boolean=} close = false
	 */
	loginAndLogoutReload(admin = false, logout = false, close = false) {
		const inIframe = !!Settings.appSettingsGet('inIframe');
		let customLogoutLink = pString(Settings.appSettingsGet('customLogoutLink'));

		if (logout) {
			this.clearClientSideToken();
		}

		if (logout && close && window.close) {
			window.close();
		}

		customLogoutLink = customLogoutLink || (admin ? rootAdmin() : rootUser());

		if (logout && window.location.href !== customLogoutLink) {
			_.delay(() => {
				if (inIframe && window.parent) {
					window.parent.location.href = customLogoutLink;
				} else {
					window.location.href = customLogoutLink;
				}

				$win.trigger('rl.tooltips.diactivate');
			}, Magics.Time100ms);
		} else {
			routeOff();
			setHash(root(), true);
			routeOff();

			_.delay(() => {
				if (inIframe && window.parent) {
					window.parent.location.reload();
				} else {
					window.location.reload();
				}

				$win.trigger('rl.tooltips.diactivate');
			}, Magics.Time100ms);
		}
	}

	historyBack() {
		window.history.back();
	}

	bootstart() {
		// log('Ps' + 'ss, hac' + 'kers! The' + 're\'s not' + 'hing inte' + 'resting :' + ')');

		Events.pub('rl.bootstart');

		const mobile = Settings.appSettingsGet('mobile');

		ko.components.register('SaveTrigger', require('Component/SaveTrigger').default);
		ko.components.register('Input', require('Component/Input').default);
		ko.components.register('Select', require('Component/Select').default);
		ko.components.register('Radio', require('Component/Radio').default);
		ko.components.register('TextArea', require('Component/TextArea').default);
		ko.components.register('Date', require('Component/Date').default);

		ko.components.register('x-script', require('Component/Script').default);
		// ko.components.register('svg-icon', require('Component/SvgIcon').default);

		if (Settings.appSettingsGet('materialDesign') && bAnimationSupported) {
			ko.components.register('Checkbox', require('Component/MaterialDesign/Checkbox').default);
			ko.components.register('CheckboxSimple', require('Component/Checkbox').default);
		} else {
			// ko.components.register('Checkbox', require('Component/Classic/Checkbox').default);
			// ko.components.register('CheckboxSimple', require('Component/Classic/Checkbox').default);
			ko.components.register('Checkbox', require('Component/Checkbox').default);
			ko.components.register('CheckboxSimple', require('Component/Checkbox').default);
		}

		initOnStartOrLangChange(initNotificationLanguage);

		_.delay(windowResizeCallback, Magics.Time1s);

		Events.sub('ssm.mobile-enter', () => {
			leftPanelDisabled(true);
		});

		Events.sub('ssm.mobile-leave', () => {
			leftPanelDisabled(false);
		});

		if (!mobile) {
			$html.addClass('rl-desktop');

			ssm.addState({
				id: 'mobile',
				query: '(max-width: 767px)',
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
				query: '(min-width: 768px) and (max-width: 999px)',
				onEnter: () => {
					$html.addClass('ssm-state-tablet');
				},
				onLeave: () => {
					$html.removeClass('ssm-state-tablet');
				}
			});

			ssm.addState({
				id: 'desktop',
				query: '(min-width: 1000px) and (max-width: 1400px)',
				onEnter: () => {
					$html.addClass('ssm-state-desktop');
				},
				onLeave: () => {
					$html.removeClass('ssm-state-desktop');
				}
			});

			ssm.addState({
				id: 'desktop-large',
				query: '(min-width: 1401px)',
				onEnter: () => {
					$html.addClass('ssm-state-desktop-large');
				},
				onLeave: () => {
					$html.removeClass('ssm-state-desktop-large');
				}
			});
		} else {
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

		LanguageStore.populate();
		ThemeStore.populate();
		SocialStore.populate();
	}
}

export { AbstractApp, AbstractApp as default };
