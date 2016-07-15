
import _ from '_';
import ko from 'ko';

import {settingsSaveHelperSimpleFunction, trim} from 'Common/Utils';
import {i18n, trigger as translatorTrigger} from 'Common/Translator';

import {settingsGet} from 'Storage/Settings';

class BrandingAdminSettings
{
	constructor()
	{
		const AppStore = require('Stores/Admin/App');

		this.capa = AppStore.prem;

		this.title = ko.observable(settingsGet('Title')).extend({idleTrigger: true});
		this.loadingDesc = ko.observable(settingsGet('LoadingDescription')).extend({idleTrigger: true});
		this.faviconUrl = ko.observable(settingsGet('FaviconUrl')).extend({idleTrigger: true});
		this.loginLogo = ko.observable(settingsGet('LoginLogo') || '').extend({idleTrigger: true});
		this.loginBackground = ko.observable(settingsGet('LoginBackground') || '').extend({idleTrigger: true});
		this.userLogo = ko.observable(settingsGet('UserLogo') || '').extend({idleTrigger: true});
		this.userLogoMessage = ko.observable(settingsGet('UserLogoMessage') || '').extend({idleTrigger: true});
		this.userIframeMessage = ko.observable(settingsGet('UserIframeMessage') || '').extend({idleTrigger: true});
		this.userLogoTitle = ko.observable(settingsGet('UserLogoTitle') || '').extend({idleTrigger: true});
		this.loginDescription = ko.observable(settingsGet('LoginDescription')).extend({idleTrigger: true});
		this.loginCss = ko.observable(settingsGet('LoginCss')).extend({idleTrigger: true});
		this.userCss = ko.observable(settingsGet('UserCss')).extend({idleTrigger: true});
		this.welcomePageUrl = ko.observable(settingsGet('WelcomePageUrl')).extend({idleTrigger: true});
		this.welcomePageDisplay = ko.observable(settingsGet('WelcomePageDisplay')).extend({idleTrigger: true});
		this.welcomePageDisplay.options = ko.computed(() => {
			translatorTrigger();
			return [
				{'optValue': 'none', 'optText': i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_NONE')},
				{'optValue': 'once', 'optText': i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_ONCE')},
				{'optValue': 'always', 'optText': i18n('TAB_BRANDING/OPTION_WELCOME_PAGE_DISPLAY_ALWAYS')}
			];
		});

		this.loginPowered = ko.observable(!!settingsGet('LoginPowered'));
		this.community = RL_COMMUNITY || AppStore.community();
	}

	onBuild() {
		_.delay(() => {
			const
				Remote = require('Remote/Admin/Ajax'),
				f1 = settingsSaveHelperSimpleFunction(this.title.trigger, this),
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
		}, 50);
	}
}

export {BrandingAdminSettings, BrandingAdminSettings as default};
