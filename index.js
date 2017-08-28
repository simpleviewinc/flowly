"use strict";

// umd boilerplate for CommonJS and AMD
if (typeof exports === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var Flow = function(args) {
		var self = this;
		
		// args.timers, boolean - Enable timers for this flow
		
		self._args = args || {};
		self._halted = false;
		
		if (self._args.timers === true) {
			self.timers = { total : 0, results : {} };
		}
	}

	// Execute an series, function semantics as async series with a few differences
	// Call flow.halt(result1, result2, cb) in order to halt the flow and go to the end
	// Call flow.last to get the return of the last executed function
	// Pass flow.cbLast(cb) to the final cb of the series if you want it cb the last item returned rather than the entirety of all results
	// Data is available at every step in the series at flow.data.
	Flow.prototype.series = function(calls, cb) {
		var self = this;
		
		self._cb = self._callback.bind(self, cb);
		self._callArr = [];
		
		if (calls instanceof Array) {
			self.data = [];
			for(var i = 0; i < calls.length; i++) {
				self._callArr.push({ key : i, fn : calls[i] });
			}
		} else {
			self.data = {};
			for(var i in calls) {
				self._callArr.push({ key : i, fn : calls[i] });
			}
		}
		
		// bind the handler for each function
		self._handler = self._recurseHandler.bind(self);
		return self._recurse();
	}
	
	// function which handles the final return after the series is complete, bouncd with cb
	Flow.prototype._callback = function(boundCb, err, results) {
		var self = this;
		
		if (err) { return boundCb(err); }
		
		if (self._args.timers === true) {
			var keys = Object.keys(self.timers.results);
			keys.forEach(function(val, i) {
				self.timers.total += self.timers.results[val];
			});
		}
		
		return boundCb(null, self.data);
	}

	// Stops the series and goes to the final callback, capable of returning data
	// flow.halt(cb) or flow.halt(arg1, arg2, cb);
	Flow.prototype.halt = function() {
		var self = this;
		
		// v8 - argumentsToArray one-liner
		var args = new Array(arguments.length); for(var i = 0; i < arguments.length; i++) { args[i] = arguments[i]; }
		var cb = args.pop();
		
		self._halted = true;
		
		args.unshift(null);
		
		return cb.apply(null, args);
	}

	// Wraps a callback to cb err or the last item
	Flow.prototype.cbLast = function(cb) {
		var self = this;
		
		return self._cbLastHandler.bind(self, cb);
	}
	
	Flow.prototype._cbLastHandler = function(cb, err) {
		var self = this;
		
		if (err) { return cb(err); }
		
		return cb(null, self.last);
	}
	
	// execute the next function of the series
	Flow.prototype._recurse = function() {
		var self = this;
		
		if (self._callArr.length === 0) { return self._cb(null, self.data); }
		
		if (self._halted === true) {
			return self._cb(null);
		}
		
		self._current = self._callArr.shift();
		
		if (self._args.timers === true) {
			self._start = Date.now();
		}
		
		return self._current.fn(self._handler);
	}
	
	// return callback handler which processes the users return values
	Flow.prototype._recurseHandler = function(err) {
		var self = this;
		
		if (self._args.timers === true) {
			self.timers.results[self._current.key] = Date.now() - self._start;
		}
		
		if (err) { return self._cb(err); }
		
		var args = [];
		for(var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		
		var result = args.length > 1 ? args : args[0];
		self.data[self._current.key] = self.last = result;
		
		return self._recurse();
	}
	
	Flow.prototype.if = function(condFn, fn) {
		var self = this;
		
		return self._ifHandler.bind(self, condFn, fn);
	}
	
	Flow.prototype._ifHandler = function(condFn, fn, cb) {
		var self = this;
		
		if (condFn() === false) {
			return cb(null);
		}
		
		return fn(cb);
	}
	
	// short-cut to execute a series in cases where the flow mechanics aren't needed
	var series = function(calls, cb) {
		var flow = new Flow();
		return flow.series(calls, cb);
	}
	
	module.exports = {
		Flow : Flow,
		series : series
	}
});