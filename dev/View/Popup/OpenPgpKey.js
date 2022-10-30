import { addObservablesTo } from 'External/ko';
import { doc, addShortcut } from 'Common/Globals';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class OpenPgpKeyPopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpKey');

		addObservablesTo(this, {
			key: '',
			keyDom: null
		});
	}

	selectKey() {
		const el = this.keyDom();
		if (el) {
			let sel = getSelection(),
				range = doc.createRange();
			sel.removeAllRanges();
			range.selectNodeContents(el);
			sel.addRange(range);
		}
		if (navigator.clipboard) {
			navigator.clipboard.writeText(this.key()).then(
				() => console.log('Copied to clipboard'),
				err => console.error(err)
			);
		}
	}

	onShow(openPgpKey) {
		// TODO: show more info
		this.key(openPgpKey ? openPgpKey.armor : '');
/*
		this.key = key;
		const aEmails = [];
		if (key.users) {
			key.users.forEach(user => user.userID.email && aEmails.push(user.userID.email));
		}
		this.id = key.getKeyID().toHex();
		this.fingerprint = key.getFingerprint();
		this.can_encrypt = !!key.getEncryptionKey();
		this.can_sign = !!key.getSigningKey();
		this.emails = aEmails;
		this.armor = armor;
		this.askDelete = ko.observable(false);
		this.openForDeletion = ko.observable(null).askDeleteHelper();

		key.id = key.subkeys[0].keyid;
		key.fingerprint = key.subkeys[0].fingerprint;
		key.uids.forEach(uid => uid.email && aEmails.push(uid.email));
		key.emails = aEmails;
		"disabled": false,
		"expired": false,
		"revoked": false,
		"is_secret": true,
		"can_sign": true,
		"can_decrypt": true
		"can_verify": true
		"can_encrypt": true,
		"uids": [
			{
				"name": "demo",
				"comment": "",
				"email": "demo@snappymail.eu",
				"uid": "demo <demo@snappymail.eu>",
				"revoked": false,
				"invalid": false
			}
		],
		"subkeys": [
			{
				"fingerprint": "2C223F20EA2ADB4CB68F81D95F3A5CDC09AD8AE3",
				"keyid": "5F3A5CDC09AD8AE3",
				"timestamp": 1643381672,
				"expires": 0,
				"is_secret": false,
				"invalid": false,
				"can_encrypt": false,
				"can_sign": true,
				"disabled": false,
				"expired": false,
				"revoked": false,
				"can_certify": true,
				"can_authenticate": false,
				"is_qualified": false,
				"is_de_vs": false,
				"pubkey_algo": 303,
				"length": 256,
				"keygrip": "5A1A6C7310D0508C68E8E74F15068301E83FD1AE",
				"is_cardkey": false,
				"curve": "ed25519"
			},
			{
				"fingerprint": "3CD720549D8833872C267D08F1230DCE2A561ADE",
				"keyid": "F1230DCE2A561ADE",
				"timestamp": 1643381672,
				"expires": 0,
				"is_secret": false,
				"invalid": false,
				"can_encrypt": true,
				"can_sign": false,
				"disabled": false,
				"expired": false,
				"revoked": false,
				"can_certify": false,
				"can_authenticate": false,
				"is_qualified": false,
				"is_de_vs": false,
				"pubkey_algo": 302,
				"length": 256,
				"keygrip": "886921A7E06BE56F8E8C51797BB476BB26DF21BF",
				"is_cardkey": false,
				"curve": "cv25519"
			}
		]
*/
	}

	onBuild() {
		addShortcut('a', 'meta', 'OpenPgpKey', () => {
			this.selectKey();
			return false;
		});
	}
}
