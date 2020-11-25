import ko from 'ko';

import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

class BrandingAdminSettings {
	constructor() {
		const settingsGet = rl.settings.get;
		this.title = ko.observable(settingsGet('Title')).idleTrigger();
		this.loadingDesc = ko.observable(settingsGet('LoadingDescription')).idleTrigger();
		this.faviconUrl = ko.observable(settingsGet('FaviconUrl')).idleTrigger();
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

export { BrandingAdminSettings, BrandingAdminSettings as default };
