[![Build Status](https://travis-ci.org/simpleviewinc/flowly.svg?branch=master)](https://travis-ci.org/simpleviewinc/flowly)

# Flowly

High performance async-like flow control library with data retention and short-circuiting

`npm install flowly`

This module is aimed at a simple and high performance variant of `async` and `async.series`. It has a few key enhancements and runs roughly 10x faster than `async`.

# Getting Started

The primary benefits of Flow are the ability to `flow.cbLast()`, access data from previous steps in the current series via `flow.data` and `flow.halt()`. This allows developers to eliminate a lot of boilerplate error checking and variable stashing.

The usage is very similar to `async`. In fact you can quickly replace almost any `async.series` with `flowly.series` and it will work with no regression and an instant speed boost.

```js
var flowly = require("flowly");
flowly.series({
	step1 : (cb) => {
		// step1
	},
	step2 : (cb) => {
		// step2
	},
	step3 : (cb) => {
		// step3
	}
}, (err, results) => {
});
```

To see the benefits of `flowly` lets look at a simple `async.series`

```js
var getPosts = function(cb) {
	var data;
	async.series({
		getData : (cb) => db.collection("foo").find({}, function(err, temp) {
			if (err) { return cb(err); }
			
			data = temp;
			
			return cb(null);
		}),
		transform : (cb) => {
			var temp = data.map(val => ({ url : val.title + "/" + val.recid + "/", title : val.title, recid : val.recid }));
			cb(null, temp);
		}
	}, (err, data) => {
		if (err) { return cb(err); }
		
		return cb(null, data.transform);
	});
}
```

If you call getPosts(function(err, data) {}) it will callback return the data from the transform step. Now lets do that same code in flowly.

```js
var getPosts = function(cb) {
	async.series({
		getData : (cb) => db.collection("foo").find({}, cb),
		transform : (cb) => {
			var temp = flow.data.getData.map(val => ({ url : val.title + "/" + val.recid + "/", title : val.title, recid : val.recid }));
			cb(null, temp);
		}
	}, flow.cbLast(cb));
}
```

1. By utilizing `flow.data` we are able to get the returned data from the first `getData` step without setting aside the `data` variable. The need to set aside a variable also forced us to do `if (err) { return cb(err); }` boilerplate.
1. By using `flow.cbLast(cb)` we return the data from the transform step, again eliminating another set of error checking.
1. If we add more steps to our series in the future, it's easy and doesn't require a whole refactor of the function. In `async` if you add another step, often you end up moving the final callback into the primary series, and it gets more unwieldy.

# Benchmark

`npm run simplebench`

As of 8/1/2017 on Node 7.10.0, higher ops/sec is better.

```
Group:  default
Winner - native callbacks

native callbacks - count: 1257784, ops/sec: 1257784
new flowly.Flow - count: 708483, ops/sec: 708483, diff: -43.67%
async.series - count: 172942, ops/sec: 172942, diff: -86.25%
native promises - count: 59974, ops/sec: 59974, diff: -95.23%
```

# Documentation

## flowly.series(calls, cb)

A shortcut execution of `var flow = new flowly.Flow(); flow.series(calls, cb);`. See the documentation for `Flow.prototype.series` for details.

## Flow

### Constructor

```js
	var flow = new flowly.Flow(options);
```

* `options` - `object` - `default undefined` - Optional options argument
	* `timers` - `boolean` - `default false` - Whether to time each step in the flow. Should only be done when debugging.

### Flow.prototype.series(calls, cb)

* `calls` - `array or object` - The calls object or array. For an object each key is the name of the step and it's value is a function. For array, each entry is a function
* `cb` - `function` - Overall callback function to receive the results object.

#### calls `{}` style

When you pass your calls in `{}` syntax, the `flow.data` is accessed by the keyname, and the `results` of the final callback is indexed by `key`

```js
var flow = new flowly.Flow();
flow.series({
	call1 : function(cb) {
		return cb(null, "foo");
	},
	call2 : function(cb) {
		// flow.data.call1 === "foo"
		return cb(null, "bar");
	}
}, function(err, results) {
	// results === flow.data === { call1 : "foo", call2 : "bar" }
});
```

#### calls `[]` style

When you pass your calls in `[]` syntax, the `flow.data` is accessed by index, and the `results` of the final callback is indexed by `index`.

```js
var flow = new flowly.Flow();
flow.series([
	function(cb) {
		return cb(null, "foo");
	},
	function(cb) {
		// flow.data[0] === "foo"
		return cb(null, "bar");
	}
], function(err, results) {
	// results === flow.data === ["foo", "bar"]
});
```

With all callbacks if the function returns 2 arguments (null, "foo") then the `flow.data` contains just the non-error portion. If the function returns more than 2 values, `flow.data` will contain an array of values.

```js
step1 : (cb) => cb(null, "foo")
flow.data.step1 === "foo"

step1 : (cb) => cb(null, "foo", "bar", "baz")
flow.data.step1 === ["foo", "bar", "baz"]
```

As with `async` if the function ever returns a truthy value on the first return argument, it will short-circuit and skip all subsequent steps.

In the following example `step2` is never executed, and the overall function will `cb` the error from `step1`.

```js
flow.series({
	step1 : (cb) => cb(new Error("fail")),
	step2 : (cb) => will not get here!
}, flow.cbLast(cb))
```

### Flow.prototype.cbLast(callback)

```js
var getPosts = function(cb) {
	var flow = new flowly.Flow();
	flow.series({
		getData : (cb) => db.collection("foo").find({}, cb),
		transform : (cb) => {
			var temp = getData.map(val => ({ url : val.title + "/" + val.recid + "/", title : val.title, recid : val.recid }));
			cb(null, temp);
		}
	}, flow.cbLast(cb));
}
```

In this case if you execute `getPosts(function(err, data) {})` the data returned will be the result of the final transform step, since it's the final executed step in the series.

### flow.data

`flow.data` allows access to the data keys returned from all previous steps to the current step. See the syntaxes for the different calls formats to see what the data structure is like.

### flow.last

`flow.last` returns the data from the last cb to execute. If a `flow.halt` was performed, it's the result of that. Usually the best practice is to use `flow.cbLast(cb)` directly.

### Flow.prototype.halt(arg1, arg2, ...)

Halts the execution of the series at the current step and proceed to the series callback. `flow.last` will be set to the return of this function.

If you intend to cb an error, do not use `flow.halt` instead simply `cb` the error as it will already shortcircuit. `flow.halt()` is used when you want to skip further steps but still return valid.

In the following example you can see we get a user, if we don't find a user, it's not an error condition, but we don't want to run the `permissions` step, so we exit out.

```js
var flow = new flowly.Flow();
flow.series({
	user : (cb) => getUser(username, password, cb),
	permissions : (cb) => {
		if (flow.data.user === undefined) { return flow.halt({ message : "User was not found." }); }
		
		getPermissions(flow.data.user.roleId);
	},
	result : (cb) => {
		flow.data.user.permissions = flow.data.permissions;
		return cb(null, { message : "Logged in", user : flow.data.user });
	}
}, flow.cbLast(cb));
```

### Flow.prototype.if

Conditionally execute a callback only if the return condition is `true`.

In the following example, we only execute the `getPermission` call if the user is not an admin. If the condition is not `true` the step is equivalent to `cb(null)`.

```js
var flow = new flowly.Flow();
flow.series({
	user : (cb) => getUser(username, password, cb),
	permissions : flow.if(() => flow.data.user.isAdmin === false, getPermission(flow.data.user.roleId, cb)),
	result : (cb) => {
		flow.data.user.permissions = flow.data.permissions;
		return cb(null, { message : "Logged in", user : flow.data.user });
	}
})
```