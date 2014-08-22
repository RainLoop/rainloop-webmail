/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		KnoinAbstractScreen = require('../Knoin/KnoinAbstractScreen.js')
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
		var RL = require('../Boots/RainLoopApp.js');
		RL.setTitle('');
	};

	module.exports = LoginScreen;

}(module));