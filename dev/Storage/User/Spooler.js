
(function () {

	'use strict';

	var
		queue = require('queue')
	;

	/**
	 * @constructor
	 */
	function Spooler()
	{
		this.queue = queue(1);
	}

	module.exports = new Spooler();

}());
