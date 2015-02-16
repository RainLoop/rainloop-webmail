
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function CoreAdminStore()
	{
		this.coreReal = ko.observable(true);
		this.coreChannel = ko.observable('stable');
		this.coreType = ko.observable('stable');
		this.coreUpdatable = ko.observable(true);
		this.coreAccess = ko.observable(true);
		this.coreWarning = ko.observable(false);
		this.coreChecking = ko.observable(false).extend({'throttle': 100});
		this.coreUpdating = ko.observable(false).extend({'throttle': 100});
		this.coreVersion = ko.observable('');
		this.coreRemoteVersion = ko.observable('');
		this.coreRemoteRelease = ko.observable('');
		this.coreVersionCompare = ko.observable(-2);
	}

	module.exports = new CoreAdminStore();

}());
