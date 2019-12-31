import _ from '_';
import ko from 'ko';

import { SaveSettingsStep, Magics } from 'Common/Enums';
import { settingsSaveHelperSimpleFunction, trim, boolToAjax } from 'Common/Utils';

import SocialStore from 'Stores/Social';

import Remote from 'Remote/Admin/Ajax';

class SocialAdminSettings {
	constructor() {
		this.googleEnable = SocialStore.google.enabled;
		this.googleEnableAuth = SocialStore.google.capa.auth;
		this.googleEnableAuthGmail = SocialStore.google.capa.authGmail;
		this.googleEnableDrive = SocialStore.google.capa.drive;
		this.googleEnablePreview = SocialStore.google.capa.preview;

		this.googleEnableRequireClientSettings = SocialStore.google.require.clientSettings;
		this.googleEnableRequireApiKey = SocialStore.google.require.apiKeySettings;

		this.googleClientID = SocialStore.google.clientID;
		this.googleClientSecret = SocialStore.google.clientSecret;
		this.googleApiKey = SocialStore.google.apiKey;

		this.googleTrigger1 = ko.observable(SaveSettingsStep.Idle);
		this.googleTrigger2 = ko.observable(SaveSettingsStep.Idle);
		this.googleTrigger3 = ko.observable(SaveSettingsStep.Idle);

		this.facebookSupported = SocialStore.facebook.supported;
		this.facebookEnable = SocialStore.facebook.enabled;
		this.facebookAppID = SocialStore.facebook.appID;
		this.facebookAppSecret = SocialStore.facebook.appSecret;

		this.facebookTrigger1 = ko.observable(SaveSettingsStep.Idle);
		this.facebookTrigger2 = ko.observable(SaveSettingsStep.Idle);

		this.twitterEnable = SocialStore.twitter.enabled;
		this.twitterConsumerKey = SocialStore.twitter.consumerKey;
		this.twitterConsumerSecret = SocialStore.twitter.consumerSecret;

		this.twitterTrigger1 = ko.observable(SaveSettingsStep.Idle);
		this.twitterTrigger2 = ko.observable(SaveSettingsStep.Idle);

		this.dropboxEnable = SocialStore.dropbox.enabled;
		this.dropboxApiKey = SocialStore.dropbox.apiKey;

		this.dropboxTrigger1 = ko.observable(SaveSettingsStep.Idle);
	}

	onBuild() {
		_.delay(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.facebookTrigger1, this),
				f2 = settingsSaveHelperSimpleFunction(this.facebookTrigger2, this),
				f3 = settingsSaveHelperSimpleFunction(this.twitterTrigger1, this),
				f4 = settingsSaveHelperSimpleFunction(this.twitterTrigger2, this),
				f5 = settingsSaveHelperSimpleFunction(this.googleTrigger1, this),
				f6 = settingsSaveHelperSimpleFunction(this.googleTrigger2, this),
				f7 = settingsSaveHelperSimpleFunction(this.googleTrigger3, this),
				f8 = settingsSaveHelperSimpleFunction(this.dropboxTrigger1, this);

			this.facebookEnable.subscribe((value) => {
				if (this.facebookSupported()) {
					Remote.saveAdminConfig(null, {
						'FacebookEnable': boolToAjax(value)
					});
				}
			});

			this.facebookAppID.subscribe((value) => {
				if (this.facebookSupported()) {
					Remote.saveAdminConfig(f1, {
						'FacebookAppID': trim(value)
					});
				}
			});

			this.facebookAppSecret.subscribe((value) => {
				if (this.facebookSupported()) {
					Remote.saveAdminConfig(f2, {
						'FacebookAppSecret': trim(value)
					});
				}
			});

			this.twitterEnable.subscribe(Remote.saveAdminConfigHelper('TwitterEnable', boolToAjax));
			this.twitterConsumerKey.subscribe(Remote.saveAdminConfigHelper('TwitterConsumerKey', trim, f3));
			this.twitterConsumerSecret.subscribe(Remote.saveAdminConfigHelper('TwitterConsumerSecret', trim, f4));

			this.googleEnable.subscribe(Remote.saveAdminConfigHelper('GoogleEnable', boolToAjax));
			this.googleEnableAuth.subscribe(Remote.saveAdminConfigHelper('GoogleEnableAuth', boolToAjax));
			this.googleEnableAuthGmail.subscribe(Remote.saveAdminConfigHelper('GoogleEnableAuthGmail', boolToAjax));
			this.googleEnableDrive.subscribe(Remote.saveAdminConfigHelper('GoogleEnableDrive', boolToAjax));
			this.googleEnablePreview.subscribe(Remote.saveAdminConfigHelper('GoogleEnablePreview', boolToAjax));
			this.googleClientID.subscribe(Remote.saveAdminConfigHelper('GoogleClientID', trim, f5));
			this.googleClientSecret.subscribe(Remote.saveAdminConfigHelper('GoogleClientSecret', trim, f6));
			this.googleApiKey.subscribe(Remote.saveAdminConfigHelper('GoogleApiKey', trim, f7));

			this.dropboxEnable.subscribe(Remote.saveAdminConfigHelper('DropboxEnable', boolToAjax));
			this.dropboxApiKey.subscribe(Remote.saveAdminConfigHelper('DropboxApiKey', trim, f8));
		}, Magics.Time50ms);
	}
}

export { SocialAdminSettings, SocialAdminSettings as default };
