import ko from 'ko';

export const IdentityUserStore = ko.observableArray();

IdentityUserStore.getIDS = () => IdentityUserStore.map(item => (item ? item.id() : null))
	.filter(value => null !== value);
IdentityUserStore.loading = ko.observable(false).extend({ debounce: 100 });
