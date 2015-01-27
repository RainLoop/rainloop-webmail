
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
		this.loading = ko.observable(false).extend({'throttle': 100});

		this.collection = ko.observableArray([]);
		this.collectionEmailNames = ko.observableArray([]).extend({'throttle': 1000});
		this.collectionEmailNames.skipFirst = true;

		this.collection.subscribe(function (aList) {
			this.collectionEmailNames(_.compact(_.map(aList, function (oItem) {
				return oItem ? oItem.email : null;
			})));
		}, this);

		this.collectionEmailNames.subscribe(function (aList) {
			if (this.collectionEmailNames.skipFirst)
			{
				this.collectionEmailNames.skipFirst = false;
			}
			else if (aList && 1 < aList.length)
			{
				Remote.accountSortOrder(null, aList);
			}
		}, this);
	}

	module.exports = new AccountUserStore();

}());
