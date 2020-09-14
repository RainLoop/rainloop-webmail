import ko from 'ko';

import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import AppStore from 'Stores/Admin/App';

import Remote from 'Remote/Admin/Fetch';

class LoginAdminSettings {
	constructor() {
		this.determineUserLanguage = AppStore.determineUserLanguage;
		this.determineUserDomain = AppStore.determineUserDomain;

		this.defaultDomain = ko.observable(rl.settings.get('LoginDefaultDomain')).idleTrigger();
		this.allowLanguagesOnLogin = AppStore.allowLanguagesOnLogin;

		this.dummy = ko.observable(false);
	}

	onBuild() {
		setTimeout(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.defaultDomain.trigger, this);

			this.determineUserLanguage.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'DetermineUserLanguage': value ? '1' : '0'
				});
			});

			this.determineUserDomain.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'DetermineUserDomain': value ? '1' : '0'
				});
			});

			this.allowLanguagesOnLogin.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnLogin': value ? '1' : '0'
				});
			});

			this.defaultDomain.subscribe((value) => {
				Remote.saveAdminConfig(f1, {
					'LoginDefaultDomain': value.trim()
				});
			});
		}, 50);
	}
}

export { LoginAdminSettings, LoginAdminSettings as default };
