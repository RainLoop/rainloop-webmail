
import {_} from 'common';
import ko from 'ko';

class IdentityUserStore
{
	constructor()
	{
		this.identities = ko.observableArray([]);
		this.identities.loading = ko.observable(false).extend({throttle: 100});

		this.identitiesIDS = ko.computed(() => {
			return _.compact(_.map(this.identities(), (item) => item ? item.id : null));
		}, this);
	}
}

module.exports = new IdentityUserStore();
