/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsSocialScreen()
{
	var oData = RL.data();

	this.googleEnable = oData.googleEnable;

	this.googleActions = oData.googleActions;
	this.googleLoggined = oData.googleLoggined;
	this.googleUserName = oData.googleUserName;

	this.facebookEnable = oData.facebookEnable;
	
	this.facebookActions = oData.facebookActions;
	this.facebookLoggined = oData.facebookLoggined;
	this.facebookUserName = oData.facebookUserName;

	this.twitterEnable = oData.twitterEnable;

	this.twitterActions = oData.twitterActions;
	this.twitterLoggined = oData.twitterLoggined;
	this.twitterUserName = oData.twitterUserName;

	this.connectGoogle = Utils.createCommand(this, function () {
		if (!this.googleLoggined())
		{
			RL.googleConnect();
		}
	}, function () {
		return !this.googleLoggined() && !this.googleActions();
	});

	this.disconnectGoogle = Utils.createCommand(this, function () {
		RL.googleDisconnect();
	});

	this.connectFacebook = Utils.createCommand(this, function () {
		if (!this.facebookLoggined())
		{
			RL.facebookConnect();
		}
	}, function () {
		return !this.facebookLoggined() && !this.facebookActions();
	});

	this.disconnectFacebook = Utils.createCommand(this, function () {
		RL.facebookDisconnect();
	});

	this.connectTwitter = Utils.createCommand(this, function () {
		if (!this.twitterLoggined())
		{
			RL.twitterConnect();
		}
	}, function () {
		return !this.twitterLoggined() && !this.twitterActions();
	});

	this.disconnectTwitter = Utils.createCommand(this, function () {
		RL.twitterDisconnect();
	});
}

Utils.addSettingsViewModel(SettingsSocialScreen, 'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
