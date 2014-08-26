/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		_ = require('_'),
		KnoinAbstractScreen = require('KnoinAbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function LoginScreen()
	{
		var LoginViewModel = require('../ViewModels/LoginViewModel.js');
		KnoinAbstractScreen.call(this, 'login', [LoginViewModel]);
	}

	_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

	LoginScreen.prototype.onShow = function ()
	{
		var App = require('../Apps/RainLoopApp.js');
		App.setTitle('');
	};

	module.exports = LoginScreen;

}(module, require));