
(function () {

	'use strict';

	var
		_ = require('_'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

//		MessageHelper = require('Helper/Message'),

		MessageSimpleModel = require('Model/MessageSimple')
	;

	/**
	 * @constructor
	 */
	function MessageFullModel()
	{
		MessageSimpleModel.call(this, 'MessageFullModel');
	}

	_.extend(MessageFullModel.prototype, MessageSimpleModel.prototype);

	MessageFullModel.prototype.priority = 0;
	MessageFullModel.prototype.hash = '';
	MessageFullModel.prototype.requestHash = '';
	MessageFullModel.prototype.proxy = false;
	MessageFullModel.prototype.hasAttachments = false;

	MessageFullModel.prototype.clear = function ()
	{
		MessageSimpleModel.prototype.clear.call(this);

		this.priority = 0;
		this.hash = '';
		this.requestHash = '';

		this.proxy = false;

		this.hasAttachments = false;
	};

	/**
	 * @param {AjaxJsonMessage} oJson
	 * @return {boolean}
	 */
	MessageFullModel.prototype.initByJson = function (oJson)
	{
		var bResult = false;

		if (oJson && 'Object/Message' === oJson['@Object'])
		{
			if (MessageSimpleModel.prototype.initByJson.call(this, oJson))
			{
				this.priority = Utils.pInt(oJson.Priority);
				this.priority =  Utils.inArray(this.priority, [Enums.MessagePriority.High, Enums.MessagePriority.Low]) ?
					this.priority : Enums.MessagePriority.Normal;

				this.hash = Utils.pString(oJson.Hash);
				this.requestHash = Utils.pString(oJson.RequestHash);

				this.proxy = !!oJson.ExternalProxy;

				this.hasAttachments = !!oJson.HasAttachments;

				bResult = true;
			}
		}

		return bResult;
	};

	/**
	 * @static
	 * @param {AjaxJsonMessage} oJson
	 * @return {?MessageFullModel}
	 */
	MessageFullModel.newInstanceFromJson = function (oJson)
	{
		var oItem = oJson ? new MessageFullModel() : null;
		return oItem && oItem.initByJson(oJson) ? oItem : null;
	};

	module.exports = MessageFullModel;

}());