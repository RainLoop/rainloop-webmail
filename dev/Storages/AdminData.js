/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
	
	this.licensing = ko.observable(false);
	this.licensingProcess = ko.observable(false);
	this.licenseValid = ko.observable(false);
	this.licenseExpired = ko.observable(0);
	this.licenseError = ko.observable('');
	
	this.licenseTrigger = ko.observable(false);
}

_.extend(AdminDataStorage.prototype, AbstractData.prototype);

AdminDataStorage.prototype.populateDataOnStart = function()
{
	AbstractData.prototype.populateDataOnStart.call(this);
};