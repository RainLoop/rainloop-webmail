
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
		this.collection = ko.observableArray([]);
		this.collection.loading = ko.observable(false).extend({'throttle': 100});

		this.packagesReal = ko.observable(true);
		this.packagesMainUpdatable = ko.observable(true);
	}

	module.exports = new PluginAdminStore();

}());
