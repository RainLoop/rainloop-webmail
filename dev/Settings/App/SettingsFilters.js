
(function () {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function SettingsFilters()
	{
		this.filters = ko.observableArray([]);
		this.filters.loading = ko.observable(false);

		this.filters.subscribe(function () {
			Utils.windowResize();
		});
	}

	SettingsFilters.prototype.deleteFilter = function (oFilter)
	{
		this.filters.remove(oFilter);
	};

	SettingsFilters.prototype.addFilter = function ()
	{
		var
			FilterModel = require('Model/Filter')
		;

		require('App:Knoin').showScreenPopup(
			require('View:Popup:Filter'), [new FilterModel()]);
	};

	module.exports = SettingsFilters;

}());