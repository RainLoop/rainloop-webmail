
import window from 'window';

require('json2/json2.js');
require('modernizr/modernizr-custom.js');
require('Common/Booter.jsx');

import {$LAB} from 'labjs/LAB.src.js';
import {progressJs} from 'progress.js/src/progress.js';

window.$LAB = $LAB;
window.progressJs = progressJs;
