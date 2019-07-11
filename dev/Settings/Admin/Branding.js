import _ from '_';
import ko from 'ko';

import { Magics } from 'Common/Enums';
import { settingsSaveHelperSimpleFunction, trim } from 'Common/Utils';
import { i18n, trigger as translatorTrigger } from 'Common/Translator';

import Remote from 'Remote/Admin/Ajax';
import AppStore from 'Stores/Admin/App';

import { settingsGet } from 'Storage/Settings';

class BrandingAdminSettings {
	constructor() {
		this.capa = AppStore.prem;

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
		this.welcomePageUrl = ko.observable(settingsGet('WelcomePageUrl')).idleTrigger();
		this.welcomePageDisplay = ko.observable(settingsGet('WelcomePageDisplay')).idleTrigger();
		this.welcomePageDisplay.options = ko.computed(() => {
			translatorTrigger();
			return [
				{ optValue: 'none', optText: i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_NONE') },
				{ optValue: 'once', optText: i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_ONCE') },
				{ optValue: 'always', optText: i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_ALWAYS') }
			];
		});

		this.community = RL_COMMUNITY || AppStore.community();
	}

	onBuild() {
		_.delay(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.title.trigger, this),
				f2 = settingsSaveHelperSimpleFunction(this.loadingDesc.trigger, this),
				f3 = settingsSaveHelperSimpleFunction(this.faviconUrl.trigger, this);

			this.title.subscribe((value) => {
				Remote.saveAdminConfig(f1, {
					'Title': trim(value)
				});
			});

			this.loadingDesc.subscribe((value) => {
				Remote.saveAdminConfig(f2, {
					'LoadingDescription': trim(value)
				});
			});

			this.faviconUrl.subscribe((value) => {
				Remote.saveAdminConfig(f3, {
					'FaviconUrl': trim(value)
				});
			});
		}, Magics.Time50ms);
	}
}

export { BrandingAdminSettings, BrandingAdminSettings as default };
