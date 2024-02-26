import { addObservablesTo, koArrayWithDestroy } from 'External/ko';
import Remote from 'Remote/User/Fetch';

export const SMimeUserStore = koArrayWithDestroy();

addObservablesTo(SMimeUserStore, {
	loading: false
});

SMimeUserStore.loadCertificates = () => {
	SMimeUserStore([]);
	SMimeUserStore.loading(true);
	Remote.request('SMimeGetCertificates', (iError, oData) => {
		SMimeUserStore.loading(false);
		const collator = new Intl.Collator(undefined, {sensitivity: 'base'});
		iError || SMimeUserStore(oData.Result.sort(
			(a, b) => collator.compare(a.emailAddress, b.emailAddress) || (b.validTo_time_t - a.validTo_time_t)
		));
	});
};
