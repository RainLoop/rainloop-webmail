
import _ from '_';
import ko from 'ko';

import {settingsSaveHelperSimpleFunction, boolToAjax, trim} from 'Common/Utils';
import {settingsGet} from 'Storage/Settings';

import AppAdminStore from 'Stores/Admin/App';

class LoginAdminSettings
{
	constructor() {
		this.determineUserLanguage = AppAdminStore.determineUserLanguage;
		this.determineUserDomain = AppAdminStore.determineUserDomain;

		this.defaultDomain = ko.observable(settingsGet('LoginDefaultDomain')).idleTrigger();
		this.allowLanguagesOnLogin = AppAdminStore.allowLanguagesOnLogin;

		this.dummy = ko.observable(false);
	}

	onBuild() {
		_.delay(() => {
			const
				Remote = require('Remote/Admin/Ajax'),
				f1 = settingsSaveHelperSimpleFunction(this.defaultDomain.trigger, this);

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

export {LoginAdminSettings, LoginAdminSettings as default};
