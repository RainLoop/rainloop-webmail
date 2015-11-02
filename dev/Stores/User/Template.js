
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko')

//		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function TemplateUserStore()
	{
		this.templates = ko.observableArray([]);
		this.templates.loading = ko.observable(false).extend({'throttle': 100});

		this.templatesNames = ko.observableArray([]).extend({'throttle': 1000});
		this.templatesNames.skipFirst = true;

		this.subscribers();
	}

	TemplateUserStore.prototype.subscribers = function ()
	{
		this.templates.subscribe(function (aList) {
			this.templatesNames(_.compact(_.map(aList, function (oItem) {
				return oItem ? oItem.name : null;
			})));
		}, this);

//		this.templatesNames.subscribe(function (aList) {
//			if (this.templatesNames.skipFirst)
//			{
//				this.templatesNames.skipFirst = false;
//			}
//			else if (aList && 1 < aList.length)
//			{
//				Remote.templatesSortOrder(null, aList);
//			}
//		}, this);
	};

	module.exports = new TemplateUserStore();

}());
