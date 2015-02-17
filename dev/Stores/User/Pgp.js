(function () {

	'use strict';

	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function PgpUserStore()
	{
		this.capaOpenPGP = ko.observable(false);

		this.openpgp = null;

		this.openpgpkeys = ko.observableArray([]);
		this.openpgpKeyring = null;

		this.openpgpkeysPublic = this.openpgpkeys.filter(function (oItem) {
			return !!(oItem && !oItem.isPrivate);
		});

		this.openpgpkeysPrivate = this.openpgpkeys.filter(function (oItem) {
			return !!(oItem && oItem.isPrivate);
		});
	}

	/**
	 * @return {boolean}
	 */
	PgpUserStore.prototype.isSupported = function ()
	{
		return !!this.openpgp;
	};

	module.exports = new PgpUserStore();

}());

