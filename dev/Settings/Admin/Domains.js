
var
	_ = require('_'),
	ko = require('ko'),

	Enums = require('Common/Enums'),

	DomainStore = require('Stores/Admin/Domain'),
	Remote = require('Remote/Admin/Ajax');

/**
 * @constructor
 */
function DomainsAdminSettings()
{
	this.domains = DomainStore.domains;

	this.visibility = ko.computed(function() {
		return this.domains.loading() ? 'visible' : 'hidden';
	}, this);

	this.domainForDeletion = ko.observable(null).deleteAccessHelper();

	this.onDomainListChangeRequest = _.bind(this.onDomainListChangeRequest, this);
	this.onDomainLoadRequest = _.bind(this.onDomainLoadRequest, this);
}

DomainsAdminSettings.prototype.createDomain = function()
{
	require('Knoin/Knoin').showScreenPopup(require('View/Popup/Domain'));
};

DomainsAdminSettings.prototype.createDomainAlias = function()
{
	require('Knoin/Knoin').showScreenPopup(require('View/Popup/DomainAlias'));
};

DomainsAdminSettings.prototype.deleteDomain = function(oDomain)
{
	this.domains.remove(oDomain);
	Remote.domainDelete(this.onDomainListChangeRequest, oDomain.name);
};

DomainsAdminSettings.prototype.disableDomain = function(oDomain)
{
	oDomain.disabled(!oDomain.disabled());
	Remote.domainDisable(this.onDomainListChangeRequest, oDomain.name, oDomain.disabled());
};

DomainsAdminSettings.prototype.onBuild = function(oDom)
{
	var self = this;
	oDom
		.on('click', '.b-admin-domains-list-table .e-item .e-action', function() {
			var oDomainItem = ko.dataFor(this);
			if (oDomainItem)
			{
				Remote.domain(self.onDomainLoadRequest, oDomainItem.name);
			}
		});

	require('App/Admin').default.reloadDomainList();
};

DomainsAdminSettings.prototype.onDomainLoadRequest = function(sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Domain'), [oData.Result]);
	}
};

DomainsAdminSettings.prototype.onDomainListChangeRequest = function()
{
	require('App/Admin').default.reloadDomainList();
};

module.exports = DomainsAdminSettings;
