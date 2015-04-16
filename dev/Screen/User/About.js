
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
	function AboutUserScreen()
	{
		AbstractScreen.call(this, 'about', [
			require('View/User/About')
		]);
	}

	_.extend(AboutUserScreen.prototype, AbstractScreen.prototype);

	AboutUserScreen.prototype.onShow = function ()
	{
		require('App/User').setWindowTitle('RainLoop');
	};

	module.exports = AboutUserScreen;

}());