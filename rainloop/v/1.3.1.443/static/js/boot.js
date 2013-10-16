/*
 * See http://www.JSON.org/js.html
 */
var JSON;JSON||(JSON={}),function(){function str(a,b){var c,d,e,f,g=gap,h,i=b[a];i&&typeof i=="object"&&typeof i.toJSON=="function"&&(i=i.toJSON(a)),typeof rep=="function"&&(i=rep.call(b,a,i));switch(typeof i){case"string":return quote(i);case"number":return isFinite(i)?String(i):"null";case"boolean":case"null":return String(i);case"object":if(!i)return"null";gap+=indent,h=[];if(Object.prototype.toString.apply(i)==="[object Array]"){f=i.length;for(c=0;c<f;c+=1)h[c]=str(c,i)||"null";e=h.length===0?"[]":gap?"[\n"+gap+h.join(",\n"+gap)+"\n"+g+"]":"["+h.join(",")+"]",gap=g;return e}if(rep&&typeof rep=="object"){f=rep.length;for(c=0;c<f;c+=1)d=rep[c],typeof d=="string"&&(e=str(d,i),e&&h.push(quote(d)+(gap?": ":":")+e))}else for(d in i)Object.hasOwnProperty.call(i,d)&&(e=str(d,i),e&&h.push(quote(d)+(gap?": ":":")+e));e=h.length===0?"{}":gap?"{\n"+gap+h.join(",\n"+gap)+"\n"+g+"}":"{"+h.join(",")+"}",gap=g;return e}}function quote(a){escapable.lastIndex=0;return escapable.test(a)?'"'+a.replace(escapable,function(a){var b=meta[a];return typeof b=="string"?b:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+a+'"'}function f(a){return a<10?"0"+a:a}"use strict",typeof Date.prototype.toJSON!="function"&&(Date.prototype.toJSON=function(a){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(a){return this.valueOf()});var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;typeof JSON.stringify!="function"&&(JSON.stringify=function(a,b,c){var d;gap="",indent="";if(typeof c=="number")for(d=0;d<c;d+=1)indent+=" ";else typeof c=="string"&&(indent=c);rep=b;if(b&&typeof b!="function"&&(typeof b!="object"||typeof b.length!="number"))throw new Error("JSON.stringify");return str("",{"":a})}),typeof JSON.parse!="function"&&(JSON.parse=function(text,reviver){function walk(a,b){var c,d,e=a[b];if(e&&typeof e=="object")for(c in e)Object.hasOwnProperty.call(e,c)&&(d=walk(e,c),d!==undefined?e[c]=d:delete e[c]);return reviver.call(a,b,e)}var j;text=String(text),cx.lastIndex=0,cx.test(text)&&(text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)}));if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver=="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")})}();
(function(window) {

	function Bar() {
		var self = this;

		self.el = null;
		self.done = false;
		self.progress = 0;
		self.addInterval = 0;
		self.interval = window.setInterval(function () {
			var oEl = self.build();
			if (oEl)
			{
				window.clearInterval(self.interval);
			}
		}, 100);
	}

	Bar.prototype.startAddInterval = function () {
		var self = this;
		self.stopAddInterval();
		self.addInterval = window.setInterval(function () {
			if (0 < self.progress && 100 > self.progress)
			{
				self.add(3);
			}
		}, 500);
	};
	
	Bar.prototype.stopAddInterval = function () {
		window.clearInterval(this.addInterval);
		this.addInterval = 0;
	};

	Bar.prototype.build = function () {
		if (null === this.el)
		{
			var oTargetElement = document.querySelector('body');
			if (oTargetElement)
			{
				this.el = document.createElement('div');
				this.el.className = 'simple-pace simple-pace-active';
				this.el.innerHTML = '<div class="simple-pace-progress"><div class="simple-pace-progress-inner"></div></div><div class="simple-pace-activity"></div>';

				if (oTargetElement.firstChild)
				{
					oTargetElement.insertBefore(this.el, oTargetElement.firstChild);
				}
				else
				{
					oTargetElement.appendChild(this.el);
				}
			}
		}

		return this.el;
	};

	Bar.prototype.reset = function () {
		this.progress = 0;
		return this.render();
	};

	Bar.prototype.update = function (iProg) {
		var iP = window.parseInt(iProg, 10);
		if (iP > this.progress)
		{
			this.progress = iP;
			this.progress = 100 < this.progress ? 100 : this.progress;
			this.progress = 0 > this.progress ? 0 : this.progress;
		}

		return this.render();
	};
	
	Bar.prototype.add = function (iProg) {
		this.progress += window.parseInt(iProg, 10);
		this.progress = 100 < this.progress ? 100 : this.progress;
		this.progress = 0 > this.progress ? 0 : this.progress;

		return this.render();
	};

	Bar.prototype.render = function () {
		var oEl = this.build();
		if (oEl && oEl.children && oEl.children[0])
		{
			oEl.children[0].setAttribute('style', 'width:' + this.progress + '%');
		}

		if (100 === this.progress && !this.done)
		{
			this.done = true;
			this.stopAddInterval();

			oEl.className = oEl.className.replace('simple-pace-active', '');
			oEl.className += ' simple-pace-inactive';
		}
		else if (100 > this.progress && this.done)
		{
			this.done = false;
			this.startAddInterval();

			oEl.className = oEl.className.replace('simple-pace-inactive', '');
			oEl.className += ' simple-pace-inactive';
		}
		else if (100 > this.progress && !this.done && 0 === this.addInterval)
		{
			this.startAddInterval();
		}
	};

	if (!window.SimplePace)
	{
		var oBar = new Bar();
		window.SimplePace = {
			'set': function (iValue) {
				oBar.update(iValue);
			},
			'add': function (iValue) {
				oBar.add(iValue);
			}
		};
	}
}(window));


function CRLTopDriver() {}
CRLTopDriver.prototype.sess = window.sessionStorage;
CRLTopDriver.prototype.top = window.top || window;
CRLTopDriver.prototype.getHash = function() {
	var mR = null;
	if (this.sess) {
		mR = this.sess.getItem('__rlA') || null;
	} else if (this.top) {
		var mData = this.top.name && JSON && '{' === this.top.name.toString().substr(0, 1) ? JSON.parse(this.top.name) : null;
		mR = mData ? (mData['__rlA'] || null) : null;
	}
	return mR;
};

CRLTopDriver.prototype.setHash = function() {
	if (this.sess) {
		this.sess.setItem('__rlA',
			window.rainloopAppData && window.rainloopAppData['AuthAccountHash'] ? window.rainloopAppData['AuthAccountHash'] : '');
	} else if (this.top) {
		this.top.name = JSON.stringify({
			'__rlA': window.rainloopAppData && window.rainloopAppData['AuthAccountHash'] ? window.rainloopAppData['AuthAccountHash'] : ''
		});
	}
};

CRLTopDriver.prototype.clearHash = function() {
	if (this.sess) {
		this.sess.setItem('__rlA', '');
	} else if (this.top) {
		this.top.name = '';
	}
};

window._topRLDriver = new CRLTopDriver();

function __rlah() {
	return window._topRLDriver ? window._topRLDriver.getHash() : null;
}

function __rlah_set() {
	if (window._topRLDriver) {
		window._topRLDriver.setHash();
	}
}

function __rlah_clear() {
	if (window._topRLDriver) {
		window._topRLDriver.clearHash();
	}
}

if (window.SimplePace) {
	window.SimplePace.add(10);
}

window.__rl_script_count = 1 + (window.__rl_script_count || 0);