import _ from '_';
import { settingsSaveHelperSimpleFunction, trim } from 'Common/Utils';
import { Magics } from 'Common/Enums';

import Remote from 'Remote/Admin/Ajax';

import { BrandingAdminSettings } from 'Settings/Admin/Branding';

class BrandingPremAdminSettings extends BrandingAdminSettings {
	onBuild(dom) {
		super.onBuild(dom);

		if (this.capa && this.capa() && !this.community) {
			_.delay(() => {
				const f1 = settingsSaveHelperSimpleFunction(this.loginLogo.trigger, this),
					f2 = settingsSaveHelperSimpleFunction(this.loginDescription.trigger, this),
					f3 = settingsSaveHelperSimpleFunction(this.loginCss.trigger, this),
					f4 = settingsSaveHelperSimpleFunction(this.userLogo.trigger, this),
					f5 = settingsSaveHelperSimpleFunction(this.userLogoTitle.trigger, this),
					f6 = settingsSaveHelperSimpleFunction(this.loginBackground.trigger, this),
					f7 = settingsSaveHelperSimpleFunction(this.userCss.trigger, this),
					f8 = settingsSaveHelperSimpleFunction(this.welcomePageUrl.trigger, this),
					f9 = settingsSaveHelperSimpleFunction(this.welcomePageDisplay.trigger, this),
					f10 = settingsSaveHelperSimpleFunction(this.userLogoMessage.trigger, this),
					f11 = settingsSaveHelperSimpleFunction(this.userIframeMessage.trigger, this);

				this.loginLogo.subscribe((value) => {
					Remote.saveAdminConfig(f1, {
						'LoginLogo': trim(value)
					});
				});

				this.loginDescription.subscribe((value) => {
					Remote.saveAdminConfig(f2, {
						'LoginDescription': trim(value)
					});
				});

				this.loginCss.subscribe((value) => {
					Remote.saveAdminConfig(f3, {
						'LoginCss': trim(value)
					});
				});

				this.userLogo.subscribe((value) => {
					Remote.saveAdminConfig(f4, {
						'UserLogo': trim(value)
					});
				});

				this.userLogoTitle.subscribe((value) => {
					Remote.saveAdminConfig(f5, {
						'UserLogoTitle': trim(value)
					});
				});

				this.userLogoMessage.subscribe((value) => {
					Remote.saveAdminConfig(f10, {
						'UserLogoMessage': trim(value)
					});
				});

				this.userIframeMessage.subscribe((value) => {
					Remote.saveAdminConfig(f11, {
						'UserIframeMessage': trim(value)
					});
				});

				this.loginBackground.subscribe((value) => {
					Remote.saveAdminConfig(f6, {
						'LoginBackground': trim(value)
					});
				});

				this.userCss.subscribe((value) => {
					Remote.saveAdminConfig(f7, {
						'UserCss': trim(value)
					});
				});

				this.welcomePageUrl.subscribe((value) => {
					Remote.saveAdminConfig(f8, {
						'WelcomePageUrl': trim(value)
					});
				});

				this.welcomePageDisplay.subscribe((value) => {
					Remote.saveAdminConfig(f9, {
						'WelcomePageDisplay': trim(value)
					});
				});
			}, Magics.Time50ms);
		}
	}
}

export { BrandingPremAdminSettings, BrandingPremAdminSettings as default };
