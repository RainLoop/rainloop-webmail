import { koArrayWithDestroy } from 'External/ko';

export const IdentityUserStore = koArrayWithDestroy();

IdentityUserStore.getIDS = () => IdentityUserStore.map(item => (item ? item.id() : null))
	.filter(value => null !== value);
IdentityUserStore.loading = ko.observable(false).extend({ debounce: 100 });
