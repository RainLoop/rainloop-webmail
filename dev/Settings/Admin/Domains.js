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
	}

	createDomain() {
		showScreenPopup(DomainPopupView);
	}

	createDomainAlias() {
		showScreenPopup(DomainAliasPopupView);
	}

	deleteDomain(domain) {
		DomainAdminStore.remove(domain);
		Remote.domainDelete(DomainAdminStore.fetch, domain.name);
	}

	disableDomain(domain) {
		domain.disabled(!domain.disabled());
		Remote.domainDisable(DomainAdminStore.fetch, domain.name, domain.disabled());
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.b-admin-domains-list-table .e-action', oDom);
			el && ko.dataFor(el) && Remote.domain(
				(iError, oData) => iError || showScreenPopup(DomainPopupView, [oData.Result]), ko.dataFor(el).name
			);
		});

		DomainAdminStore.fetch();
	}
}
