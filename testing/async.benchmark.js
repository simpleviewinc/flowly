var flowly = require("../index.js");
var async = require("async");
var neoasync = require("neo-async");

var foo = function(cb) { return cb(null); };
var bar = function(cb) { return cb(null); };
var baz = function(cb) { return cb(null); };

var fooP = Promise.resolve(true);
var barP = Promise.resolve(true);
var bazP = Promise.resolve(true);

suite.add("new flowly.Flow", function(done) {
	var flow = new flowly.Flow();
	return flow.series([
		foo,
		bar,
		baz
	], done);
});

suite.add("async.series", function(done) {
	return async.series([
		foo,
		bar,
		baz
	], done);
});

suite.add("neoasync.series", function(done) {
	return neoasync.series([
		foo,
		bar,
		baz
	], done);
});

suite.add("native callbacks", function(done) {
	return foo(function(err, result) {
		if (err) { return done(err); }
		
		return bar(function(err, result) {
			if (err) { return done(err); }
			
			return baz(function(err, result) {
				if (err) { return done(err); }
				
				return done();
			});
		});
	});
});

suite.add("native promises", function(done) {
	return fooP.then(barP).then(bazP).then(done);
});