
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function DomainAdminStore()
	{
		this.collection = ko.observableArray([]);
		this.collection.loading = ko.observable(false).extend({'throttle': 100});
	}

	module.exports = new DomainAdminStore();

}());
