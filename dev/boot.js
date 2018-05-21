
import window from 'window';
import elementDatasetPolyfill from 'element-dataset';

import 'es6-object-assign/auto';

import {Promise} from 'es6-promise-polyfill/promise.js';

window.Promise = window.Promise || Promise;

elementDatasetPolyfill();

require('json3');
require('intersection-observer');
require('../vendors/modernizr/modernizr-custom.js');
require('Common/Booter');

if (window.__runBoot)
{
	window.__runBoot();
}
