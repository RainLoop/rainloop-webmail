import ko from 'ko';

import { StorageResultType } from 'Common/Enums';
import { showScreenPopup } from 'Knoin/Knoin';

import DomainStore from 'Stores/Admin/Domain';
import Remote from 'Remote/Admin/Fetch';

export class DomainsAdminSettings {
	constructor() {
		this.domains = DomainStore.domains;

		this.visibility = ko.computed(() => (this.domains.loading() ? 'visible' : 'hidden'));

		this.domainForDeletion = ko.observable(null).deleteAccessHelper();

		this.onDomainListChangeRequest = this.onDomainListChangeRequest.bind(this);
		this.onDomainLoadRequest = this.onDomainLoadRequest.bind(this);
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
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.b-admin-domains-list-table .e-item .e-action', oDom);
			el && ko.dataFor(el) && Remote.domain(this.onDomainLoadRequest, ko.dataFor(el).name);
		});

		rl.app.reloadDomainList();
	}

	onDomainLoadRequest(sResult, oData) {
		if (StorageResultType.Success === sResult && oData && oData.Result) {
			showScreenPopup(require('View/Popup/Domain'), [oData.Result]);
		}
	}

	onDomainListChangeRequest() {
		rl.app.reloadDomainList();
	}
}
