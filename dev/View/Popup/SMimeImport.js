import { addObservablesTo } from 'External/ko';
import { getNotification } from 'Common/Translator';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import Remote from 'Remote/User/Fetch';

export class SMimeImportPopupView extends AbstractViewPopup {
	constructor() {
		super('SMimeImport');

		addObservablesTo(this, {
			pem: '',
			pemError: false,
			pemErrorMessage: '',
			pemValid: false
		});

		this.pem.subscribe(value => {
			this.pemError(false);
			this.pemErrorMessage('');
			this.pemValid(value && value.includes('-----BEGIN CERTIFICATE-----'));
		});
	}

	submitForm() {
		if (this.pemValid()) {
			Remote.request('SMimeImportCertificate',
				(iError, oData) => {
					if (iError) {
						this.pemError(true);
						this.pemErrorMessage(getNotification(iError, oData?.ErrorMessage));
//						oData?.ErrorMessageAdditional;
					} else {
						this.close();
					}
				},
				{pem:this.pem()}
			);
		} else {
			this.pemError(true);
		}
	}

	onShow() {
		this.pem('');
		this.pemError(false);
		this.pemErrorMessage('');
	}
}
