import { runSettingsViewModelHooks } from 'Common/Plugins';

import { AbstractSettingsScreen, settingsAddViewModel } from 'Screen/AbstractSettings';

import { GeneralAdminSettings } from 'Settings/Admin/General';
import { DomainsAdminSettings } from 'Settings/Admin/Domains';
import { LoginAdminSettings } from 'Settings/Admin/Login';
import { ContactsAdminSettings } from 'Settings/Admin/Contacts';
import { SecurityAdminSettings } from 'Settings/Admin/Security';
import { PackagesAdminSettings } from 'Settings/Admin/Packages';
import { AboutAdminSettings } from 'Settings/Admin/About';
import { BrandingAdminSettings } from 'Settings/Admin/Branding';

import { MenuSettingsAdminView } from 'View/Admin/Settings/Menu';
import { PaneSettingsAdminView } from 'View/Admin/Settings/Pane';

export class SettingsAdminScreen extends AbstractSettingsScreen {
	constructor() {
		super([MenuSettingsAdminView, PaneSettingsAdminView]);

		settingsAddViewModel(
			GeneralAdminSettings,
			'AdminSettingsGeneral',
			'TABS_LABELS/LABEL_GENERAL_NAME',
			'general',
			true
		);

		[
			[DomainsAdminSettings, 'Domains'],
			[LoginAdminSettings, 'Login'],
			[BrandingAdminSettings, 'Branding'],
			[ContactsAdminSettings, 'Contacts'],
			[SecurityAdminSettings, 'Security'],
			[PackagesAdminSettings, 'Packages'],
			[AboutAdminSettings, 'About'],
		].forEach(item =>
			settingsAddViewModel(
				item[0],
				'AdminSettings'+item[1],
				'TABS_LABELS/LABEL_'+item[1].toUpperCase()+'_NAME',
				item[1].toLowerCase()
			)
		);

		runSettingsViewModelHooks(true);
	}

	onShow() {
		rl.setWindowTitle();
	}
}
