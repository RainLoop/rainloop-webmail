import ko from 'ko';

import { showScreenPopup } from 'Knoin/Knoin';

import { DomainAdminStore } from 'Stores/Admin/Domain';
import Remote from 'Remote/Admin/Fetch';

import { DomainPopupView } from 'View/Popup/Domain';
import { DomainAliasPopupView } from 'View/Popup/DomainAlias';

export class DomainsAdminSettings {
	constructor() {
		this.domains = DomainAdminStore;

		this.domainForDeletion = ko.observable(null).deleteAccessHelper();

		this.onDomainListChangeRequest = this.onDomainListChangeRequest.bind(this);
		this.onDomainLoadRequest = this.onDomainLoadRequest.bind(this);
	}

	createDomain() {
		showScreenPopup(DomainPopupView);
	}

	createDomainAlias() {
		showScreenPopup(DomainAliasPopupView);
	}

	deleteDomain(domain) {
		DomainAdminStore.remove(domain);
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

		DomainAdminStore.fetch();
	}

	onDomainLoadRequest(iError, oData) {
		if (!iError && oData && oData.Result) {
			showScreenPopup(DomainPopupView, [oData.Result]);
		}
	}

	onDomainListChangeRequest() {
		DomainAdminStore.fetch();
	}
}
