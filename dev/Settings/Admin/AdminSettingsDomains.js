
(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),

		PopupsDomainViewModel = require('View:Popup:Domain'),

		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsDomains()
	{
		this.domains = Data.domains;
		this.domainsLoading = Data.domainsLoading;

		this.iDomainForDeletionTimeout = 0;

		this.visibility = ko.computed(function () {
			return Data.domainsLoading() ? 'visible' : 'hidden';
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

	AdminSettingsDomains.prototype.startDomainForDeletionTimeout = function ()
	{
		var self = this;
		window.clearInterval(this.iDomainForDeletionTimeout);
		this.iDomainForDeletionTimeout = window.setTimeout(function () {
			self.domainForDeletion(null);
		}, 1000 * 3);
	};

	AdminSettingsDomains.prototype.createDomain = function ()
	{
		require('App:Knoin').showScreenPopup(PopupsDomainViewModel);
	};

	AdminSettingsDomains.prototype.deleteDomain = function (oDomain)
	{
		this.domains.remove(oDomain);
		Remote.domainDelete(_.bind(this.onDomainListChangeRequest, this), oDomain.name);
	};

	AdminSettingsDomains.prototype.disableDomain = function (oDomain)
	{
		oDomain.disabled(!oDomain.disabled());
		Remote.domainDisable(_.bind(this.onDomainListChangeRequest, this), oDomain.name, oDomain.disabled());
	};

	AdminSettingsDomains.prototype.onBuild = function (oDom)
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

		require('App:Admin').reloadDomainList();
	};

	AdminSettingsDomains.prototype.onDomainLoadRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			require('App:Knoin').showScreenPopup(PopupsDomainViewModel, [oData.Result]);
		}
	};

	AdminSettingsDomains.prototype.onDomainListChangeRequest = function ()
	{
		require('App:Admin').reloadDomainList();
	};

	module.exports = AdminSettingsDomains;

}(module, require));