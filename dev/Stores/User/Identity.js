
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function IdentityUserStore()
	{
		this.identities = ko.observableArray([]);
		this.identities.loading = ko.observable(false).extend({'throttle': 100});

		this.identitiesIDS = ko.computed(function () {
			return _.compact(_.map(this.identities(), function (oItem) {
				return oItem ? oItem.id : null;
			}));
		}, this);
	}

	module.exports = new IdentityUserStore();

}());
