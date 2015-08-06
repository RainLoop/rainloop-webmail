
(function () {

	'use strict';

	var
		ko = require('ko'),

		Translator = require('Common/Translator'),

		TemplateStore = require('Stores/User/Template'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function TemplatesUserSettings()
	{
		this.templates = TemplateStore.templates;

		this.processText = ko.computed(function () {
			return TemplateStore.templates.loading() ? Translator.i18n('SETTINGS_TEMPLETS/LOADING_PROCESS') : '';
		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.templateForDeletion = ko.observable(null).deleteAccessHelper();
	}

	TemplatesUserSettings.prototype.scrollableOptions = function (sWrapper)
	{
		return {
			handle: '.drag-handle',
			containment: sWrapper || 'parent',
			axis: 'y'
		};
	};

	TemplatesUserSettings.prototype.addNewTemplate = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Template'));
	};

	TemplatesUserSettings.prototype.editTemplate = function (oTemplateItem)
	{
		if (oTemplateItem)
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/Template'), [oTemplateItem]);
		}
	};

	/**
	 * @param {AccountModel} oTemplateToRemove
	 */
	TemplatesUserSettings.prototype.deleteTemplate = function (oTemplateToRemove)
	{
		if (oTemplateToRemove && oTemplateToRemove.deleteAccess())
		{
			this.templateForDeletion(null);

			var
				self = this,
				fRemoveAccount = function (oAccount) {
					return oTemplateToRemove === oAccount;
				}
			;

			if (oTemplateToRemove)
			{
				this.templates.remove(fRemoveAccount);

				Remote.templateDelete(function () {
					self.reloadTemplates();
				}, oTemplateToRemove.id);
			}
		}
	};

	TemplatesUserSettings.prototype.reloadTemplates = function ()
	{
		require('App/User').templates();
	};

	TemplatesUserSettings.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.templates-list .template-item .e-action', function () {
				var oTemplateItem = ko.dataFor(this);
				if (oTemplateItem)
				{
					self.editTemplate(oTemplateItem);
				}
			})
		;

		this.reloadTemplates();
	};

	module.exports = TemplatesUserSettings;

}());