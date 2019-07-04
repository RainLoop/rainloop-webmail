import _ from '_';
import ko from 'ko';

import { pInt, settingsSaveHelperSimpleFunction } from 'Common/Utils';
import { Capa, SaveSettingsStep } from 'Common/Enums';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { capa } from 'Storage/Settings';

import { showScreenPopup } from 'Knoin/Knoin';

import SettinsStore from 'Stores/User/Settings';

import Remote from 'Remote/User/Ajax';

class SecurityUserSettings {
	constructor() {
		this.capaAutoLogout = capa(Capa.AutoLogout);
		this.capaTwoFactor = capa(Capa.TwoFactor);

		this.autoLogout = SettinsStore.autoLogout;
		this.autoLogout.trigger = ko.observable(SaveSettingsStep.Idle);

		this.autoLogoutOptions = ko.computed(() => {
			translatorTrigger();
			return [
				{ 'id': 0, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_NEVER_OPTION_NAME') },
				{ 'id': 5, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', { 'MINUTES': 5 }) },
				{ 'id': 10, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', { 'MINUTES': 10 }) },
				{ 'id': 30, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', { 'MINUTES': 30 }) },
				{ 'id': 60, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', { 'MINUTES': 60 }) },
				{ 'id': 60 * 2, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_HOURS_OPTION_NAME', { 'HOURS': 2 }) },
				{ 'id': 60 * 5, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_HOURS_OPTION_NAME', { 'HOURS': 5 }) },
				{ 'id': 60 * 10, 'name': i18n('SETTINGS_SECURITY/AUTOLOGIN_HOURS_OPTION_NAME', { 'HOURS': 10 }) }
			];
		});
	}

	configureTwoFactor() {
		showScreenPopup(require('View/Popup/TwoFactorConfiguration'));
	}

	onBuild() {
		if (this.capaAutoLogout) {
			_.delay(() => {
				const f0 = settingsSaveHelperSimpleFunction(this.autoLogout.trigger, this);

				this.autoLogout.subscribe(Remote.saveSettingsHelper('AutoLogout', pInt, f0));
			});
		}
	}
}

export { SecurityUserSettings, SecurityUserSettings as default };
