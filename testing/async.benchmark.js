var flowly = require("../index.js");
var async = require("async");

var foo = function(cb) { return cb(null); };
var bar = function(cb) { return cb(null); };
var baz = function(cb) { return cb(null); };

suite.add("flow", function(done) {
	var flow = new flowly.Flow();
	return flow.series([
		foo,
		bar,
		baz
	], done);
});

suite.add("series", function(done) {
	return async.series([
		foo,
		bar,
		baz
	], done);
});

// suite.add("callbacks", function(done) {
// 	return foo(function(err, result) {
// 		if (err) { return done(err); }
		
// 		return bar(function(err, result) {
// 			if (err) { return done(err); }
			
// 			return baz(function(err, result) {
// 				if (err) { return done(err); }
				
// 				return done();
// 			});
// 		});
// 	});
// });