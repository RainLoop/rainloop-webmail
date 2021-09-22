import ko from 'ko';

import { pInt, settingsSaveHelperSimpleFunction } from 'Common/Utils';
import { Capa, SaveSettingsStep } from 'Common/Enums';
import { Settings } from 'Common/Globals';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { SettingsUserStore } from 'Stores/User/Settings';

import Remote from 'Remote/User/Fetch';

export class SecurityUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.capaAutoLogout = Settings.capa(Capa.AutoLogout);

		this.autoLogout = SettingsUserStore.autoLogout;
		this.autoLogoutTrigger = ko.observable(SaveSettingsStep.Idle);

		let i18nLogout = (key, params) => i18n('SETTINGS_SECURITY/AUTOLOGIN_' + key, params);
		this.autoLogoutOptions = ko.computed(() => {
			translatorTrigger();
			return [
				{ id: 0, name: i18nLogout('NEVER_OPTION_NAME') },
				{ id: 5, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 5 }) },
				{ id: 10, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 10 }) },
				{ id: 30, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 30 }) },
				{ id: 60, name: i18nLogout('MINUTES_OPTION_NAME', { MINUTES: 60 }) },
				{ id: 60 * 2, name: i18nLogout('HOURS_OPTION_NAME', { HOURS: 2 }) },
				{ id: 60 * 5, name: i18nLogout('HOURS_OPTION_NAME', { HOURS: 5 }) },
				{ id: 60 * 10, name: i18nLogout('HOURS_OPTION_NAME', { HOURS: 10 }) }
			];
		});

		if (this.capaAutoLogout) {
			this.autoLogout.subscribe(value => Remote.saveSetting(
				'AutoLogout', pInt(value),
				settingsSaveHelperSimpleFunction(this.autoLogoutTrigger, this)
			));
		}
	}
}
