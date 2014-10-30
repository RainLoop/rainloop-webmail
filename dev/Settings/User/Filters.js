
(function () {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function FiltersUserSettings()
	{
		this.filters = ko.observableArray([]);
		this.filters.loading = ko.observable(false);

		this.filters.subscribe(function () {
			Utils.windowResize();
		});
	}

	FiltersUserSettings.prototype.deleteFilter = function (oFilter)
	{
		this.filters.remove(oFilter);
		Utils.delegateRunOnDestroy(oFilter);
	};

	FiltersUserSettings.prototype.addFilter = function ()
	{
		var
			FilterModel = require('Model/Filter')
		;

		require('Knoin/Knoin').showScreenPopup(
			require('View/Popup/Filter'), [new FilterModel()]);
	};

	module.exports = FiltersUserSettings;

}());