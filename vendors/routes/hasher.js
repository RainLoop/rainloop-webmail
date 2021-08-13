/*!!
 * Hasher <http://github.com/millermedeiros/hasher>
 * @author Miller Medeiros
 * @version 1.1.2 (2012/10/31 03:19 PM)
 * Released under the MIT License
 */

(global => {

    //--------------------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------------------

    var _hash, _bindings = [];

    const
    _hashValRegexp = /#(.*)$/,
    _hashRegexp = /^#/,
    _hashTrim = /^\/|\$/g,
    _trimHash = hash => hash ? hash.replace(_hashTrim, '') : '',
    _getWindowHash = () => {
        //parsed full URL instead of getting window.location.hash because Firefox decode hash value (and all the other browsers don't)
        //also because of IE8 bug with hash query in local file [issue #6]
        var result = _hashValRegexp.exec( location.href );
        return (result && result[1]) ? decodeURIComponent(result[1]) : '';
    },
    _registerChange = newHash => {
        if (_hash !== newHash) {
            var oldHash = _hash;
            _hash = newHash; //should come before event dispatch to make sure user can get proper value inside event handler
            hasher.dispatch(_trimHash(newHash), _trimHash(oldHash));
        }
    },
    _checkHistory = () => {
        var windowHash = _getWindowHash();
        if (windowHash !== _hash) {
            _registerChange(windowHash);
        }
    },
    _setHash = (path, replace) => {
        path = path.join('/');
        path = path ? '/' + path.replace(_hashRegexp, '') : path;
        if (path !== _hash){
            // we should store raw value
            _registerChange(path);
            if (path === _hash) {
                // we check if path is still === _hash to avoid error in
                // case of multiple consecutive redirects [issue #39]
                replace
                    ? location.replace('#' + encodeURI(path))
                    : (location.hash = '#' + encodeURI(path));
            }
        }
    },

    //--------------------------------------------------------------------------------------
    // Public (API)
    //--------------------------------------------------------------------------------------

    hasher = /** @lends hasher */ {

        /**
         * Signal dispatched when hash value changes.
         * - pass current hash as 1st parameter to listeners and previous hash value as 2nd parameter.
         * @type signals.Signal
         */
        active : true,
        add : callback => _bindings.push(callback),
        dispatch : (...args) => hasher.active && _bindings.forEach(callback => callback(...args)),

        /**
         * Start listening/dispatching changes in the hash/history.
         * <ul>
         *   <li>hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons before calling this method.</li>
         * </ul>
         */
        init : () => {
            hasher.init = ()=>0;
            _hash = _getWindowHash();

            //thought about branching/overloading hasher.init() to avoid checking multiple times but
            //don't think worth doing it since it probably won't be called multiple times.
            addEventListener('hashchange', _checkHistory);

            hasher.dispatch(_trimHash(_hash));
        },

        /**
         * Set Hash value, generating a new history record.
         * @param {...string} path    Hash value without '#'.
         * @example hasher.setHash('lorem', 'ipsum', 'dolor') -> '#/lorem/ipsum/dolor'
         */
        setHash : (...path) => _setHash(path),

        /**
         * Set Hash value without keeping previous hash on the history record.
         * Similar to calling `window.location.replace("#/hash")` but will also work on IE6-7.
         * @param {...string} path    Hash value without '#'.
         * @example hasher.replaceHash('lorem', 'ipsum', 'dolor') -> '#/lorem/ipsum/dolor'
         */
        replaceHash : (...path) => _setHash(path, true)
    };

    global.hasher = hasher;
})(this);
