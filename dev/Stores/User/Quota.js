
(function () {

	'use strict';

	var
		window = require('window'),
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function QuotaUserStore()
	{
		this.quota = ko.observable(0);
		this.usage = ko.observable(0);

		this.percentage = ko.computed(function () {

			var
				iQuota = this.quota(),
				iUsed = this.usage()
			;

			return 0 < iQuota ? window.Math.ceil((iUsed / iQuota) * 100) : 0;

		}, this);
	}

	/**
	 * @param {number} iQuota
	 * @param {number} iUsage
	 */
	QuotaUserStore.prototype.populateData = function(iQuota, iUsage)
	{
		this.quota(iQuota * 1024);
		this.usage(iUsage * 1024);
	};

	module.exports = new QuotaUserStore();

}());
