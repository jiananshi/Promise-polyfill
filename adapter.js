var Promise = require('./promise');

var d = Promise(function(resolve, reject) {
  reject(11);
});

d.then(null, function(value) {
  return {a: 11};
}).then(function(value) {
  console.log(value);
});

d.then(null, function() {
  throw 123;
}).then(function(value) {
  console.log(value, 111111);
}, function(reason) {
  console.log(reason);
});

d.then(null, function() {
  return 222;
}).then(function(value) {
  console.log(value);
});

module.exports = {
  resolved: Promise.resolve,
  rejected: Promise.reject,
  deferred: Promise.defer
};
