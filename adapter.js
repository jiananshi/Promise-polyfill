var Promise = require('./promise');

Promise.deferred = Promise.defer;

module.exports = {
  resolved: Promise.resolve,
  rejected: Promise.reject,
  deferred: Promise.defer
};
