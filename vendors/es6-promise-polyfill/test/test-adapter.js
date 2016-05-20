var assert = require('assert');
var Promise = require('../promise').Polyfill;
var resolve = Promise.resolve;
var reject = Promise.reject;

function defer(){
  var deferred = {};

  deferred.promise = new Promise(function(resolve, reject){
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}

module.exports = {
  resolved: function(a){ return Promise.resolve(a); },
  rejected: function(a){ return Promise.reject(a); },
  deferred: defer,
  Promise: Promise
};
