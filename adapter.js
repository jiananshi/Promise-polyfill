var Promise = require('./promise');

module.exports = {
  resolved: Promise.resolve,
  rejected: Promise.reject,
  deferred: Promise.defer
};
