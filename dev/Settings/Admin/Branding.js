import { SaveSettingsStep } from 'Common/Enums';
import { SettingsGet } from 'Common/Globals';
import { settingsSaveHelperSimpleFunction } from 'Common/Utils';
import { addObservablesTo, addSubscribablesTo } from 'External/ko';

import Remote from 'Remote/Admin/Fetch';

export class BrandingAdminSettings /*extends AbstractViewSettings*/ {
	constructor() {
		addObservablesTo(this, {
			title: SettingsGet('Title'),
			loadingDesc: SettingsGet('LoadingDescription'),
			faviconUrl: SettingsGet('FaviconUrl'),

			titleTrigger: SaveSettingsStep.Idle,
			loadingDescTrigger: SaveSettingsStep.Idle,
			faviconUrlTrigger: SaveSettingsStep.Idle
		});

		addSubscribablesTo(this, {
			title: (value =>
				Remote.saveConfig({
					Title: value.trim()
				}, settingsSaveHelperSimpleFunction(this.titleTrigger, this))
			).debounce(999),

			loadingDesc: (value =>
				Remote.saveConfig({
					LoadingDescription: value.trim()
				}, settingsSaveHelperSimpleFunction(this.loadingDescTrigger, this))
			).debounce(999),

			faviconUrl: (value =>
				Remote.saveConfig({
					FaviconUrl: value.trim()
				}, settingsSaveHelperSimpleFunction(this.faviconUrlTrigger, this))
			).debounce(999)
		});
	}
}
