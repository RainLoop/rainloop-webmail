
(function () {

	'use strict';

	/**
	 * @constructor
	 */
	function SettingsSocial()
	{
		var
			Utils = require('Common/Utils'),
			Data = require('Storage:RainLoop:Data')
		;

		this.googleEnable = Data.googleEnable;

		this.googleActions = Data.googleActions;
		this.googleLoggined = Data.googleLoggined;
		this.googleUserName = Data.googleUserName;

		this.facebookEnable = Data.facebookEnable;

		this.facebookActions = Data.facebookActions;
		this.facebookLoggined = Data.facebookLoggined;
		this.facebookUserName = Data.facebookUserName;

		this.twitterEnable = Data.twitterEnable;

		this.twitterActions = Data.twitterActions;
		this.twitterLoggined = Data.twitterLoggined;
		this.twitterUserName = Data.twitterUserName;

		this.connectGoogle = Utils.createCommand(this, function () {
			if (!this.googleLoggined())
			{
				require('App:RainLoop').googleConnect();
			}
		}, function () {
			return !this.googleLoggined() && !this.googleActions();
		});

		this.disconnectGoogle = Utils.createCommand(this, function () {
			require('App:RainLoop').googleDisconnect();
		});

		this.connectFacebook = Utils.createCommand(this, function () {
			if (!this.facebookLoggined())
			{
				require('App:RainLoop').facebookConnect();
			}
		}, function () {
			return !this.facebookLoggined() && !this.facebookActions();
		});

		this.disconnectFacebook = Utils.createCommand(this, function () {
			require('App:RainLoop').facebookDisconnect();
		});

		this.connectTwitter = Utils.createCommand(this, function () {
			if (!this.twitterLoggined())
			{
				require('App:RainLoop').twitterConnect();
			}
		}, function () {
			return !this.twitterLoggined() && !this.twitterActions();
		});

		this.disconnectTwitter = Utils.createCommand(this, function () {
			require('App:RainLoop').twitterDisconnect();
		});
	}

	module.exports = SettingsSocial;

}());