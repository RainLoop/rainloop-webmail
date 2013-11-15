/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminDomains()
{
	var oData = RL.data();
	
	this.domains = oData.domains;
	this.domainsLoading = oData.domainsLoading;
	
	this.iDomainForDeletionTimeout = 0;

	this.visibility = ko.computed(function () {
		return oData.domainsLoading() ? 'visible' : 'hidden';
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

Utils.addSettingsViewModel(AdminDomains, 'AdminSettingsDomains', 'Domains', 'domains');

AdminDomains.prototype.startDomainForDeletionTimeout = function ()
{
	var self = this;
	window.clearInterval(this.iDomainForDeletionTimeout);
	this.iDomainForDeletionTimeout = window.setTimeout(function () {
		self.domainForDeletion(null);
	}, 1000 * 3);
};

AdminDomains.prototype.createDomain = function ()
{
	kn.showScreenPopup(PopupsDomainViewModel);
};

AdminDomains.prototype.deleteDomain = function (oDomain)
{
	this.domains.remove(oDomain);
	RL.remote().domainDelete(_.bind(this.onDomainListChangeRequest, this), oDomain.name);
};

AdminDomains.prototype.disableDomain = function (oDomain)
{
	oDomain.disabled(!oDomain.disabled());
	RL.remote().domainDisable(_.bind(this.onDomainListChangeRequest, this), oDomain.name, oDomain.disabled());
};

AdminDomains.prototype.onBuild = function (oDom)
{
	var self = this;
	oDom
		.on('click', '.b-admin-domains-list-table .e-item .e-action', function () {
			var oDomainItem = ko.dataFor(this);
			if (oDomainItem)
			{
				RL.remote().domain(_.bind(self.onDomainLoadRequest, self), oDomainItem.name);
			}
		})
	;
	
	RL.reloadDomainList();
};

AdminDomains.prototype.onDomainLoadRequest = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		kn.showScreenPopup(PopupsDomainViewModel, [oData.Result]);
	}
};

AdminDomains.prototype.onDomainListChangeRequest = function ()
{
	RL.reloadDomainList();
};
