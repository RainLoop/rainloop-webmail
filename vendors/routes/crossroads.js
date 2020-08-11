/** @license
 * Crossroads.js <http://millermedeiros.github.com/crossroads.js>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 0.7.1 - Build: 93 (2012/02/02 09:29 AM)
 */

(global => {

    // Helpers -----------
    //====================

    //borrowed from AMD-utils
    function typecastValue(val) {
        var r;
        if (val === null || val === 'null') {
            r = null;
        } else if (val === 'true') {
            r = true;
        } else if (val === 'false') {
            r = false;
        } else if (val === undefined || val === 'undefined') {
            r = undefined;
        } else if (val === '' || isNaN(val)) {
            //isNaN('') returns false
            r = val;
        } else {
            //parseFloat(null || '') returns NaN
            r = parseFloat(val);
        }
        return r;
    }


    // Crossroads --------
    //====================

    class Crossroads {

        constructor() {
			this._routes = [];
			this.bypassed = new signals.Signal();
			this.routed = new global.signals.Signal();
			this.shouldTypecast = false;
		}

        addRoute(pattern, callback, priority) {
            var route = new Route(pattern, callback, priority, this),
                routes = this._routes,
                n = routes.length;
            do { --n; } while (routes[n] && route._priority <= routes[n]._priority);
            routes.splice(n+1, 0, route);
            return route;
        }

        removeRoute(route) {
            var i = this._routes.indexOf(route);
            if (i !== -1) {
                this._routes.splice(i, 1);
            }
            route._destroy();
        }

        removeAllRoutes() {
            var n = this.getNumRoutes();
            while (n--) {
                this._routes[n]._destroy();
            }
            this._routes.length = 0;
        }

        parse(request) {
            request = request || '';

            var routes = this._getMatchedRoutes(request),
                i = 0,
                n = routes.length,
                cur;

            if (n) {
                //shold be incremental loop, execute routes in order
                while (i < n) {
                    cur = routes[i];
                    cur.route.matched.dispatch.apply(cur.route.matched, cur.params);
                    cur.isFirst = !i;
                    this.routed.dispatch(request, cur);
                    i += 1;
                }
            } else {
                this.bypassed.dispatch(request);
            }
        }

        getNumRoutes() {
            return this._routes.length;
        }

        _getMatchedRoutes(request) {
            var res = [],
                routes = this._routes,
                n = routes.length,
                route;
            //should be decrement loop since higher priorities are added at the end of array
            while (route = routes[--n]) {
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

		constructor(pattern, callback, priority, router) {
			this.greedy = false;
			this.rules = void(0);
			var isRegexPattern = pattern instanceof RegExp;
			this._router = router;
			this._pattern = pattern;
			this._paramsIds = isRegexPattern ? null : patternLexer.getParamIds(this._pattern);
			this._optionalParamsIds = isRegexPattern ? null : patternLexer.getOptionalParamsIds(this._pattern);
			this._matchRegexp = isRegexPattern ? pattern : patternLexer.compilePattern(pattern);
			this.matched = new global.signals.Signal();
			if (callback) {
				this.matched.add(callback);
			}
			this._priority = priority || 0;
		}


        match(request) {
            return this._matchRegexp.test(request) && this._validateParams(request); //validate params even if regexp because of `request_` rule.
        }

        _validateParams(request) {
            var rules = this.rules,
                values = this._getParamsObject(request),
                key;
            for (key in rules) {
                // normalize_ isn't a validation rule... (#39)
                if(key !== 'normalize_' && rules.hasOwnProperty(key) && ! this._isValidParam(request, key, values)){
                    return false;
                }
            }
            return true;
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
            else if (typeof validationRule === 'function') {
                isValid = validationRule(val, request, values);
            }

            return isValid; //fail silently if validationRule is from an unsupported type
        }

        _getParamsObject(request) {
            var shouldTypecast = this._router.shouldTypecast,
                values = patternLexer.getParamValues(request, this._matchRegexp, shouldTypecast),
                o = {},
                n = values.length;
            while (n--) {
                o[n] = values[n]; //for RegExp pattern and also alias to normal paths
                if (this._paramsIds) {
                    o[this._paramsIds[n]] = values[n];
                }
            }
            o.request_ = shouldTypecast ? typecastValue(request) : request;
            o.vals_ = values;
            return o;
        }

        _getParamsArray(request) {
            var norm = this.rules ? this.rules.normalize_ : null,
                params;
            if (norm && typeof norm === 'function') {
                params = norm(request, this._getParamsObject(request));
            } else {
                params = patternLexer.getParamValues(request, this._matchRegexp, this._router.shouldTypecast);
            }
            return params;
        }

        dispose() {
            this._router.removeRoute(this);
        }

        _destroy() {
            this.matched.dispose();
            this.matched = this._pattern = this._matchRegexp = null;
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
			getParamValues : (request, regexp, shouldTypecast) => {
				var vals = regexp.exec(request);
				if (vals) {
					vals.shift();
					if (shouldTypecast) {
						vals = vals.map(v => typecastValue(v));
					}
				}
				return vals;
			},
			compilePattern : pattern => {
				pattern = pattern || '';
				if (pattern) {
					pattern = untokenize(
						tokenize(pattern.replace(UNNECESSARY_SLASHES_REGEXP, '')).replace(ESCAPE_CHARS_REGEXP, '\\$&')
					);
				}
				return new RegExp('^'+ pattern + '/?$'); //trailing slash is optional
			}
		};

    global.Crossroads = Crossroads;

})(this);
