/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsFilters()
{
//	var oData = RL.data();

	this.filters = ko.observableArray([]);
	this.filters.loading = ko.observable(false);

	this.filters.subscribe(function () {
		Utils.windowResize();
	});
}

Utils.addSettingsViewModel(SettingsFilters, 'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');

//SettingsFilters.prototype.onBuild = function ()
//{
//};

SettingsFilters.prototype.deleteFilter = function (oFilter)
{
	this.filters.remove(oFilter);
};

SettingsFilters.prototype.addFilter = function ()
{
	var oFilter = new FilterModel();
	oFilter.addCondition();
	oFilter.addAction();

	this.filters.push(oFilter);
};
