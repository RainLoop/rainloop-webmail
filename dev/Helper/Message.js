
(function () {

	'use strict';

	var
		Utils = require('Common/Utils'),

		EmailModel = require('Model/Email')
	;

	/**
	 * @constructor
	 */
	function MessageHelper() {}

	/**
	 * @param {Array.<EmailModel>} aEmail
	 * @param {boolean=} bFriendlyView
	 * @param {boolean=} bWrapWithLink = false
	 * @return {string}
	 */
	MessageHelper.prototype.emailArrayToString = function (aEmail, bFriendlyView, bWrapWithLink)
	{
		var
			aResult = [],
			iIndex = 0,
			iLen = 0
		;

		if (Utils.isNonEmptyArray(aEmail))
		{
			for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
			{
				aResult.push(aEmail[iIndex].toLine(bFriendlyView, bWrapWithLink));
			}
		}

		return aResult.join(', ');
	};

	/**
	 * @param {Array.<EmailModel>} aEmails
	 * @return {string}
	 */
	MessageHelper.prototype.emailArrayToStringClear = function (aEmails)
	{
		var
			aResult = [],
			iIndex = 0,
			iLen = 0
			;

		if (Utils.isNonEmptyArray(aEmails))
		{
			for (iIndex = 0, iLen = aEmails.length; iIndex < iLen; iIndex++)
			{
				if (aEmails[iIndex] && aEmails[iIndex].email && '' !== aEmails[iIndex].name)
				{
					aResult.push(aEmails[iIndex].email);
				}
			}
		}

		return aResult.join(', ');
	};

	/**
	 * @param {?Array} aJson
	 * @return {Array.<EmailModel>}
	 */
	MessageHelper.prototype.emailArrayFromJson = function (aJson)
	{
		var
			iIndex = 0,
			iLen = 0,
			oEmailModel = null,
			aResult = []
			;

		if (Utils.isNonEmptyArray(aJson))
		{
			for (iIndex = 0, iLen = aJson.length; iIndex < iLen; iIndex++)
			{
				oEmailModel = EmailModel.newInstanceFromJson(aJson[iIndex]);
				if (oEmailModel)
				{
					aResult.push(oEmailModel);
				}
			}
		}

		return aResult;
	};

	/**
	 * @param {Array.<EmailModel>} aInputEmails
	 * @param {Object} oUnic
	 * @param {Array} aLocalEmails
	 */
	MessageHelper.prototype.replyHelper = function (aInputEmails, oUnic, aLocalEmails)
	{
		if (aInputEmails && 0 < aInputEmails.length)
		{
			var
				iIndex = 0,
				iLen = aInputEmails.length
			;

			for (; iIndex < iLen; iIndex++)
			{
				if (Utils.isUnd(oUnic[aInputEmails[iIndex].email]))
				{
					oUnic[aInputEmails[iIndex].email] = true;
					aLocalEmails.push(aInputEmails[iIndex]);
				}
			}
		}
	};

	module.exports = new MessageHelper();

}());