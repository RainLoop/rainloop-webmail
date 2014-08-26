/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		ko = require('ko'),
		Utils = require('Utils')
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
			kn = require('kn'),
			FilterModel = require('../../Models/FilterModel.js'),
			PopupsFilterViewModel = require('../../ViewModels/Popups/PopupsFilterViewModel.js')
		;

		kn.showScreenPopup(PopupsFilterViewModel, [new FilterModel()]);
	};

	module.exports = SettingsFilters;

}(module, require));