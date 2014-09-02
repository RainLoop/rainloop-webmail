
(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function LoginScreen()
	{
		KnoinAbstractScreen.call(this, 'login', [
			require('View:RainLoop:Login')
		]);
	}

	_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

	LoginScreen.prototype.onShow = function ()
	{
		require('App:RainLoop').setTitle('');
	};

	module.exports = LoginScreen;

}(module, require));