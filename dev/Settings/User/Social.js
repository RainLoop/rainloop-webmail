
/**
 * @constructor
 */
function SocialUserSettings()
{
	var
		Utils = require('Common/Utils'),
		SocialStore = require('Stores/Social');

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

	this.connectGoogle = Utils.createCommand(this, function() {
		if (!this.googleLoggined())
		{
			require('App/User').default.googleConnect();
		}
	}, function() {
		return !this.googleLoggined() && !this.googleActions();
	});

	this.disconnectGoogle = Utils.createCommand(this, function() {
		require('App/User').default.googleDisconnect();
	});

	this.connectFacebook = Utils.createCommand(this, function() {
		if (!this.facebookLoggined())
		{
			require('App/User').default.facebookConnect();
		}
	}, function() {
		return !this.facebookLoggined() && !this.facebookActions();
	});

	this.disconnectFacebook = Utils.createCommand(this, function() {
		require('App/User').default.facebookDisconnect();
	});

	this.connectTwitter = Utils.createCommand(this, function() {
		if (!this.twitterLoggined())
		{
			require('App/User').default.twitterConnect();
		}
	}, function() {
		return !this.twitterLoggined() && !this.twitterActions();
	});

	this.disconnectTwitter = Utils.createCommand(this, function() {
		require('App/User').default.twitterDisconnect();
	});
}

module.exports = SocialUserSettings;
