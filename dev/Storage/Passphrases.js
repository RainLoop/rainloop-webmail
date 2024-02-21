import { AskPopupView } from 'View/Popup/Ask';

export const Passphrases = new WeakMap();

Passphrases.ask = async (key, sAskDesc, btnText) =>
	Passphrases.has(key)
		? {password:Passphrases.get(key)/*, remember:false*/}
		: await AskPopupView.password(sAskDesc, btnText);
