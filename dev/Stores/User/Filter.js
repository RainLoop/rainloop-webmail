
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function FilterUserStore()
	{
		this.capa = ko.observable('');
		this.modules = ko.observable({});

		this.filters = ko.observableArray([]);

		this.filters.loading = ko.observable(false).extend({'throttle': 200});
		this.filters.saving = ko.observable(false).extend({'throttle': 200});

		this.raw = ko.observable('');
	}

	module.exports = new FilterUserStore();

}());
