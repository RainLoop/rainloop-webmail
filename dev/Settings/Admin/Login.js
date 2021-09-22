import ko from 'ko';

import { Settings, SettingsGet } from 'Common/Globals';
import { settingsSaveHelperSimpleFunction, addObservablesTo, addSubscribablesTo } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

export class LoginAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		addObservablesTo(this, {
			determineUserLanguage: !!SettingsGet('DetermineUserLanguage'),
			determineUserDomain: !!SettingsGet('DetermineUserDomain'),
			allowLanguagesOnLogin: !!SettingsGet('AllowLanguagesOnLogin'),
			hideSubmitButton: !!Settings.app('hideSubmitButton')
		});

		this.defaultDomain = ko.observable(SettingsGet('LoginDefaultDomain')).idleTrigger();

		addSubscribablesTo(this, {
			determineUserLanguage: value =>
				Remote.saveAdminConfig(null, {
					DetermineUserLanguage: value ? 1 : 0
				}),

			determineUserDomain: value =>
				Remote.saveAdminConfig(null, {
					DetermineUserDomain: value ? 1 : 0
				}),

			allowLanguagesOnLogin: value =>
				Remote.saveAdminConfig(null, {
					AllowLanguagesOnLogin: value ? 1 : 0
				}),

			hideSubmitButton: value =>
				Remote.saveAdminConfig(null, {
					hideSubmitButton: value ? 1 : 0
				}),

			defaultDomain: value =>
				Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.defaultDomain.trigger, this), {
					LoginDefaultDomain: value.trim()
				})
		});
	}
}
