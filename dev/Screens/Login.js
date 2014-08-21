/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		KnoinAbstractScreen = require('../Knoin/KnoinAbstractScreen.js'),
		LoginViewModel = require('../ViewModels/LoginViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function LoginScreen()
	{
		KnoinAbstractScreen.call(this, 'login', [LoginViewModel]);
	}

	_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

	LoginScreen.prototype.onShow = function ()
	{
		RL.setTitle(''); // TODO cjs
	};

	module.exports = LoginScreen;

}(module));