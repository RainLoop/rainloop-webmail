
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
	function LoginAppScreen()
	{
		AbstractScreen.call(this, 'login', [
			require('View/App/Login')
		]);
	}

	_.extend(LoginAppScreen.prototype, AbstractScreen.prototype);

	LoginAppScreen.prototype.onShow = function ()
	{
		require('App/App').setTitle('');
	};

	module.exports = LoginAppScreen;

}());