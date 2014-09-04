
(function () {

	'use strict';

	var
		_ = require('_'),

		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function AboutScreen()
	{
		KnoinAbstractScreen.call(this, 'about', [
			require('View:RainLoop:About')
		]);
	}

	_.extend(AboutScreen.prototype, KnoinAbstractScreen.prototype);

	AboutScreen.prototype.onShow = function ()
	{
		require('App:RainLoop').setTitle('RainLoop');
	};

	module.exports = AboutScreen;

}());