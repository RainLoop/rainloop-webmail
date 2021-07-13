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

    class Crossroads {

        constructor() {
            this._routes = [];
        }

        addRoute(pattern, callback) {
            var route = new Route(pattern, callback, this);
            this._routes.push(route);
            return route;
        }

        parse(request) {
            var routes = this._getMatchedRoutes(request || ''),
                i = 0,
                n = routes.length,
                cur;

            if (n) {
                //shold be incremental loop, execute routes in order
                while (i < n) {
                    cur = routes[i];
                    cur.route.callback && cur.route.callback(...cur.params);
                    cur.isFirst = !i;
                    i += 1;
                }
            }
        }

        _getMatchedRoutes(request) {
            var res = [],
                routes = this._routes,
                n = routes.length,
                route;
            //should be decrement loop since higher priorities are added at the end of array
            while (n) {
                route = routes[--n];
                if ((!res.length || route.greedy) && route.match(request)) {
                    res.push({
                        route : route,
                        params : route._getParamsArray(request)
                    });
                }
            }
            return res;
        }
    }

    // Route --------------
    //=====================

    class Route {

        constructor(pattern, callback, router) {
            this.greedy = false;
            this.rules = {};
            var isRegexPattern = pattern instanceof RegExp;
            this._router = router;
            this._pattern = pattern;
            this._paramsIds = isRegexPattern ? null : patternLexer.getParamIds(this._pattern);
            this._optionalParamsIds = isRegexPattern ? null : patternLexer.getOptionalParamsIds(this._pattern);
            this._matchRegexp = isRegexPattern ? pattern : patternLexer.compilePattern(pattern);
            this.callback = isFunction(callback) ? callback : null;
        }


        match(request) {
            return this._matchRegexp.test(request) && this._validateParams(request); //validate params even if regexp because of `request_` rule.
        }

        _validateParams(request) {
            var values = this._getParamsObject(request);
            return 0 == Object.keys(this.rules).filter(key =>
                key !== 'normalize_' && !this._isValidParam(request, key, values)
            ).length;
        }

        _isValidParam(request, prop, values) {
            var validationRule = this.rules[prop],
                val = values[prop],
                isValid = false;

            if (val == null && this._optionalParamsIds && this._optionalParamsIds.indexOf(prop) !== -1) {
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

            return isValid; //fail silently if validationRule is from an unsupported type
        }

        _getParamsObject(request) {
            var values = patternLexer.getParamValues(request, this._matchRegexp),
                o = {},
                n = values.length;
            while (n--) {
                o[n] = values[n]; //for RegExp pattern and also alias to normal paths
                this._paramsIds && (o[this._paramsIds[n]] = values[n]);
            }
            o.request_ = request;
            o.vals_ = values;
            return o;
        }

        _getParamsArray(request) {
            var norm = this.rules.normalize_;
            return isFunction(norm)
                ? norm(request, this._getParamsObject(request))
                : patternLexer.getParamValues(request, this._matchRegexp);
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

        tokenize = pattern => {
            //save chars that shouldn't be escaped
            return pattern.replace(OPTIONAL_SLASHES_REGEXP, '$1'+ SAVE_OPTIONAL_SLASHES +'$2')
                .replace(REQUIRED_SLASHES_REGEXP, '$1'+ SAVE_REQUIRED_SLASHES +'$2')
                .replace(OPTIONAL_PARAMS_REGEXP, SAVE_OPTIONAL_PARAMS)
                .replace(REQUIRED_PARAMS_REGEXP, SAVE_REQUIRED_PARAMS);
        },

        untokenize = pattern => {
            return pattern.replace(SAVED_OPTIONAL_SLASHES_REGEXP, '\\/?')
                .replace(SAVED_REQUIRED_SLASHES_REGEXP, '\\/')
                .replace(SAVED_OPTIONAL_REGEXP, '([^\\/]+)?/?')
                .replace(SAVED_REQUIRED_REGEXP, '([^\\/]+)');
        },

        patternLexer = {
            getParamIds : pattern => captureVals(PARAMS_REGEXP, pattern),
            getOptionalParamsIds : pattern => captureVals(OPTIONAL_PARAMS_REGEXP, pattern),
            getParamValues : (request, regexp) => {
                var vals = regexp.exec(request);
                if (vals) {
                    vals.shift();
                }
                return vals;
            },
            compilePattern : pattern => {
                pattern = pattern
                    ? untokenize(
                        tokenize(pattern.replace(UNNECESSARY_SLASHES_REGEXP, '')).replace(ESCAPE_CHARS_REGEXP, '\\$&')
                    )
                    : '';
                return new RegExp('^'+ pattern + '/?$'); //trailing slash is optional
            }
        };

    global.Crossroads = Crossroads;

})(this);
