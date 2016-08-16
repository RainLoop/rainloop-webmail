
import {createCommand} from 'Common/Utils';

import SocialStore from 'Stores/Social';

import {getApp} from 'Helper/Apps/User';

class SocialUserSettings
{
	constructor() {
		this.googleEnable = SocialStore.google.enabled;
		this.googleEnableAuth = SocialStore.google.capa.auth;
		this.googleEnableAuthFast = SocialStore.google.capa.authFast;
		this.googleEnableDrive = SocialStore.google.capa.drive;
		this.googleEnablePreview = SocialStore.google.capa.preview;

		this.googleActions = SocialStore.google.loading;
		this.googleLoggined = SocialStore.google.loggined;
		this.googleUserName = SocialStore.google.userName;

		this.facebookEnable = SocialStore.facebook.enabled;

		this.facebookActions = SocialStore.facebook.loading;
		this.facebookLoggined = SocialStore.facebook.loggined;
		this.facebookUserName = SocialStore.facebook.userName;

		this.twitterEnable = SocialStore.twitter.enabled;

		this.twitterActions = SocialStore.twitter.loading;
		this.twitterLoggined = SocialStore.twitter.loggined;
		this.twitterUserName = SocialStore.twitter.userName;

		this.connectGoogle = createCommand(() => {
			if (!this.googleLoggined())
			{
				getApp().googleConnect();
			}
		}, () => !this.googleLoggined() && !this.googleActions());

		this.disconnectGoogle = createCommand(() => {
			getApp().googleDisconnect();
		});

		this.connectFacebook = createCommand(() => {
			if (!this.facebookLoggined())
			{
				getApp().facebookConnect();
			}
		}, () => !this.facebookLoggined() && !this.facebookActions());

		this.disconnectFacebook = createCommand(() => {
			getApp().facebookDisconnect();
		});

		this.connectTwitter = createCommand(() => {
			if (!this.twitterLoggined())
			{
				getApp().twitterConnect();
			}
		}, () => !this.twitterLoggined() && !this.twitterActions());

		this.disconnectTwitter = createCommand(() => {
			getApp().twitterDisconnect();
		});
	}
}

export {SocialUserSettings, SocialUserSettings as default};
