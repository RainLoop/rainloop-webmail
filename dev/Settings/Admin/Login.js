import ko from 'ko';

import { Settings, SettingsGet } from 'Common/Globals';
import { settingsSaveHelperSimpleFunction, addObservablesTo } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

export class LoginAdminSettings {
	constructor() {
		addObservablesTo(this, {
			determineUserLanguage: !!SettingsGet('DetermineUserLanguage'),
			determineUserDomain: !!SettingsGet('DetermineUserDomain'),
			allowLanguagesOnLogin: !!SettingsGet('AllowLanguagesOnLogin'),
			hideSubmitButton: !!Settings.app('hideSubmitButton')
		});

		this.defaultDomain = ko.observable(SettingsGet('LoginDefaultDomain')).idleTrigger();
	}

	onBuild() {
		setTimeout(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.defaultDomain.trigger, this);

			this.determineUserLanguage.subscribe(value =>
				Remote.saveAdminConfig(null, {
					'DetermineUserLanguage': value ? '1' : '0'
				})
			);

			this.determineUserDomain.subscribe(value =>
				Remote.saveAdminConfig(null, {
					'DetermineUserDomain': value ? '1' : '0'
				})
			);

			this.allowLanguagesOnLogin.subscribe(value =>
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnLogin': value ? '1' : '0'
				})
			);

			this.hideSubmitButton.subscribe(value =>
				Remote.saveAdminConfig(null, {
					'hideSubmitButton': value ? '1' : '0'
				})
			);

			this.defaultDomain.subscribe(value =>
				Remote.saveAdminConfig(f1, {
					'LoginDefaultDomain': value.trim()
				})
			);
		}, 50);
	}
}
