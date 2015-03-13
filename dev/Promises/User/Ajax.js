
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		AbstractAjaxPromises = require('Promises/AbstractAjax'),

		MessageModel = require('Model/Message')
	;

	/**
	 * @constructor
	 * @extends AbstractAjaxPromises
	 */
	function PromisesUserAjax()
	{
		AbstractAjaxPromises.call(this);

		this.messageListSimple.loading = ko.observable(false).extend({'rateLimit': 1});
		this.messageListSimple.hash = '';
		this.messageListSimple.cache = null;
	}

	PromisesUserAjax.prototype.messageListSimple = function (sFolder, aUids)
	{
		var self = this, sHash = sFolder + '~' + aUids.join('/');
		if (sHash === this.messageListSimple.hash && this.messageListSimple.cache)
		{
			return this.fastPromise(this.messageListSimple.cache);
		}

		return this.abort('MessageListSimple')
			.postRequest('MessageListSimple', this.messageListSimple.loading, {
				'Folder': sFolder,
				'Uids': aUids
			}).then(function (aData) {

				var aResult = _.compact(_.map(aData, function (aItem) {
					return MessageModel.newInstanceFromJson(aItem);
				}));

				self.messageListSimple.hash = sHash;
				self.messageListSimple.cache = aResult;

				return aResult;
			})
		;
	};

	_.extend(PromisesUserAjax.prototype, AbstractAjaxPromises.prototype);

	module.exports = new PromisesUserAjax();

}());