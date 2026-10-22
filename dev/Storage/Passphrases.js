import { AskPopupView } from 'View/Popup/Ask';
import { SettingsUserStore } from 'Stores/User/Settings';
import { SettingsGet } from '../Common/Globals';
import { isArray } from '../Common/Utils';

export const Passphrases = new WeakMap();

Passphrases.ask = async (key, sAskDesc, btnText) => {
	if (Passphrases.has(key)) {
		return { password: Passphrases.handle(key)/*, remember:false*/ };
	} else if (Passphrases.hasInLocalStorage(key)) {
		return { password: await getFromLocalStorage(key) };
	} else {
		const pass = await AskPopupView.password(sAskDesc, btnText,
			window.crypto.subtle && canUseLocalStorage(key) ? 0b1101 : 0b0101);
		pass.rememberPermanent && await saveToLocalStorage(key, pass.password);
		return pass;
	}
};

Passphrases._deleteFromSession = Passphrases.delete;

const timeouts = {};
// get/set accessor to control deletion after N minutes of inactivity
Passphrases.handle = (key, pass) => {
	const timeout = SettingsUserStore.keyPassForget();
	if (timeout && !timeouts[key]) {
		timeouts[key] = (() => Passphrases._deleteFromSession(key)).debounce(timeout * 60 * 1000);
	}
	pass && Passphrases.set(key, pass);
	timeout && timeouts[key]();
	return Passphrases.get(key);
};

const deleteFromLocalStorage = (key) => {
	const keyId = getKeyId(key);
	if (keyId) {
		localStorage.removeItem(keyId);
	}
};
Passphrases.delete = (key) => {
	deleteFromLocalStorage(key);
	return Passphrases._deleteFromSession(key);
};

Passphrases.hasInLocalStorage = (key) => {
	const keyId = getKeyId(key);
	return keyId && localStorage.getItem(keyId) !== null;
};

const saveToLocalStorage = async (key, pass) => {
	const keyId = getKeyId(key);
	if (!keyId) {
		return;
	}

	if (!pass) {
		localStorage.removeItem(keyId);
		return;
	}

	try {
		const salt = window.crypto.getRandomValues(new Uint8Array(16));
		const derivedKey = await deriveKeyFromHash(SettingsGet('accountHash'), salt);

		const iv = window.crypto.getRandomValues(new Uint8Array(12));
		const encrypted = await window.crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: iv },
			derivedKey,
			new TextEncoder().encode(pass)
		);
		localStorage.setItem(keyId, JSON.stringify([
			btoa(String.fromCharCode.apply(null, salt)),
			btoa(String.fromCharCode.apply(null, iv)),
			btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)))
		]));
	} catch (e) {
		console.error('Passphrases.saveToLocalStorage failed', e);
	}
};

const getFromLocalStorage = async (key) => {
	const keyId = getKeyId(key);
	if (!keyId) {
		return undefined;
	}

	const jsonData = localStorage.getItem(keyId);
	if (!jsonData) {
		console.error('Passphrases.getFromLocalStorage failed: no data found');
		return undefined;
	}

	try {
		const saltIvData = JSON.parse(jsonData);
		if (!saltIvData || !isArray(saltIvData) || saltIvData.length !== 3) {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error('invalid passphrase data');
		}
		const toUint8 = (str) => new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));

		const derivedKey = await deriveKeyFromHash(SettingsGet('accountHash'), toUint8(saltIvData[0]));
		const decrypted = await window.crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: toUint8(saltIvData[1])
			},
			derivedKey,
			toUint8(saltIvData[2])
		);
		return String.fromCharCode.apply(null, new Uint8Array(decrypted));
	} catch (e) {
		localStorage.removeItem(keyId);
		console.error('Passphrases.getFromLocalStorage failed', e);
		return undefined;
	}
};

const canUseLocalStorage = (key) => getKeyId(key) !== undefined;

const getKeyId = (key) => {
	if (key && typeof key.id === 'string' && key.id.length > 4 && typeof key.forgetPass === 'function') {
		// only deal with keys that we can forget (OpenPGB, GnuPG)
		return key.id + '_local_key';
	} else {
		console.info('Passphrases.getKeyId: unsupported key type');
		return undefined;
	}
};

const deriveKeyFromHash = async (hash, salt) => {
	if (!hash) {
		throw new Error('empty accountHash');
	}
	return window.crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(hash),
		{ 'name': 'PBKDF2' },
		false,
		['deriveKey']
	).then(keyMaterial => {
		return window.crypto.subtle.deriveKey(
			{
				'name': 'PBKDF2',
				'salt': salt,
				'iterations': 512,
				'hash': 'SHA-256'
			},
			keyMaterial,
			{ 'name': 'AES-GCM', 'length': 256 },
			false,
			['encrypt', 'decrypt']
		);
	});
};
