
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function DomainAdminStore()
	{
		this.domains = ko.observableArray([]);
		this.domains.loading = ko.observable(false).extend({'throttle': 100});

		this.domainsWithoutAliases = this.domains.filter(function (oItem) {
			return oItem && !oItem.alias;
		});
	}

	module.exports = new DomainAdminStore();

}());
