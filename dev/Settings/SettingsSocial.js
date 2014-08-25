/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	/**
	 * @constructor
	 */
	function SettingsSocial()
	{
		var
			Utils = require('Utils'),
			RL = require('../Boots/RainLoopApp.js'),
			Data = require('../Storages/WebMailDataStorage.js')
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

	module.exports = SettingsSocial;

}(module, require));