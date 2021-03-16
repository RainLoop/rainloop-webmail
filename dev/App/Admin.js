import 'External/Admin/ko';

import { Settings, SettingsGet } from 'Common/Globals';

import { AppAdminStore } from 'Stores/Admin/App';
import Remote from 'Remote/Admin/Fetch';

import { SettingsAdminScreen } from 'Screen/Admin/Settings';
import { LoginAdminScreen } from 'Screen/Admin/Login';

import { startScreens } from 'Knoin/Knoin';
import { AbstractApp } from 'App/Abstract';

class AdminApp extends AbstractApp {
	constructor() {
		super(Remote);
	}

	remote() {
		return Remote;
	}

	bootend() {
		progressJs.end();
	}

	bootstart() {
		super.bootstart();

		AppAdminStore.populate();

		this.hideLoading();

		if (!Settings.app('allowAdminPanel')) {
			rl.route.root();
			setTimeout(() => location.href = '/', 1);
		} else {
			if (SettingsGet('Auth')) {
				startScreens([SettingsAdminScreen]);
			} else {
				startScreens([LoginAdminScreen]);
			}
		}

		this.bootend();
	}
}

export default new AdminApp();
