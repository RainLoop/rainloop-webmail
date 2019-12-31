import SocialStore from 'Stores/Social';

import { getApp } from 'Helper/Apps/User';

import { command } from 'Knoin/Knoin';

class SocialUserSettings {
	constructor() {
		this.googleEnable = SocialStore.google.enabled;
		this.googleEnableAuth = SocialStore.google.capa.auth;
		this.googleEnableAuthGmail = SocialStore.google.capa.authGmail;
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
	}

	@command((self) => !self.googleLoggined() && !self.googleActions())
	connectGoogleCommand() {
		if (!this.googleLoggined()) {
			getApp().googleConnect();
		}
	}

	@command()
	disconnectGoogleCommand() {
		getApp().googleDisconnect();
	}

	@command((self) => !self.facebookLoggined() && !self.facebookActions())
	connectFacebookCommand() {
		if (!this.facebookLoggined()) {
			getApp().facebookConnect();
		}
	}

	@command()
	disconnectFacebookCommand() {
		getApp().facebookDisconnect();
	}

	@command((self) => !self.twitterLoggined() && !self.twitterActions())
	connectTwitterCommand() {
		if (!this.twitterLoggined()) {
			getApp().twitterConnect();
		}
	}

	@command()
	disconnectTwitterCommand() {
		getApp().twitterDisconnect();
	}
}

export { SocialUserSettings, SocialUserSettings as default };
