
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
		this.collection.error = ko.observable('');
	}

	module.exports = new PluginAdminStore();

}());
