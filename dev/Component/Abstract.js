
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
		return {
			viewModel: {
				createViewModel: function(oParams, oCmponentInfo) {

					oParams = oParams || {};
					oParams.element = null;

					if (oCmponentInfo.element)
					{
						oParams.element = $(oCmponentInfo.element);

						require('Common/Translator').i18nToNodes(oParams.element);

						if (!Utils.isUnd(oParams.inline) && ko.unwrap(oParams.inline))
						{
							oParams.element.css('display', 'inline-block');
						}
					}

					return new ClassObject(oParams);
				}
			},
			template: {
				element: sTemplateID
			}
		};
	};

	module.exports = AbstractComponent;

}());
