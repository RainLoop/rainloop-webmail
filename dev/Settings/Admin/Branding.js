import ko from 'ko';

import { SettingsGet } from 'Common/Globals';
import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

export class BrandingAdminSettings {
	constructor() {
		this.title = ko.observable(SettingsGet('Title')).idleTrigger();
		this.loadingDesc = ko.observable(SettingsGet('LoadingDescription')).idleTrigger();
		this.faviconUrl = ko.observable(SettingsGet('FaviconUrl')).idleTrigger();
	}

	onBuild() {
		setTimeout(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.title.trigger, this),
				f2 = settingsSaveHelperSimpleFunction(this.loadingDesc.trigger, this),
				f3 = settingsSaveHelperSimpleFunction(this.faviconUrl.trigger, this);

			this.title.subscribe((value) => {
				Remote.saveAdminConfig(f1, {
					'Title': value.trim()
				});
			});

			this.loadingDesc.subscribe((value) => {
				Remote.saveAdminConfig(f2, {
					'LoadingDescription': value.trim()
				});
			});

			this.faviconUrl.subscribe((value) => {
				Remote.saveAdminConfig(f3, {
					'FaviconUrl': value.trim()
				});
			});
		}, 50);
	}
}
