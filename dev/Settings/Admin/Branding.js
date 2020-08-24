import ko from 'ko';

import { settingsSaveHelperSimpleFunction } from 'Common/Utils';

import Remote from 'Remote/Admin/Ajax';

import { settingsGet } from 'Storage/Settings';

class BrandingAdminSettings {
	constructor() {
		this.title = ko.observable(settingsGet('Title')).idleTrigger();
		this.loadingDesc = ko.observable(settingsGet('LoadingDescription')).idleTrigger();
		this.faviconUrl = ko.observable(settingsGet('FaviconUrl')).idleTrigger();
		this.loginLogo = ko.observable(settingsGet('LoginLogo') || '').idleTrigger();
		this.loginBackground = ko.observable(settingsGet('LoginBackground') || '').idleTrigger();
		this.userLogo = ko.observable(settingsGet('UserLogo') || '').idleTrigger();
		this.userLogoMessage = ko.observable(settingsGet('UserLogoMessage') || '').idleTrigger();
		this.userIframeMessage = ko.observable(settingsGet('UserIframeMessage') || '').idleTrigger();
		this.userLogoTitle = ko.observable(settingsGet('UserLogoTitle') || '').idleTrigger();
		this.loginDescription = ko.observable(settingsGet('LoginDescription')).idleTrigger();
		this.loginCss = ko.observable(settingsGet('LoginCss')).idleTrigger();
		this.userCss = ko.observable(settingsGet('UserCss')).idleTrigger();
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
