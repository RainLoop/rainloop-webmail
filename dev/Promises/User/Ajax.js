
(function () {

	'use strict';

	var
		_ = require('_'),

		AbstractAjaxPromises = require('Promises/AbstractAjax')
	;

	/**
	 * @constructor
	 * @extends AbstractAjaxPromises
	 */
	function PromisesUserAjax()
	{
		AbstractAjaxPromises.call(this);

		this.messageListSimpleHash = '';
		this.messageListSimpleCache = null;
	}

	_.extend(PromisesUserAjax.prototype, AbstractAjaxPromises.prototype);

	PromisesUserAjax.prototype.messageListSimple = function (sFolder, aUids, fTrigger)
	{
		var self = this, sHash = sFolder + '~' + aUids.join('/');
		if (sHash === this.messageListSimpleHash && this.messageListSimpleCache)
		{
			return this.fastResolve(this.messageListSimpleCache);
		}

		return this.abort('MessageListSimple')
			.postRequest('MessageListSimple', fTrigger, {
				'Folder': sFolder,
				'Uids': aUids
			}).then(function (aData) {

				var
					MessageSimpleModel = require('Model/MessageSimple'),
					aResult = _.compact(_.map(aData, function (aItem) {
						return MessageSimpleModel.newInstanceFromJson(aItem);
					}))
				;

				self.messageListSimpleHash = sHash;
				self.messageListSimpleCache = aResult;

				return aResult;
			})
		;
	};

	module.exports = new PromisesUserAjax();

}());