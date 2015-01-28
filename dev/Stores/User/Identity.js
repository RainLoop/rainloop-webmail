
(function () {

	'use strict';

	var
		ko = require('ko'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function IdentityUserStore()
	{
		this.defaultIdentityID = ko.observable('');

		this.identities = ko.observableArray([]);
		this.identities.loading = ko.observable(false).extend({'throttle': 100});
	}

	IdentityUserStore.prototype.populate = function ()
	{
		this.defaultIdentityID(Settings.settingsGet('DefaultIdentityID'));
	};

	module.exports = new IdentityUserStore();

}());
