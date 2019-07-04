module.exports = {
	parser: 'babel-eslint',
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	plugins: ['prettier'],
	parserOptions: {
		ecmaVersion: 6,
		sourceType: 'module'
	},
	env: {
		node: true,
		commonjs: true,
		es6: true
	},
	globals: {
		'RL_COMMUNITY': true,
		'RL_ES6': true
	},
	// http://eslint.org/docs/rules/
	rules: {
		// plugins
		'prettier/prettier': 'error',

		'no-console': 'error',
		'max-len': [
			'error',
			120,
			2,
			{
				ignoreComments: true,
				ignoreUrls: true,
				ignoreTrailingComments: true,
				ignorePattern: '(^\\s*(const|let|var)\\s.+=\\s*require\\s*\\(|^import\\s.+\\sfrom\\s.+;$)'
			}
		]
	}
};
