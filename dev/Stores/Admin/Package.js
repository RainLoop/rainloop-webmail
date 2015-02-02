
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function PackageAdminStore()
	{
		this.packages = ko.observableArray([]);
		this.packages.loading = ko.observable(false).extend({'throttle': 100});

		this.packagesReal = ko.observable(true);
		this.packagesMainUpdatable = ko.observable(true);
	}

	module.exports = new PackageAdminStore();

}());
