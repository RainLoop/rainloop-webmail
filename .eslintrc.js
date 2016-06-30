module.exports = {
	"extends": "eslint:recommended",
	"ecmaFeatures": {
		"modules": true
	},
	"parserOptions": {
		"ecmaVersion": 6,
        "sourceType": "module"
    },
	"env": {
		"node": true,
		"commonjs": true,
		"es6": true,
		"browser": true
	},
	"globals": {
		"RL_COMMUNITY": true,
		"ko": true,
		"ssm": true,
		"moment": true,
		"ifvisible": true,
		"crossroads": true,
		"hasher": true,
		"key": true,
		"Jua": true,
		"_": true,
		"$": true,
		"Dropbox": true
	},
	"rules": {

		"strict": 2,			// require or disallow strict mode directives

		// errors

		"comma-dangle": [2, "never"],		// disallow or enforce trailing commas
		"no-cond-assign": [2, "always"],	// disallow assignment in conditional expressions
		"no-console": 2,					// disallow use of console (off by default in the node environment)
		"no-constant-condition": 2,			// disallow use of constant expressions in conditions
		"no-control-regex": 2,				// disallow control characters in regular expressions
		"no-debugger": 2,					// disallow use of debugger
		"no-dupe-args": 2,					// disallow duplicate arguments in functions
		"no-dupe-keys": 2,					// disallow duplicate keys when creating object literals
		"no-duplicate-case": 2,				// disallow a duplicate case label.
		"no-empty": 2,						// disallow empty statements
		"no-empty-character-class": 2,		// disallow the use of empty character classes in regular expressions
		"no-ex-assign": 2,					// disallow assigning to the exception in a catch block
		"no-extra-boolean-cast": 2,			// disallow double-negation boolean casts in a boolean context
//		"no-extra-parens": 2,				// disallow unnecessary parentheses (off by default)
		"no-extra-semi": 2,					// disallow unnecessary semicolons
		"no-func-assign": 2,				// disallow overwriting functions written as function declarations
		"no-inner-declarations": 2,			// disallow function or variable declarations in nested blocks
		"no-invalid-regexp": 2,				// disallow invalid regular expression strings in the RegExp constructor
		"no-irregular-whitespace": 2,		// disallow irregular whitespace outside of strings and comments
		"no-negated-in-lhs": 2,				// disallow negation of the left operand of an in expression
		"no-obj-calls": 2,					// disallow the use of object properties of the global object (Math and JSON) as functions
		"no-regex-spaces": 2,				// disallow multiple spaces in a regular expression literal
		"no-sparse-arrays": 2,				// disallow sparse arrays
		"no-unexpected-multiline": 2,		// disallow confusing multiline expressions
		"no-unreachable": 2,				// disallow unreachable statements after a return, throw, continue, or break statement
		"use-isnan": 2,						// disallow comparisons with the value NaN
		"valid-typeof": 2,					// Ensure that the results of typeof are compared against a valid string

//		"valid-jsdoc": [2, {				// Ensure JSDoc comments are valid (off by default)
//			"requireParamDescription": false,
//			"requireReturnDescription": false
//		}],

		// best practices

		"accessor-pairs": 2,				// enforce getter and setter pairs in objects
		"block-scoped-var": 2,				// treat var statements as if they were block scoped (off by default). 0: deep destructuring is not compatible https://github.com/eslint/eslint/issues/1863
//		"complexity": 2,					// specify the maximum cyclomatic complexity allowed in a program (off by default)
		"consistent-return": 2,				// require return statements to either always or never specify values
		"curly": 2,							// specify curly brace conventions for allphpuni	 control statements
		"default-case": 2,					// require default case in switch statements (off by default)
		"dot-location": [2, "property"],	// enforce consistent newlines before and after dots
		"dot-notation": 2,					// encourages use of dot notation whenever possible
		"eqeqeq": 2,						// require the use of === and !==
		"guard-for-in": 2,					// make sure for-in loops have an if statement (off by default)
		"no-alert": 2,						// disallow the use of alert, confirm, and prompt
		"no-caller": 2,						// disallow use of arguments.caller or arguments.callee
		"no-div-regex": 2,					// disallow division operators explicitly at beginning of regular expression (off by default)
		"no-else-return": 2,				// disallow else after a return in an if (off by default)
		"no-eq-null": 2,					// disallow comparisons to null without a type-checking operator (off by default)
		"no-eval": 2,						// disallow use of eval()
		"no-extend-native": 2,				// disallow adding to native types
		"no-extra-bind": 2,					// disallow unnecessary function binding
		"no-fallthrough": 2,				// disallow fallthrough of case statements
		"no-floating-decimal": 2,			// disallow the use of leading or trailing decimal points in numeric literals (off by default)
		"no-implied-eval": 2,				// disallow use of eval()-like methods
		"no-iterator": 2,					// disallow usage of __iterator__ property
		"no-labels": 2,						// disallow use of labeled statements
		"no-lone-blocks": 2,				// disallow unnecessary nested blocks
		"no-loop-func": 2,					// disallow creation of functions within loops
		"no-multi-spaces": 2,				// disallow use of multiple spaces
		"no-multi-str": 2,					// disallow use of multiline strings
		"no-native-reassign": 2,			// disallow reassignments of native objects
		"no-new": 2,						// disallow use of new operator when not part of the assignment or comparison
		"no-new-func": 2,					// disallow use of new operator for Function object
		"no-new-wrappers": 2,				// disallows creating new instances of String,Number, and Boolean
		"no-octal": 2,						// disallow use of octal literals
		"no-octal-escape": 2,				// disallow use of octal escape sequences in string literals, such as var foo = "Copyright \251";
//		"no-param-reassign": 2,				// disallow reassignment of function parameters (off by default)
		"no-process-env": 2,				// disallow use of process.env (off by default)
		"no-proto": 2,						// disallow usage of __proto__ property
		"no-redeclare": 2,					// disallow declaring the same variable more then once
		"no-return-assign": 2,				// disallow use of assignment in return statement
		"no-script-url": 2,					// disallow use of javascript: urls.
		"no-self-compare": 2,				// disallow comparisons where both sides are exactly the same (off by default)
		"no-sequences": 2,					// disallow use of comma operator
		"no-throw-literal": 2,				// restrict what can be thrown as an exception (off by default)
		"no-unused-expressions": 2,			// disallow usage of expressions in statement position
		"no-void": 2,						// disallow use of void operator (off by default)
		"no-warning-comments": 2,			// disallow usage of configurable warning terms in comments": 2, // e.g. TODO or FIXME (off by default)
		"no-with": 2,						// disallow use of the with statement
		"radix": 2,							// require use of the second argument for parseInt() (off by default)
//		"vars-on-top": 2,					// requires to declare all vars on top of their containing scope (off by default)
		"wrap-iife": 2,						// require immediate function invocation to be wrapped in parentheses (off by default)
		"yoda": [2, "always"],				// require or disallow Yoda conditions

		// variables

		"no-catch-shadow": 2,				// disallow the catch clause parameter name being the same as a variable in the outer scope (off by default in the node environment)
		"no-delete-var": 2,					// disallow deletion of variables
		"no-label-var": 2,					// disallow labels that share a name with a variable
		"no-shadow": 2,						// disallow declaration of variables already declared in the outer scope
		"no-shadow-restricted-names": 2,	// disallow shadowing of names such as arguments
		"no-undef": 2,						// disallow use of undeclared variables unless mentioned in a /*global */ block
		"no-undef-init": 2,					// disallow use of undefined when initializing variables
		"no-undefined": 2,					// disallow use of undefined variable (off by default)
		"no-unused-vars": 2,				// disallow declaration of variables that are not used in the code
		"no-use-before-define": 2,			// disallow use of variables before they are defined

		// stylistic issues

		"array-bracket-spacing": 2,			// enforce consistent spacing inside array brackets
		"block-spacing": [2, "never"],		// enforce consistent spacing inside single-line blocks

//		"brace-style": [2, "1tbs"],			// enforce consistent brace style for blocks

//		"camelcase": 2,						// enforce camelcase naming convention
		"comma-spacing": 2,					// enforce consistent spacing before and after commas
		"comma-style": 2,					// enforce consistent comma style
		"computed-property-spacing": 2,		// enforce consistent spacing inside computed property brackets
		"consistent-this": [2, "self"],		// enforce consistent naming when capturing the current execution context
		"eol-last": 2,						// enforce at least one newline at the end of files
		"id-match": 2,						// require identifiers to match a specified regular expression

		"indent": [2, "tab", {				// enforce consistent indentation
			"SwitchCase": 1,
			"VariableDeclarator": {
				"var": 1,
				"let": 1,
				"const": 1
			}
		}],

		"key-spacing": 2,					// enforce consistent spacing between keys and values in object literal properties
		"linebreak-style": [2, "unix"],		// enforce consistent linebreak style
//		"lines-around-comment": 2,			// require empty lines around comments
//		"max-depth": 2,						// enforce a maximum depth that blocks can be nested
		"max-len": [2, 200],				// enforce a maximum line length
//		"max-lines": 2,						// enforce a maximum file length
		"max-nested-callbacks": [2, 5],		// enforce a maximum depth that callbacks can be nested
//		"max-params": 2,					// enforce a maximum number of parameters in function definitions
//		"max-statements": 2,				// enforce a maximum number of statements allowed in function blocks
		"max-statements-per-line": 2,		// enforce a maximum number of statements allowed per line
		"new-cap": 2,						// require constructor function names to begin with a capital letter
		"new-parens": 2,					// require parentheses when invoking a constructor with no arguments
//		"newline-after-var": 2,				// require or disallow an empty line after var declarations
//		"newline-before-return": 2,			// require an empty line before return statements
//		"newline-per-chained-call": 2,		// require a newline after each call in a method chain
		"no-array-constructor": 2,			// disallow Array constructors
		"no-bitwise": 2,					// disallow bitwise operators
		"no-continue": 2,					// disallow continue statements
//		"no-inline-comments": 2,			// disallow inline comments after code
//		"no-lonely-if": 2,					// disallow if statements as the only statement in else blocks
//		"no-mixed-operators": 2,			// disallow mixes of different operators
		"no-mixed-spaces-and-tabs": 2,		// disallow mixed spaces and tabs for indentation
		"no-multiple-empty-lines": 2,		// disallow multiple empty lines
//		"no-negated-condition": 2,			// disallow negated conditions
//		"no-nested-ternary": 2,				// disallow nested ternary expressions
		"no-new-object": 2,					// disallow Object constructors
		"no-plusplus": [2, {				// disallow the unary operators ++ and --
			"allowForLoopAfterthoughts": true
		}],
		"no-restricted-syntax": 2,				// disallow specified syntax
		"no-spaced-func": 2,					// disallow spacing between function identifiers and their applications
		"no-ternary": 0,						// disallow ternary operators
		"no-trailing-spaces": 2,				// disallow trailing whitespace at the end of lines
//		"no-underscore-dangle": 2,				// disallow dangling underscores in identifiers
		"no-unneeded-ternary": 2,				// disallow ternary operators when simpler alternatives exist
//		"no-whitespace-before-property": 2,		// disallow whitespace before properties
//		"object-curly-newline": 2,				// enforce consistent line breaks inside braces
		"object-curly-spacing": [2, "never"],	// enforce consistent spacing inside braces

//		"object-property-newline": [2, {		// enforce placing object properties on separate lines
//			"allowMultiplePropertiesPerLine": false
//		}],

//		"one-var": [2, {								// enforce variables to be declared either together or separately in functions
//			"var": "always",
//			"let": "always",
//			"const": "never"
//		}],

//		"one-var-declaration-per-line": [2, "always"],	// require or disallow newlines around var declarations
		"operator-assignment": 2,						// require or disallow assignment operator shorthand where possible
		"operator-linebreak": [2, "after"],				// enforce consistent linebreak style for operators
//		"padded-blocks": [2, "never"],					// require or disallow padding within blocks
//		"quote-props": [2, "as-needed"],				// require quotes around object literal property names
		"quotes": [2, "single"],						// enforce the consistent use of either backticks, double, or single quotes
		"require-jsdoc": 2,								// require JSDoc comments
		"semi":	[2, "always"],							// require or disallow semicolons instead of ASI
		"semi-spacing": 2,								// enforce consistent spacing before and after semicolons
//		"sort-vars": 2,									// require variables within the same declaration block to be sorted
		"space-before-blocks": 2,						// enforce consistent spacing before blocks
		"space-before-function-paren": [2, "never"],	// enforce consistent spacing before function definition opening parenthesis
		"space-in-parens": 2,							// enforce consistent spacing inside parentheses
		"space-infix-ops": 2,							// require spacing around operators
		"space-unary-ops": 2,							// enforce consistent spacing before or after unary operators
		"spaced-comment": 2,							// enforce consistent spacing after the // or /* in a comment
//		"unicode-bom": [2, "never"],					// require or disallow the Unicode BOM
		"wrap-regex": 2,								// require parenthesis around regex literals

		// es6

		"constructor-super": 2,							// require super() calls in constructors
		"no-class-assign": 2,							// disallow reassigning class members
		"no-const-assign": 2,							// disallow reassigning const variables
		"no-dupe-class-members": 2,						// disallow duplicate class members
		"no-this-before-super": 2,						// disallow this/super before calling super() in constructors
		"prefer-const": 2								// require const declarations for variables that are never reassigned after declared
	}
};
