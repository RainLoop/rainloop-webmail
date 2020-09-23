/*!!
 * Hasher <http://github.com/millermedeiros/hasher>
 * @author Miller Medeiros
 * @version 1.1.2 (2012/10/31 03:19 PM)
 * Released under the MIT License
 */

(global => {

    //--------------------------------------------------------------------------------------
    // Private Vars
    //--------------------------------------------------------------------------------------

    var
        // local storage for brevity and better compression --------------------------------

        Signal = signals.Signal,

        // local vars ----------------------------------------------------------------------

        _hash,
        _isActive,
        _hashValRegexp = /#(.*)$/,
        _hashRegexp = /^#/;


    //--------------------------------------------------------------------------------------
    // Private Methods
    //--------------------------------------------------------------------------------------

    const _trimHash = hash => hash ? hash.replace(new RegExp('^\\/|\\$', 'g'), '') : '',
    _getWindowHash = () => {
        //parsed full URL instead of getting window.location.hash because Firefox decode hash value (and all the other browsers don't)
        //also because of IE8 bug with hash query in local file [issue #6]
        var result = _hashValRegexp.exec( global.location.href );
        return (result && result[1])? decodeURIComponent(result[1]) : '';
    },
    _registerChange = newHash => {
        if(_hash !== newHash){
            var oldHash = _hash;
            _hash = newHash; //should come before event dispatch to make sure user can get proper value inside event handler
            hasher.changed.dispatch(_trimHash(newHash), _trimHash(oldHash));
        }
    },
    _checkHistory = () => {
        var windowHash = _getWindowHash();
        if (windowHash !== _hash){
            _registerChange(windowHash);
        }
    },
    _makePath = path => {
        path = path.join('/');
        return path ? '/' + path.replace(_hashRegexp, '') : path;
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
        changed : new Signal(),

        /**
         * Signal dispatched when hasher is initialized.
         * - pass current hash as first parameter to listeners.
         * @type signals.Signal
         */
        initialized : new Signal(),

        /**
         * Start listening/dispatching changes in the hash/history.
         * <ul>
         *   <li>hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons before calling this method.</li>
         * </ul>
         */
        init : () => {
            if (!_isActive) {

                _hash = _getWindowHash();

                //thought about branching/overloading hasher.init() to avoid checking multiple times but
                //don't think worth doing it since it probably won't be called multiple times.
                global.addEventListener('hashchange', _checkHistory);

                _isActive = true;
                hasher.initialized.dispatch(_trimHash(_hash));
            }
        },

        /**
         * Stop listening/dispatching changes in the hash/history.
         * <ul>
         *   <li>hasher won't dispatch CHANGE events by manually typing a new value or pressing the back/forward buttons after calling this method, unless you call hasher.init() again.</li>
         *   <li>hasher will still dispatch changes made programatically by calling hasher.setHash();</li>
         * </ul>
         */
        stop : () => {
            if (_isActive) {
                global.removeEventListener('hashchange', _checkHistory);

                _isActive = false;
            }
        },

        /**
         * Set Hash value, generating a new history record.
         * @param {...string} path    Hash value without '#'.
         * @example hasher.setHash('lorem', 'ipsum', 'dolor') -> '#/lorem/ipsum/dolor'
         */
        setHash : (...path) => {
            path = _makePath(path);
            if(path !== _hash){
                // we should store raw value
                _registerChange(path);
                if (path === _hash) {
                    // we check if path is still === _hash to avoid error in
                    // case of multiple consecutive redirects [issue #39]
                    global.location.hash = '#' + encodeURI(path);
                }
            }
        },

        /**
         * Set Hash value without keeping previous hash on the history record.
         * Similar to calling `window.location.replace("#/hash")` but will also work on IE6-7.
         * @param {...string} path    Hash value without '#'.
         * @example hasher.replaceHash('lorem', 'ipsum', 'dolor') -> '#/lorem/ipsum/dolor'
         */
        replaceHash : (...path) => {
            path = _makePath(path);
            if(path !== _hash){
                // we should store raw value
                _registerChange(path, true);
                if (path === _hash) {
                    // we check if path is still === _hash to avoid error in
                    // case of multiple consecutive redirects [issue #39]
                    global.location.replace('#' + encodeURI(path));
                }
            }
        },

        /**
         * Removes all event listeners, stops hasher and destroy hasher object.
         * - IMPORTANT: hasher won't work after calling this method, hasher Object will be deleted.
         */
        dispose : () => {
            hasher.stop();
            hasher.initialized.dispose();
            hasher.changed.dispose();
            global.hasher = null;
        }
    };

    hasher.initialized.memorize = true; //see #33

    global.hasher = hasher;

})(this);
