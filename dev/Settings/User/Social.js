
import {createCommand} from 'Common/Utils';

import SocialStore from 'Stores/Social';

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

		this.connectGoogle = createCommand(this, () => {
			if (!this.googleLoggined())
			{
				this.getApp().googleConnect();
			}
		}, () => !this.googleLoggined() && !this.googleActions());

		this.disconnectGoogle = createCommand(this, () => {
			this.getApp().googleDisconnect();
		});

		this.connectFacebook = createCommand(this, () => {
			if (!this.facebookLoggined())
			{
				this.getApp().facebookConnect();
			}
		}, () => !this.facebookLoggined() && !this.facebookActions());

		this.disconnectFacebook = createCommand(this, () => {
			this.getApp().facebookDisconnect();
		});

		this.connectTwitter = createCommand(this, () => {
			if (!this.twitterLoggined())
			{
				this.getApp().twitterConnect();
			}
		}, () => !this.twitterLoggined() && !this.twitterActions());

		this.disconnectTwitter = createCommand(this, () => {
			this.getApp().twitterDisconnect();
		});
	}

	getApp() {
		return require('App/User').default;
	}
}

export {SocialUserSettings, SocialUserSettings as default};
