/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function OpenPgpLocalStorageDriver()
{
}

/*
 * Declare the localstore itemname
 */
OpenPgpLocalStorageDriver.prototype.item = 'armoredRainLoopKeys';

/**
 * Load the keyring from HTML5 local storage and initializes this instance.
 * @return {Array<module:key~Key>} array of keys retrieved from localstore
 */
OpenPgpLocalStorageDriver.prototype.load = function ()
{
	var
		iIndex = 0,
		iLen = 0,
		aKeys = [],
		aArmoredKeys = JSON.parse(window.localStorage.getItem(this.item))
	;

	if (aArmoredKeys && 0 < aArmoredKeys.length)
	{
		for (iLen = aArmoredKeys.length; iIndex < iLen; iIndex++)
		{
			aKeys.push(
				window.openpgp.key.readArmored(aArmoredKeys[iIndex]).keys[0]
			);
		}
	}
	
	return aKeys;
};

/**
 * Saves the current state of the keyring to HTML5 local storage.
 * The privateKeys array and publicKeys array gets Stringified using JSON
 * @param {Array<module:key~Key>} aKeys array of keys to save in localstore
 */
OpenPgpLocalStorageDriver.prototype.store = function (aKeys)
{
	var
		iIndex = 0,
		iLen = aKeys.length,
		aArmoredKeys = []
	;
	
	for (; iIndex < iLen; iIndex++)
	{
		aArmoredKeys.push(aKeys[iIndex].armor());
	}
	
	window.localStorage.setItem(this.item, JSON.stringify(aArmoredKeys));
};
