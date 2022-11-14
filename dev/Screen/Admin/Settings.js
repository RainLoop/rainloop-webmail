import { runSettingsViewModelHooks } from 'Common/Plugins';

import { AbstractSettingsScreen, settingsAddViewModel } from 'Screen/AbstractSettings';

import { AdminSettingsGeneral } from 'Settings/Admin/General';
import { AdminSettingsDomains } from 'Settings/Admin/Domains';
import { AdminSettingsLogin } from 'Settings/Admin/Login';
import { AdminSettingsContacts } from 'Settings/Admin/Contacts';
import { AdminSettingsSecurity } from 'Settings/Admin/Security';
import { AdminSettingsPackages } from 'Settings/Admin/Packages';
import { AdminSettingsAbout } from 'Settings/Admin/About';
import { AdminSettingsBranding } from 'Settings/Admin/Branding';
import { AdminSettingsConfig } from 'Settings/Admin/Config';

import { MenuSettingsAdminView } from 'View/Admin/Settings/Menu';
import { PaneSettingsAdminView } from 'View/Admin/Settings/Pane';

export class SettingsAdminScreen extends AbstractSettingsScreen {
	constructor() {
		super([MenuSettingsAdminView, PaneSettingsAdminView]);

		[
			AdminSettingsGeneral,
			AdminSettingsDomains,
			AdminSettingsLogin,
			AdminSettingsBranding,
			AdminSettingsContacts,
			AdminSettingsSecurity,
			AdminSettingsPackages,
			AdminSettingsConfig,
			AdminSettingsAbout
		].forEach((item, index) =>
			settingsAddViewModel(item, 0, 0, 0, 0 === index)
		);

		runSettingsViewModelHooks(true);
	}

	onShow() {
		rl.setTitle();
	}
}
