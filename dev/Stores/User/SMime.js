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
		iError || SMimeUserStore(oData.Result);
	});
};
