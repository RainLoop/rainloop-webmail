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
			App = require('../../Apps/RainLoopApp.js'),
			Data = require('../../Storages/WebMailDataStorage.js')
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
				App.googleConnect();
			}
		}, function () {
			return !this.googleLoggined() && !this.googleActions();
		});

		this.disconnectGoogle = Utils.createCommand(this, function () {
			App.googleDisconnect();
		});

		this.connectFacebook = Utils.createCommand(this, function () {
			if (!this.facebookLoggined())
			{
				App.facebookConnect();
			}
		}, function () {
			return !this.facebookLoggined() && !this.facebookActions();
		});

		this.disconnectFacebook = Utils.createCommand(this, function () {
			App.facebookDisconnect();
		});

		this.connectTwitter = Utils.createCommand(this, function () {
			if (!this.twitterLoggined())
			{
				App.twitterConnect();
			}
		}, function () {
			return !this.twitterLoggined() && !this.twitterActions();
		});

		this.disconnectTwitter = Utils.createCommand(this, function () {
			App.twitterDisconnect();
		});
	}

	module.exports = SettingsSocial;

}(module, require));