
import _ from '_';
import ko from 'ko';

import {StorageResultType} from 'Common/Enums';
import {showScreenPopup} from 'Knoin/Knoin';

import DomainStore from 'Stores/Admin/Domain';
import Remote from 'Remote/Admin/Ajax';

class DomainsAdminSettings
{
	constructor() {
		this.domains = DomainStore.domains;

		this.visibility = ko.computed(() => (this.domains.loading() ? 'visible' : 'hidden'));

		this.domainForDeletion = ko.observable(null).deleteAccessHelper();

		this.onDomainListChangeRequest = _.bind(this.onDomainListChangeRequest, this);
		this.onDomainLoadRequest = _.bind(this.onDomainLoadRequest, this);
	}

	createDomain() {
		showScreenPopup(require('View/Popup/Domain'));
	}

	createDomainAlias() {
		showScreenPopup(require('View/Popup/DomainAlias'));
	}

	deleteDomain(domain) {
		this.domains.remove(domain);
		Remote.domainDelete(this.onDomainListChangeRequest, domain.name);
	}

	disableDomain(domain) {
		domain.disabled(!domain.disabled());
		Remote.domainDisable(this.onDomainListChangeRequest, domain.name, domain.disabled());
	}

	onBuild(oDom) {
		const self = this;
		oDom
			.on('click', '.b-admin-domains-list-table .e-item .e-action', function() {
				const domainItem = ko.dataFor(this);
				if (domainItem)
				{
					Remote.domain(self.onDomainLoadRequest, domainItem.name);
				}
			});

		require('App/Admin').default.reloadDomainList();
	}

	onDomainLoadRequest(sResult, oData) {
		if (StorageResultType.Success === sResult && oData && oData.Result)
		{
			showScreenPopup(require('View/Popup/Domain'), [oData.Result]);
		}
	}

	onDomainListChangeRequest() {
		require('App/Admin').default.reloadDomainList();
	}
}

export {DomainsAdminSettings, DomainsAdminSettings as default};
