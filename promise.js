void function() {
  var isNode = (function() {
    return (typeof module === 'object');
  })();

  var window = window || global;
  window.Xiaoming = window.Xiaoming || {};

  if (!Object.create) {
    Object.create = function(klass) {
      function f() {}
      f.prototype = klass;
      return new f();
    };
  }

  if (!Array.isArray) {
    Array.isArray = function(obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  Array.prototype.forEachRight = function(func) {
    for (var i = this.length - 1; i >= 0; i--) {
      func(this[i], i);
    }
  };

  var shallowCopy = function(obj) {
    if (typeof obj !== 'object') throw new Error('paramater must be an object');

    if (Array.isArray(obj)) {
      var result = [];

      obj.slice(0).forEach(function(value) {
        result.push(value);
      });
    }
  };

  Xiaoming.Promise = Promise = function(resolver) {
    if (typeof resolver !== 'function') throw new Error('paramater is not a function');

    var deferred = Promise.defer();

    try {
      resolver(deferred.resolve, deferred.reject);
    } catch(e) {
      deferred.reject(e);
    }

    return deferred.promise;
  };

  // Promise 通用方法
  Promise.prototype.constructor = Promise;
  Promise.prototype.toString = function() {
    return '[Object Promise]';
  };

  Promise.defer = function() {
    // 状态相关做成私有变量
    var _pending = [],
      _state = 'pending',
      _value = null,
      _reason = null,
      pending = null;

    function Resolve(deferred, x) {
      if (deferred.promise === x) {
        throw new TypeError('Refer to the same promise');
      }

      if (x === null) return deferred.resolve(x);

      if (x instanceof Promise) {
        x.then(function(value) {
          Resolve(deferred, value);
        }, function(reason) {
          deferred.reject(reason);
        });
      } else if (typeof x === 'function' || typeof x === 'object') {
        var isCalled = false;
        var then;

        try {
          then = x.then;

          if (typeof then === 'function') {
            then.call(x, function(value) {
                if (!isCalled) {
                  Resolve(deferred, value);
                  isCalled = true;
                }
            }, function(reason) {
              if (!isCalled) {
                deferred.reject(reason);
                isCalled = true;
              }
            });
          } else {
            deferred.resolve(x);
            isCalled = true;
          }
        } catch(e) {
          if (!isCalled) {
            deferred.reject(e);
            isCalled = true;
          }
        }
      } else {
        deferred.resolve(x);
      }
    }

    function handleThen() {
      // 只处理 fullfilled/rejected 状态的 promise
      if (_state === 'pending') return;

      _pending.forEachRight(function(thenPromise, index) {
        switch(_state) {
          case 'fullfilled':
            if (thenPromise.onFullfilled) {
              setTimeout(function() {
                var onFullfilled = thenPromise.onFullfilled;
                var returnValue;
                var deferred = thenPromise.deferred;

                try {
                  returnValue = onFullfilled(_value);
                  Resolve(deferred, returnValue);
                } catch(e) {
                  deferred.reject(e);
                }
              }, 0);
            } else {
              thenPromise.deferred.resolve(_value);
            }
            break;
          case 'rejected':
            if (thenPromise.onRejected) {
              setTimeout(function() {
                var onRejected = thenPromise.onRejected;
                var deferred = thenPromise.deferred;
                var returnValue;

                try {
                  returnValue = onRejected(_reason);
                  Resolve(deferred, returnValue);
                } catch(e) {
                  deferred.reject(e);
                }
              }, 0);
            } else {
              thenPromise.deferred.reject(_reason);
            }
            break;
        }

        _pending.splice(index, 1);
      });
    }

    var promise = Object.create(Promise.prototype);

    promise.state = function() {
      return {state: _state};
    };

    promise.then = function(onFulfilled, onRejected) {
      var thenable = {};
      var deferred = Promise.defer();

      thenable.deferred = deferred;

      if (onFulfilled && typeof onFulfilled === 'function') thenable.onFullfilled = onFulfilled;
      if (onRejected && typeof onRejected === 'function') thenable.onRejected = onRejected;

      thenable.promise = deferred.promise;
      _pending.unshift(thenable);

      handleThen();

      return thenable.promise;
    };

    return {
      resolve: function(value) {
        if (_state !== 'pending') return;

        _state = 'fullfilled';
        _value = value;
        handleThen();
      },

      reject: function(reason) {
        if (_state !== 'pending') return;

        _state = 'rejected';
        _reason = reason;
        handleThen();
      },

      promise: promise
    };
  };

  // 状态控制相关方法保持在构造函数上
  Promise.resolve = function(value) {
    return Promise(function(resolve) {
      resolve(value);
    });
  };

  Promise.reject = function(reason) {
    return Promise(function(resolve, reject) {
      reject(reason);
    });
  };

  // 流程相关方法
  Promise.prototype.done = function(onFullfilled, onRejected) {
    // no return value
    var handler = onFullfilled || onRejected;
    this.then(handler);
  };

  Promise.prototype.fin = Promise.prototype['finally'] = function(callback) {
    this.then(callback, callback);
  };

  Promise.prototype.fail =
  Promise.prototype['catch'] = function(rejected) {
    return this.then(void 0, rejected);
  };

  Promise.prototype.success = function(fullfilled) {
    return this.then(fullfilled, void 0);
  };

  Promise.all = function(promises) {
    var deferred = Promise.defer();
    var _values = [];

    var successCallback = function(value, len) {
      _values.push(value);
      if (_values.length === len) deferred.resolve(_values);
    };

    var errorCallback = function(reason) {
      deferred.reject(reason);
    };

    promises.forEach(function(promise, index) {
      promise.success(successCallback, index);
      promise.fail(errorCallback);
    });

    return deferred.promise;
  };

  Promise.when = function(promises) {
    var deferred = Promise.defer();
    var handler = function(promise, result) {
      var state = promise.state().state;

      switch(state) {
        case 'fullfilled':
          deferred.resolve(result);
        break;
        case 'rejected':
          deferred.reject(result);
        break;
      }
    };

    for (var i = 0, ii = promises.length; i < ii; i++) {
      var promise = promises[i];
      promise.fin(handler);
    }

    return deferred.promise;
  };

  if (isNode) module.exports = Promise;
}();
