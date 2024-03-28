import { koArrayWithDestroy } from 'External/ko';

export const IdentityUserStore = koArrayWithDestroy();

IdentityUserStore.loading = ko.observable(false).extend({ debounce: 100 });
