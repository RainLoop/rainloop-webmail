import { SaveSettingsStep } from 'Common/Enums';
import { Settings, SettingsGet } from 'Common/Globals';
import { settingsSaveHelperSimpleFunction } from 'Common/Utils';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import Remote from 'Remote/Admin/Fetch';

export class LoginAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		addObservablesTo(this, {
			determineUserLanguage: !!SettingsGet('DetermineUserLanguage'),
			determineUserDomain: !!SettingsGet('DetermineUserDomain'),
			allowLanguagesOnLogin: !!SettingsGet('AllowLanguagesOnLogin'),
			hideSubmitButton: !!Settings.app('hideSubmitButton'),
			defaultDomain: SettingsGet('LoginDefaultDomain'),
			defaultDomainTrigger: SaveSettingsStep.Idle
		});

		addSubscribablesTo(this, {
			determineUserLanguage: value =>
				Remote.saveConfig({
					DetermineUserLanguage: value ? 1 : 0
				}),

			determineUserDomain: value =>
				Remote.saveConfig({
					DetermineUserDomain: value ? 1 : 0
				}),

			allowLanguagesOnLogin: value =>
				Remote.saveConfig({
					AllowLanguagesOnLogin: value ? 1 : 0
				}),

			hideSubmitButton: value =>
				Remote.saveConfig({
					hideSubmitButton: value ? 1 : 0
				}),

			defaultDomain: (value =>
				Remote.saveConfig({
					LoginDefaultDomain: value.trim()
				}, settingsSaveHelperSimpleFunction(this.defaultDomainTrigger, this))
			).debounce(999)
		});
	}
}
