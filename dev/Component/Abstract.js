
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function AbstractComponent()
	{
		this.disposable = [];
	}

	/**
	 * @type {Array}
	 */
	AbstractComponent.prototype.disposable = [];

	AbstractComponent.prototype.dispose = function ()
	{
		_.each(this.disposable, function (fFuncToDispose) {
			if (fFuncToDispose && fFuncToDispose.dispose)
			{
				fFuncToDispose.dispose();
			}
		});
	};

	/**
	 * @param {*} ClassObject
	 * @param {string} sTemplateID
	 * @return {Object}
	 */
	AbstractComponent.componentExportHelper = function (ClassObject, sTemplateID) {
		var oComponent = {
			viewModel: {
				createViewModel: function(oParams, oComponentInfo) {

					oParams = oParams || {};
					oParams.element = null;

					if (oComponentInfo.element)
					{
						oParams.component = oComponentInfo;
						oParams.element = $(oComponentInfo.element);

						require('Common/Translator').i18nToNodes(oParams.element);

						if (!Utils.isUnd(oParams.inline) && ko.unwrap(oParams.inline))
						{
							oParams.element.css('display', 'inline-block');
						}
					}

					return new ClassObject(oParams);
				}
			}
		};

		oComponent['template'] = sTemplateID ? {
			element: sTemplateID
		} : '<b></b>';

		return oComponent;
	};

	module.exports = AbstractComponent;

}());
