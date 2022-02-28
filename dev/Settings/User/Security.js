import { koComputable } from 'External/ko';

import { Capa } from 'Common/Enums';
import { SettingsCapa } from 'Common/Globals';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import { AbstractViewSettings } from 'Knoin/AbstractViews';

import { SettingsUserStore } from 'Stores/User/Settings';

export class SecurityUserSettings extends AbstractViewSettings {
	constructor() {
		super();

		this.capaAutoLogout = SettingsCapa(Capa.AutoLogout);

		this.autoLogout = SettingsUserStore.autoLogout;

		let i18nLogout = (key, params) => i18n('SETTINGS_SECURITY/AUTOLOGIN_' + key, params);
		this.autoLogoutOptions = koComputable(() => {
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
			this.addSetting('AutoLogout');
		}
	}
}
