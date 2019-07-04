import _ from '_';
import ko from 'ko';

import { settingsSaveHelperSimpleFunction, boolToAjax, trim } from 'Common/Utils';
import { settingsGet } from 'Storage/Settings';

import AppStore from 'Stores/Admin/App';

import Remote from 'Remote/Admin/Ajax';

class LoginAdminSettings {
	constructor() {
		this.determineUserLanguage = AppStore.determineUserLanguage;
		this.determineUserDomain = AppStore.determineUserDomain;

		this.defaultDomain = ko.observable(settingsGet('LoginDefaultDomain')).idleTrigger();
		this.allowLanguagesOnLogin = AppStore.allowLanguagesOnLogin;

		this.dummy = ko.observable(false);
	}

	onBuild() {
		_.delay(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.defaultDomain.trigger, this);

			this.determineUserLanguage.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'DetermineUserLanguage': boolToAjax(value)
				});
			});

			this.determineUserDomain.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'DetermineUserDomain': boolToAjax(value)
				});
			});

			this.allowLanguagesOnLogin.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnLogin': boolToAjax(value)
				});
			});

			this.defaultDomain.subscribe((value) => {
				Remote.saveAdminConfig(f1, {
					'LoginDefaultDomain': trim(value)
				});
			});
		}, 50);
	}
}

export { LoginAdminSettings, LoginAdminSettings as default };
