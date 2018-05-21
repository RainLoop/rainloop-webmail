
import keymaster from 'keymaster';

let key = function(k, scope, method) {
	if (Array.isArray(scope))
	{
		scope.forEach((s) => {
			keymaster(k, s, method);
		});
	}
	else
	{
		keymaster(k, scope, method);
	}
};

key = Object.assign(key, keymaster);

export default key;
