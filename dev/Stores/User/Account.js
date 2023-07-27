import { addObservablesTo, koArrayWithDestroy } from 'External/ko';

export const AccountUserStore = koArrayWithDestroy();

AccountUserStore.loading = ko.observable(false).extend({ debounce: 100 });

AccountUserStore.getEmailAddresses = () => AccountUserStore.map(item => item.email);

addObservablesTo(AccountUserStore, {
	email: '',
	signature: ''
});
