
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function FilterStore()
	{
		this.capa = ko.observable('');
		this.modules = ko.observable({});

		this.collection = ko.observableArray([]);

		this.collection.loading = ko.observable(false).extend({'throttle': 200});
		this.collection.saving = ko.observable(false).extend({'throttle': 200});

		this.raw = ko.observable('');
	}

	module.exports = new FilterStore();

}());
