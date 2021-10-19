/** @license
 * Crossroads.js <http://millermedeiros.github.com/crossroads.js>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 0.7.1 - Build: 93 (2012/02/02 09:29 AM)
 */

(global => {

    const isFunction = obj => typeof obj === 'function';

    // Crossroads --------
    //====================

    global.Crossroads = class Crossroads {

        constructor() {
            this._routes = [];
        }

        addRoute(pattern, callback) {
            var route = new Route(pattern, callback, this);
            this._routes.push(route);
            return route;
        }

        parse(request) {
            request = request || '';
            var i = 0,
                routes = this._routes,
                n = routes.length,
                route;
            //should be decrement loop since higher priorities are added at the end of array
            while (n--) {
                route = routes[n];
                if ((!i || route.greedy) && route.match(request)) {
                    route.callback && route.callback(...route._getParamsArray(request));
                    ++i;
                }
            }
        }
    }

    // Route --------------
    //=====================

    class Route {

        constructor(pattern, callback, router) {
            var isRegexPattern = pattern instanceof RegExp;
            Object.assign(this, {
                greedy: false,
                rules: {},
                _router: router,
                _pattern: pattern,
                _paramsIds: isRegexPattern ? null : captureVals(PARAMS_REGEXP, pattern),
                _optionalParamsIds: isRegexPattern ? null : captureVals(OPTIONAL_PARAMS_REGEXP, pattern),
                _matchRegexp: isRegexPattern ? pattern : compilePattern(pattern),
                callback: isFunction(callback) ? callback : null
            });
        }

        match(request) {
            // validate params even if regexp.
            var values = this._getParamsObject(request);
            return this._matchRegexp.test(request)
             && 0 == Object.entries(this.rules).filter(([key, validationRule]) => {
                var val = values[key],
                    isValid = false;
                if (key === 'normalize_'
                 || (val == null && this._optionalParamsIds && this._optionalParamsIds.indexOf(key) !== -1)) {
                    isValid = true;
                }
                else if (validationRule instanceof RegExp) {
                    isValid = validationRule.test(val);
                }
                else if (Array.isArray(validationRule)) {
                    isValid = validationRule.indexOf(val) !== -1;
                }
                else if (isFunction(validationRule)) {
                    isValid = validationRule(val, request, values);
                }
                // fail silently if validationRule is from an unsupported type
                return !isValid;
            }).length;
        }

        _getParamsObject(request) {
            var values = getParamValues(request, this._matchRegexp) || [],
                n = values.length;
            if (this._paramsIds) {
                while (n--) {
                    values[this._paramsIds[n]] = values[n];
                }
            }
            return values;
        }

        _getParamsArray(request) {
            var norm = this.rules.normalize_;
            return isFunction(norm)
                ? norm(request, this._getParamsObject(request))
                : getParamValues(request, this._matchRegexp);
        }

    }



    // Pattern Lexer ------
    //=====================

    const
        ESCAPE_CHARS_REGEXP = /[\\.+*?^$[\](){}/'#]/g, //match chars that should be escaped on string regexp
        UNNECESSARY_SLASHES_REGEXP = /\/$/g, //trailing slash
        OPTIONAL_SLASHES_REGEXP = /([:}]|\w(?=\/))\/?(:)/g, //slash between `::` or `}:` or `\w:`. $1 = before, $2 = after
        REQUIRED_SLASHES_REGEXP = /([:}])\/?(\{)/g, //used to insert slash between `:{` and `}{`

        REQUIRED_PARAMS_REGEXP = /\{([^}]+)\}/g, //match everything between `{ }`
        OPTIONAL_PARAMS_REGEXP = /:([^:]+):/g, //match everything between `: :`
        PARAMS_REGEXP = /(?:\{|:)([^}:]+)(?:\}|:)/g, //capture everything between `{ }` or `: :`

        //used to save params during compile (avoid escaping things that
        //shouldn't be escaped).
        SAVE_REQUIRED_PARAMS = '__CR_RP__',
        SAVE_OPTIONAL_PARAMS = '__CR_OP__',
        SAVE_REQUIRED_SLASHES = '__CR_RS__',
        SAVE_OPTIONAL_SLASHES = '__CR_OS__',
        SAVED_REQUIRED_REGEXP = new RegExp(SAVE_REQUIRED_PARAMS, 'g'),
        SAVED_OPTIONAL_REGEXP = new RegExp(SAVE_OPTIONAL_PARAMS, 'g'),
        SAVED_OPTIONAL_SLASHES_REGEXP = new RegExp(SAVE_OPTIONAL_SLASHES, 'g'),
        SAVED_REQUIRED_SLASHES_REGEXP = new RegExp(SAVE_REQUIRED_SLASHES, 'g'),

        captureVals = (regex, pattern) => {
            var vals = [], match;
            while (match = regex.exec(pattern)) {
                vals.push(match[1]);
            }
            return vals;
        },

        getParamValues = (request, regexp) => {
            var vals = regexp.exec(request);
            if (vals) {
                vals.shift();
            }
            return vals;
        },
        compilePattern = pattern => {
            return new RegExp('^' + (pattern
                ? pattern
                    // tokenize, save chars that shouldn't be escaped
                    .replace(UNNECESSARY_SLASHES_REGEXP, '')
                    .replace(OPTIONAL_SLASHES_REGEXP, '$1'+ SAVE_OPTIONAL_SLASHES +'$2')
                    .replace(REQUIRED_SLASHES_REGEXP, '$1'+ SAVE_REQUIRED_SLASHES +'$2')
                    .replace(OPTIONAL_PARAMS_REGEXP, SAVE_OPTIONAL_PARAMS)
                    .replace(REQUIRED_PARAMS_REGEXP, SAVE_REQUIRED_PARAMS)
                    .replace(ESCAPE_CHARS_REGEXP, '\\$&')
                    // untokenize
                    .replace(SAVED_OPTIONAL_SLASHES_REGEXP, '\\/?')
                    .replace(SAVED_REQUIRED_SLASHES_REGEXP, '\\/')
                    .replace(SAVED_OPTIONAL_REGEXP, '([^\\/]+)?/?')
                    .replace(SAVED_REQUIRED_REGEXP, '([^\\/]+)')
                : ''
            ) + '/?$'); //trailing slash is optional
        };

})(this);
