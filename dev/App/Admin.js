import 'External/ko';

import { SettingsGet, SettingsAdmin } from 'Common/Globals';
import { initThemes } from 'Stores/Theme';

import Remote from 'Remote/Admin/Fetch';

import { SettingsAdminScreen } from 'Screen/Admin/Settings';
import { LoginAdminScreen } from 'Screen/Admin/Login';

import { startScreens } from 'Knoin/Knoin';
import { AbstractApp } from 'App/Abstract';

import { AskPopupView } from 'View/Popup/Ask';

export class AdminApp extends AbstractApp {
	constructor() {
		super(Remote);
		this.weakPassword = ko.observable(false);
	}

	refresh() {
		initThemes();
		this.start();
	}

	start() {
//		if (!Settings.app('adminAllowed')) {
		if (!SettingsAdmin('allowed')) {
			rl.route.root();
			setTimeout(() => location.href = '/', 1);
		} else if (SettingsGet('Auth')) {
			this.weakPassword(SettingsGet('weakPassword'));
			startScreens([SettingsAdminScreen]);
		} else {
			startScreens([LoginAdminScreen]);
		}
	}
}

AskPopupView.credentials = function(sAskDesc, btnText) {
	return new Promise(resolve => {
		this.showModal([
			sAskDesc,
			view => resolve({username:view.username(), password:view.passphrase()}),
			() => resolve(null),
			true,
			3,
			btnText
		]);
	});
};
