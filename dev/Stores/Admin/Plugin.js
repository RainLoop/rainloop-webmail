
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function PluginAdminStore()
	{
		this.plugins = ko.observableArray([]);
		this.plugins.loading = ko.observable(false).extend({'throttle': 100});
		this.plugins.error = ko.observable('');
	}

	module.exports = new PluginAdminStore();

}());
