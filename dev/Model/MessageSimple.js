
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils'),

		MessageModel = require('Model/Message'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function MessageSimpleModel()
	{
		AbstractModel.call(this, 'MessageSimpleModel');

		this.clear();
	}

	_.extend(MessageSimpleModel.prototype, AbstractModel.prototype);

	MessageSimpleModel.prototype.selected = false;
	MessageSimpleModel.prototype.folderFullNameRaw = '';
	MessageSimpleModel.prototype.uid = '';
	MessageSimpleModel.prototype.size = 0;
	MessageSimpleModel.prototype.sender = '';
	MessageSimpleModel.prototype.subject = '';
	MessageSimpleModel.prototype.dateInUTC = 0;

	MessageSimpleModel.prototype.clear = function ()
	{
		this.selected = false;

		this.folderFullNameRaw = '';
		this.uid = '';
		this.size = 0;

		this.sender = '';
		this.subject = '';

		this.dateInUTC = 0;
	};

	/**
	 * @param {AjaxJsonMessage} oJsonMessage
	 * @return {boolean}
	 */
	MessageSimpleModel.prototype.initByJson = function (oJsonMessage)
	{
		var bResult = false;

		if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
		{
			this.selected = false;

			this.folderFullNameRaw = oJsonMessage.Folder;
			this.uid = oJsonMessage.Uid;
			this.size = Utils.pInt(oJsonMessage.Size);

			this.sender = MessageModel.emailsToLine(
				MessageModel.initEmailsFromJson(oJsonMessage.From), true);

			this.subject = oJsonMessage.Subject;

			this.dateInUTC = Utils.pInt(oJsonMessage.DateTimeStampInUTC);

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @static
	 * @param {AjaxJsonMessage} oJsonMessage
	 * @return {?MessageSimpleModel}
	 */
	MessageSimpleModel.newInstanceFromJson = function (oJsonMessage)
	{
		var oMessageModel = new MessageSimpleModel();
		return oMessageModel.initByJson(oJsonMessage) ? oMessageModel : null;
	};

	module.exports = MessageSimpleModel;

}());