import { addObservablesTo, koArrayWithDestroy } from 'External/ko';

export const AccountUserStore = koArrayWithDestroy();

addObservablesTo(AccountUserStore, {
	email: '',
	loading: false
});
