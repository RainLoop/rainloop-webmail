
(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function IdentityUserStore()
	{
		this.identities = ko.observableArray([]);
		this.identities.loading = ko.observable(false).extend({'throttle': 100});
	}

	module.exports = new IdentityUserStore();

}());
