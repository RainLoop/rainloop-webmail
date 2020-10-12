import ko from 'ko';

import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

class LoginAdminSettings {
	constructor() {
		const settingsGet = rl.settings.get;
		this.determineUserLanguage = ko.observable(!!settingsGet('DetermineUserLanguage'));
		this.determineUserDomain = ko.observable(!!settingsGet('DetermineUserDomain'));

		this.defaultDomain = ko.observable(settingsGet('LoginDefaultDomain')).idleTrigger();
		this.allowLanguagesOnLogin = ko.observable(!!settingsGet('AllowLanguagesOnLogin'));

		this.dummy = ko.observable(false);
	}

	onBuild() {
		setTimeout(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.defaultDomain.trigger, this);

			this.determineUserLanguage.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'DetermineUserLanguage': value ? '1' : '0'
				});
			});

			this.determineUserDomain.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'DetermineUserDomain': value ? '1' : '0'
				});
			});

			this.allowLanguagesOnLogin.subscribe(value => {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnLogin': value ? '1' : '0'
				});
			});

			this.defaultDomain.subscribe(value => {
				Remote.saveAdminConfig(f1, {
					'LoginDefaultDomain': value.trim()
				});
			});
		}, 50);
	}
}

export { LoginAdminSettings, LoginAdminSettings as default };
