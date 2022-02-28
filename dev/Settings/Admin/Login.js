import { Settings, SettingsGet } from 'Common/Globals';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';
import { AbstractViewSettings } from 'Knoin/AbstractViews';
import Remote from 'Remote/Admin/Fetch';

export class LoginAdminSettings extends AbstractViewSettings {
	constructor() {
		super();

		this.addSetting('LoginDefaultDomain');

		addObservablesTo(this, {
			determineUserLanguage: !!SettingsGet('DetermineUserLanguage'),
			determineUserDomain: !!SettingsGet('DetermineUserDomain'),
			allowLanguagesOnLogin: !!SettingsGet('AllowLanguagesOnLogin'),
			hideSubmitButton: !!Settings.app('hideSubmitButton'),
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
				})
		});
	}
}
