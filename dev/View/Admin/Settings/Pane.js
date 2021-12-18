import ko from 'ko';

import * as Settings from 'Storage/Settings';

import Remote from 'Remote/Admin/Ajax';

import DomainStore from 'Stores/Admin/Domain';
import PluginStore from 'Stores/Admin/Plugin';
import PackageStore from 'Stores/Admin/Package';

import { getApp } from 'Helper/Apps/Admin';

import { view, ViewType } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Admin/Settings/Pane',
	type: ViewType.Right,
	templateID: 'AdminPane'
})
class PaneSettingsAdminView extends AbstractViewNext {
	constructor() {
		super();

		this.version = ko.observable(Settings.appSettingsGet('version'));

		this.adminManLoading = ko.computed(
			() =>
				'000' !==
				[
					DomainStore.domains.loading() ? '1' : '0',
					PluginStore.plugins.loading() ? '1' : '0',
					PackageStore.packages.loading() ? '1' : '0'
				].join('')
		);

		this.adminManLoadingVisibility = ko
			.computed(() => (this.adminManLoading() ? 'visible' : 'hidden'))
			.extend({ rateLimit: 300 });
	}

	logoutClick() {
		Remote.adminLogout(() => {
			getApp().loginAndLogoutReload(true, true);
		});
	}
}

export { PaneSettingsAdminView, PaneSettingsAdminView as default };
