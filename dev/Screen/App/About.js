
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
	function AboutAppScreen()
	{
		AbstractScreen.call(this, 'about', [
			require('View/App/About')
		]);
	}

	_.extend(AboutAppScreen.prototype, AbstractScreen.prototype);

	AboutAppScreen.prototype.onShow = function ()
	{
		require('App/App').setTitle('RainLoop');
	};

	module.exports = AboutAppScreen;

}());