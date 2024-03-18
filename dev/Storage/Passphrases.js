import { AskPopupView } from 'View/Popup/Ask';

export const Passphrases = new WeakMap();

Passphrases.ask = async (key, sAskDesc, btnText) =>
	Passphrases.has(key)
		? {password:Passphrases.handle(key)/*, remember:false*/}
		: await AskPopupView.password(sAskDesc, btnText);

const timeouts = {};
// get/set accessor to control deletion after 15 minutes of inactivity
Passphrases.handle = (key, pass) => {
	if (!timeouts[key]) {
		timeouts[key] = (()=>Passphrases.delete(key)).debounce(900000);
	}
	pass && Passphrases.set(key, pass);
	timeouts[key]();
	return Passphrases.get(key);
};
