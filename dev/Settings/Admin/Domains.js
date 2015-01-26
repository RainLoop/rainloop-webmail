
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),

		PopupsDomainViewModel = require('View/Popup/Domain'),

		DomainStore = require('Stores/Admin/Domain'),
		Remote = require('Storage/Admin/Remote')
	;

	/**
	 * @constructor
	 */
	function DomainsAdminSettings()
	{
		this.domains = DomainStore.collection;

		this.iDomainForDeletionTimeout = 0;

		this.visibility = ko.computed(function () {
			return this.domains.loading() ? 'visible' : 'hidden';
		}, this);

		this.domainForDeletion = ko.observable(null).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
					this.startDomainForDeletionTimeout();
				}
			}
		]});
	}

	DomainsAdminSettings.prototype.startDomainForDeletionTimeout = function ()
	{
		var self = this;
		window.clearInterval(this.iDomainForDeletionTimeout);
		this.iDomainForDeletionTimeout = window.setTimeout(function () {
			self.domainForDeletion(null);
		}, 1000 * 3);
	};

	DomainsAdminSettings.prototype.createDomain = function ()
	{
		require('Knoin/Knoin').showScreenPopup(PopupsDomainViewModel);
	};

	DomainsAdminSettings.prototype.deleteDomain = function (oDomain)
	{
		this.domains.remove(oDomain);
		Remote.domainDelete(_.bind(this.onDomainListChangeRequest, this), oDomain.name);
	};

	DomainsAdminSettings.prototype.disableDomain = function (oDomain)
	{
		oDomain.disabled(!oDomain.disabled());
		Remote.domainDisable(_.bind(this.onDomainListChangeRequest, this), oDomain.name, oDomain.disabled());
	};

	DomainsAdminSettings.prototype.onBuild = function (oDom)
	{
		var self = this;
		oDom
			.on('click', '.b-admin-domains-list-table .e-item .e-action', function () {
				var oDomainItem = ko.dataFor(this);
				if (oDomainItem)
				{
					Remote.domain(_.bind(self.onDomainLoadRequest, self), oDomainItem.name);
				}
			})
		;

		require('App/Admin').reloadDomainList();
	};

	DomainsAdminSettings.prototype.onDomainLoadRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			require('Knoin/Knoin').showScreenPopup(PopupsDomainViewModel, [oData.Result]);
		}
	};

	DomainsAdminSettings.prototype.onDomainListChangeRequest = function ()
	{
		require('App/Admin').reloadDomainList();
	};

	module.exports = DomainsAdminSettings;

}());