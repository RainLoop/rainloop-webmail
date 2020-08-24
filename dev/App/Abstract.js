import ko from 'ko';

import {
	$htmlCL,
	leftPanelDisabled,
	leftPanelType,
	bMobileDevice
} from 'Common/Globals';

import { KeyState } from 'Common/Enums';
import { root, rootAdmin, rootUser, populateAuthSuffix } from 'Common/Links';
import { initOnStartOrLangChange, initNotificationLanguage } from 'Common/Translator';
import * as Settings from 'Storage/Settings';

import LanguageStore from 'Stores/Language';
import ThemeStore from 'Stores/Theme';

import { routeOff, setHash } from 'Knoin/Knoin';
import { AbstractBoot } from 'Knoin/AbstractBoot';

class AbstractApp extends AbstractBoot {
	/**
	 * @param {RemoteStorage|AdminRemoteStorage} Remote
	 */
	constructor() {
		super();

		this.isLocalAutocomplete = true;
		this.lastErrorTime = 0;

		const $doc = document;
		$doc.addEventListener('keydown', (event) => {
			if (event && event.ctrlKey) {
				$htmlCL.add('rl-ctrl-key-pressed');
			}
		});
		$doc.addEventListener('keyup', (event) => {
			if (event && !event.ctrlKey) {
				$htmlCL.remove('rl-ctrl-key-pressed');
			}
		});

		const fn = (()=>dispatchEvent(new CustomEvent('rl.auto-logout-refresh'))).debounce(5000);

		$doc.addEventListener('mousemove', fn);
		$doc.addEventListener('keypress', fn);
		$doc.addEventListener('click', fn);

		key('esc, enter', KeyState.All, () => rl.Dropdowns.detectVisibility());
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
		if (bMobileDevice) {
			open(link, '_self');
			focus();
		} else {
			const oLink = document.createElement('a');
			oLink.href = link;
			document.body.appendChild(oLink).click();
			oLink.remove();
//			open(link, '_self');
		}
		return true;
	}

	/**
	 * @param {string} title
	 */
	setWindowTitle(title) {
		title = null == title ? '' : '' + title;
		if (Settings.settingsGet('Title')) {
			title += (title ? ' - ' : '') + Settings.settingsGet('Title');
		}

		document.title = title;
	}

	redirectToAdminPanel() {
		setTimeout(() => {
			location.href = rootAdmin();
		}, 100);
	}

	clearClientSideToken() {
		if (window.__rlah_clear) {
			__rlah_clear();
		}
	}

	/**
	 * @param {string} token
	 */
	setClientSideToken(token) {
		if (window.__rlah_set) {
			__rlah_set(token);

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
		const inIframe = !!Settings.appSettingsGet('inIframe'),
			logoutLink = admin ? rootAdmin() : rootUser();

		if (logout) {
			this.clearClientSideToken();
		}

		if (logout && close && window.close) {
			window.close();
		}

		if (logout && location.href !== logoutLink) {
			setTimeout(() => {
				if (inIframe && parent) {
					parent.location.href = logoutLink;
				} else {
					location.href = logoutLink;
				}
			}, 100);
		} else {
			routeOff();
			setHash(root(), true);
			routeOff();

			setTimeout(() => {
				if (inIframe && parent) {
					parent.location.reload();
				} else {
					location.reload();
				}
			}, 100);
		}
	}

	historyBack() {
		history.back();
	}

	bootstart() {
		const mobile = Settings.appSettingsGet('mobile');

		ko.components.register('SaveTrigger', require('Component/SaveTrigger').default);
		ko.components.register('Input', require('Component/Input').default);
		ko.components.register('Select', require('Component/Select').default);
		ko.components.register('Radio', require('Component/Radio').default);
		ko.components.register('TextArea', require('Component/TextArea').default);
		ko.components.register('Date', require('Component/Date').default);

		ko.components.register('x-script', require('Component/Script').default);

		if (Settings.appSettingsGet('materialDesign') && !bMobileDevice) {
			ko.components.register('Checkbox', require('Component/MaterialDesign/Checkbox').default);
			ko.components.register('CheckboxSimple', require('Component/Checkbox').default);
		} else {
			ko.components.register('Checkbox', require('Component/Checkbox').default);
			ko.components.register('CheckboxSimple', require('Component/Checkbox').default);
		}

		initOnStartOrLangChange(initNotificationLanguage);

		if (!mobile) {
			$htmlCL.add('rl-desktop');

			ssm.addState({
				id: 'mobile',
				query: '(max-width: 767px)',
				onEnter: () => {
					$htmlCL.add('ssm-state-mobile');
					leftPanelDisabled(true);
				},
				onLeave: () => {
					$htmlCL.remove('ssm-state-mobile');
					leftPanelDisabled(false);
				}
			});

			ssm.addState({
				id: 'tablet',
				query: '(min-width: 768px) and (max-width: 999px)',
				onEnter: () => $htmlCL.add('ssm-state-tablet'),
				onLeave: () => $htmlCL.remove('ssm-state-tablet')
			});

			ssm.addState({
				id: 'desktop',
				query: '(min-width: 1000px) and (max-width: 1400px)',
				onEnter: () => $htmlCL.add('ssm-state-desktop'),
				onLeave: () => $htmlCL.remove('ssm-state-desktop')
			});

			ssm.addState({
				id: 'desktop-large',
				query: '(min-width: 1401px)',
				onEnter: () => $htmlCL.add('ssm-state-desktop-large'),
				onLeave: () => $htmlCL.remove('ssm-state-desktop-large')
			});
		} else {
			$htmlCL.add('ssm-state-mobile', 'rl-mobile');
			leftPanelDisabled(true);
		}

		leftPanelDisabled.subscribe((bValue) => {
			$htmlCL.toggle('rl-left-panel-disabled', bValue);
			$htmlCL.toggle('rl-left-panel-enabled', !bValue);
		});

		leftPanelType.subscribe((sValue) => {
			$htmlCL.toggle('rl-left-panel-none', 'none' === sValue);
			$htmlCL.toggle('rl-left-panel-short', 'short' === sValue);
		});

		leftPanelDisabled.valueHasMutated();

		LanguageStore.populate();
		ThemeStore.populate();
	}
}

export { AbstractApp, AbstractApp as default };
