void function() {
  var Xiaoming = Xiaoming || {};

  if (!Object.create) {
    Object.create = function(klass) {
      function f() {}
      f.prototype = klass;
      return new f();
    };
  }

  Array.prototype.forEachRight = function(func) {
    for (var i = this.length - 1; i >= 0; i--) {
      func(this[i], i);
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
        _reason = null;

    function handleThen() {
      // 只处理 fullfilled/rejected 状态的 promise
      if (_state === 'pending') return;

      _pending.forEachRight(function(thenPromise, index) {
        var returnValue = null;

        try {
          switch(_state) {
            case 'fullfilled':
              if (thenPromise.onFullfilled && (typeof thenPromise.onFullfilled === 'function')) {
                returnValue = thenPromise.onFullfilled(_value);
              }
              break;
            case 'rejected':
              if (thenPromise.onRejected && (typeof thenPromise.onRejected === 'function')) {
                returnValue = thenPromise.onRejected(_reason);
              }
              break;
          }

          if (returnValue && (typeof returnValue.then === 'function')) {
            for (var j = index - 1; j >= 0; j--) {
              returnValue.then(_pending[j].onFullfilled, _pending[j].onRejected);
            }

            _pending = [];
          }
        } catch(e) {
          // 仅需改变 _state，下一个 thenable 函数将根据 _state 处理错误
          _state = 'rejected';
          _reason = e;
        }
      });
    }

    var promise = Object.create(Promise.prototype);

    // defer().promise 的 方法/属性
    promise.state = function() {
      return {state: _state};
    };

    promise.then = function(onFullfilled, onRejected) {
      var thenable = {};

      if (onFullfilled) thenable.onFullfilled = onFullfilled;
      if (onRejected) thenable.onRejected = onRejected;

      thenable.promise = promise;
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
  Promise.resolve =  function(value) {
    return this(function(resolve) {
      resolve(value);
    });
  };

  Promise.reject = function(reason) {
    return this(function(resolve, reject) {
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
}();
