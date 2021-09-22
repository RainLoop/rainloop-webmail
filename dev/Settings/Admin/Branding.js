import ko from 'ko';

import { SettingsGet } from 'Common/Globals';
import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import Remote from 'Remote/Admin/Fetch';

export class BrandingAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.title = ko.observable(SettingsGet('Title')).idleTrigger();
		this.loadingDesc = ko.observable(SettingsGet('LoadingDescription')).idleTrigger();
		this.faviconUrl = ko.observable(SettingsGet('FaviconUrl')).idleTrigger();

		this.title.subscribe(value =>
			Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.title.trigger, this), {
				Title: value.trim()
			})
		);

		this.loadingDesc.subscribe(value =>
			Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.loadingDesc.trigger, this), {
				LoadingDescription: value.trim()
			})
		);

		this.faviconUrl.subscribe(value =>
			Remote.saveAdminConfig(settingsSaveHelperSimpleFunction(this.faviconUrl.trigger, this), {
				FaviconUrl: value.trim()
			})
		);
	}
}
