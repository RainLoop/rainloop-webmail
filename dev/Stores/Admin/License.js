
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function LicenseAdminStore()
	{
		this.licensing = ko.observable(false);
		this.licensingProcess = ko.observable(false);
		this.licenseValid = ko.observable(false);
		this.licenseExpired = ko.observable(0);
		this.licenseError = ko.observable('');

		this.licenseTrigger = ko.observable(false);
	}

	module.exports = new LicenseAdminStore();

}());
