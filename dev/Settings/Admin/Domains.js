import ko from 'ko';

import { showScreenPopup } from 'Knoin/Knoin';

import { DomainAdminStore } from 'Stores/Admin/Domain';
import Remote from 'Remote/Admin/Fetch';

import { DomainPopupView } from 'View/Popup/Domain';
import { DomainAliasPopupView } from 'View/Popup/DomainAlias';

export class AdminSettingsDomains /*extends AbstractViewSettings*/ {
	constructor() {
		this.domains = DomainAdminStore;

		this.domainForDeletion = ko.observable(null).askDeleteHelper();
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
		Remote.request('AdminDomainDelete', DomainAdminStore.fetch, {
			Name: domain.name
		});
	}

	disableDomain(domain) {
		domain.disabled(!domain.disabled());
		Remote.request('AdminDomainDisable', DomainAdminStore.fetch, {
			Name: domain.name,
			Disabled: domain.disabled() ? 1 : 0
		});
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.b-admin-domains-list-table .e-action', oDom);
			el && ko.dataFor(el) && Remote.request('AdminDomainLoad',
				(iError, oData) => iError || showScreenPopup(DomainPopupView, [oData.Result]),
				{
					Name: ko.dataFor(el).name
				}
			);

		});

		DomainAdminStore.fetch();
	}
}
