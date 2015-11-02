
(function () {

	'use strict';

	var
		_ = require('_'),

		AbstractScreen = require('Knoin/AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends AbstractScreen
	 */
	function LoginUserScreen()
	{
		AbstractScreen.call(this, 'login', [
			require('View/User/Login')
		]);
	}

	_.extend(LoginUserScreen.prototype, AbstractScreen.prototype);

	LoginUserScreen.prototype.onShow = function ()
	{
		require('App/User').setWindowTitle('');
	};

	module.exports = LoginUserScreen;

}());