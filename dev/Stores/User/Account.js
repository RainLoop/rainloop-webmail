import { addObservablesTo, koArrayWithDestroy } from 'External/ko';

export const AccountUserStore = {
	accounts: koArrayWithDestroy(),
	loading: ko.observable(false).extend({ debounce: 100 }),

	getEmailAddresses: () => AccountUserStore.accounts.map(item => item.email)
};

addObservablesTo(AccountUserStore, {
	email: '',
	signature: ''
});
