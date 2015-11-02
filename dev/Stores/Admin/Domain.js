
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
		this.domains = ko.observableArray([]);
		this.domains.loading = ko.observable(false).extend({'throttle': 100});
	}

	module.exports = new DomainAdminStore();

}());
