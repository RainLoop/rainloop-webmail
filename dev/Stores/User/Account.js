import { addObservablesTo, koArrayWithDestroy } from 'External/ko';

export const AccountUserStore = koArrayWithDestroy();

AccountUserStore.getEmailAddresses = () => AccountUserStore.map(item => item.email);

addObservablesTo(AccountUserStore, {
	email: '',
	loading: false
});
