/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),

		AbstractData = require('./AbstractData.js')
	;

	/**
	 * @constructor
	 * @extends AbstractData
	 */
	function AdminDataStorage()
	{
		AbstractData.call(this);

		this.domainsLoading = ko.observable(false).extend({'throttle': 100});
		this.domains = ko.observableArray([]);

		this.pluginsLoading = ko.observable(false).extend({'throttle': 100});
		this.plugins = ko.observableArray([]);

		this.packagesReal = ko.observable(true);
		this.packagesMainUpdatable = ko.observable(true);
		this.packagesLoading = ko.observable(false).extend({'throttle': 100});
		this.packages = ko.observableArray([]);

		this.coreReal = ko.observable(true);
		this.coreUpdatable = ko.observable(true);
		this.coreAccess = ko.observable(true);
		this.coreChecking = ko.observable(false).extend({'throttle': 100});
		this.coreUpdating = ko.observable(false).extend({'throttle': 100});
		this.coreRemoteVersion = ko.observable('');
		this.coreRemoteRelease = ko.observable('');
		this.coreVersionCompare = ko.observable(-2);

		this.licensing = ko.observable(false);
		this.licensingProcess = ko.observable(false);
		this.licenseValid = ko.observable(false);
		this.licenseExpired = ko.observable(0);
		this.licenseError = ko.observable('');

		this.licenseTrigger = ko.observable(false);

		this.adminManLoading = ko.computed(function () {
			return '000' !== [this.domainsLoading() ? '1' : '0', this.pluginsLoading() ? '1' : '0', this.packagesLoading() ? '1' : '0'].join('');
		}, this);

		this.adminManLoadingVisibility = ko.computed(function () {
			return this.adminManLoading() ? 'visible' : 'hidden';
		}, this).extend({'rateLimit': 300});
	}

	_.extend(AdminDataStorage.prototype, AbstractData.prototype);

	AdminDataStorage.prototype.populateDataOnStart = function()
	{
		AbstractData.prototype.populateDataOnStart.call(this);
	};

	module.exports = new AdminDataStorage();

}(module));