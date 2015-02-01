
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function AccountUserStore()
	{
		this.accounts = ko.observableArray([]);
		this.accounts.loading = ko.observable(false).extend({'throttle': 100});

		this.accountsEmailNames = ko.observableArray([]).extend({'throttle': 1000});
		this.accountsEmailNames.skipFirst = true;

		this.accounts.subscribe(function (aList) {
			this.accountsEmailNames(_.compact(_.map(aList, function (oItem) {
				return oItem ? oItem.email : null;
			})));
		}, this);

		this.accountsEmailNames.subscribe(function (aList) {
			if (this.accountsEmailNames.skipFirst)
			{
				this.accountsEmailNames.skipFirst = false;
			}
			else if (aList && 1 < aList.length)
			{
				Remote.accountSortOrder(null, aList);
			}
		}, this);

		this.accountsUnreadCount = ko.computed(function () {

			var iResult = 0;

			_.each(this.accounts(), function (oItem) {
				if (oItem)
				{
					iResult += oItem.count();
				}
			});

			return iResult;

		}, this);
	}

	module.exports = new AccountUserStore();

}());
