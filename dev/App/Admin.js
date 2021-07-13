import 'External/Admin/ko';

import { Settings, SettingsGet } from 'Common/Globals';

import Remote from 'Remote/Admin/Fetch';

import { SettingsAdminScreen } from 'Screen/Admin/Settings';
import { LoginAdminScreen } from 'Screen/Admin/Login';

import { startScreens } from 'Knoin/Knoin';
import { AbstractApp } from 'App/Abstract';

class AdminApp extends AbstractApp {
	constructor() {
		super(Remote);
		this.weakPassword = ko.observable(false);
	}

	bootstart() {
		super.bootstart();
		if (!Settings.app('allowAdminPanel')) {
			rl.route.root();
			setTimeout(() => location.href = '/', 1);
		} else if (SettingsGet('Auth')) {
			this.weakPassword(!!SettingsGet('WeakPassword'));
			startScreens([SettingsAdminScreen]);
		} else {
			startScreens([LoginAdminScreen]);
		}
		this.hideLoading();
	}
}

export default new AdminApp();
