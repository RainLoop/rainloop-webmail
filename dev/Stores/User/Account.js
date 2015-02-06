
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Settings = require('Storage/Settings'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function AccountUserStore()
	{
		this.email = ko.observable('');
//		this.incLogin = ko.observable('');
//		this.outLogin = ko.observable('');

		this.signature = ko.observable('');

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

//			_.each(this.accounts(), function (oItem) {
//				if (oItem)
//				{
//					iResult += oItem.count();
//				}
//			});

			return iResult;

		}, this);
	}

	AccountUserStore.prototype.populate = function ()
	{
		this.email(Settings.settingsGet('Email'));
//		this.incLogin(Settings.settingsGet('IncLogin'));
//		this.outLogin(Settings.settingsGet('OutLogin'));

//		this.signature(Settings.settingsGet('Signature'));
	};

	module.exports = new AccountUserStore();

}());
