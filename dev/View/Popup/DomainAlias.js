
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),

		Translator = require('Common/Translator'),

		DomainStore = require('Stores/Admin/Domain'),

		Remote = require('Remote/Admin/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function DomainAliasPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsDomainAlias');

		this.saving = ko.observable(false);
		this.savingError = ko.observable('');

		this.name = ko.observable('');
		this.name.focused = ko.observable(false);

		this.alias = ko.observable('');

		this.domains = DomainStore.domainsWithoutAliases;

		this.domainsOptions = ko.computed(function () {
			return _.map(this.domains(), function(item) {
				return {
					optValue: item.name,
					optText: item.name
				};
			});
		}, this);

		this.canBeSaved = ko.computed(function () {
			return !this.saving() && '' !== this.name() && '' !== this.alias();
		}, this);

		this.createCommand = Utils.createCommand(this, function () {
			this.saving(true);
			Remote.createDomainAlias(
				_.bind(this.onDomainAliasCreateOrSaveResponse, this),
				this.name(),
				this.alias()
			);
		}, this.canBeSaved);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/DomainAlias', 'PopupsDomainAliasViewModel'], DomainAliasPopupView);
	_.extend(DomainAliasPopupView.prototype, AbstractView.prototype);

	DomainAliasPopupView.prototype.onDomainAliasCreateOrSaveResponse = function (sResult, oData)
	{
		this.saving(false);
		if (Enums.StorageResultType.Success === sResult && oData)
		{
			if (oData.Result)
			{
				require('App/Admin').default.reloadDomainList();
				this.closeCommand();
			}
			else if (Enums.Notification.DomainAlreadyExists === oData.ErrorCode)
			{
				this.savingError(Translator.i18n('ERRORS/DOMAIN_ALREADY_EXISTS'));
			}
		}
		else
		{
			this.savingError(Translator.i18n('ERRORS/UNKNOWN_ERROR'));
		}
	};

	DomainAliasPopupView.prototype.onShow = function ()
	{
		this.clearForm();
	};

	DomainAliasPopupView.prototype.onShowWithDelay = function ()
	{
		if ('' === this.name() && !Globals.bMobile)
		{
			this.name.focused(true);
		}
	};

	DomainAliasPopupView.prototype.clearForm = function ()
	{
		this.saving(false);
		this.savingError('');

		this.name('');
		this.name.focused(false);

		this.alias('');
	};

	module.exports = DomainAliasPopupView;

}());