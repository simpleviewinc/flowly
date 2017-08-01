var assert = require("assert");

var asyncLib = require("../index.js");

describe(__filename, function() {
	describe("Flow.series array", function() {
		it("should do standard array behavior", function(done) {
			var flow = new asyncLib.Flow();
			
			flow.series([
				function(cb) {
					cb(null, "one");
				},
				function(cb) {
					cb(null, "two", "three");
				},
				function(cb) {
					cb(null, "four");
				}
			], function(err, results) {
				assert.ifError(err);
				
				assert.deepEqual(results, [
					"one",
					["two", "three"],
					"four"
				]);
				
				assert.equal(flow.last, "four");
				assert.strictEqual(flow.timers, undefined);
				
				done();
			});
		});
		
		it("should halt on error", function(done) {
			var flow = new asyncLib.Flow();
			
			flow.series([
				function(cb) {
					cb(new Error("success"));
				},
				function(cb) {
					throw new Error("Should not get here!");
				}
			], function(err, results) {
				assert.equal(err.message, "success");
				
				done();
			});
		});
		
		it("should support halt with one arg", function(done) {
			var flow = new asyncLib.Flow();
			
			flow.series([
				function(cb) {
					cb(null, "one");
				},
				function(cb) {
					flow.halt("two", cb);
				},
				function(cb) {
					throw new Error("Should not get here!");
				}
			], function(err, results) {
				assert.ifError(err);
				
				assert.deepEqual(results, [
					"one",
					"two"
				]);
				
				assert.equal(flow.last, "two");
				
				done();
			});
		});
		
		it("should support halt with multiple args", function(done) {
			var flow = new asyncLib.Flow();
			
			flow.series([
				function(cb) {
					cb(null, "one");
				},
				function(cb) {
					flow.halt("two", "three", cb);
				},
				function(cb) {
					throw new Error("Should not get here!");
				}
			], function(err, results) {
				assert.ifError(err);
				
				assert.deepEqual(results, [
					"one",
					["two", "three"]
				]);
				
				assert.deepEqual(flow.last, ["two", "three"]);
				
				done();
			});
		});
		
		it("should cbLast", function(done) {
			var flow = new asyncLib.Flow();
			
			var cb = function(err, data) {
				assert.ifError(err);
				assert.equal(data, "last");
				
				done();
			}
			
			flow.series([
				function(cb) {
					cb(null, "one");
				},
				function(cb) {
					cb(null, "last");
				}
			], flow.cbLast(cb));
		});
		
		it("should cbLast with halt", function(done) {
			var flow = new asyncLib.Flow();
			
			var cb = function(err, data) {
				assert.strictEqual(data, "two");
				return done();
			}
			
			flow.series([
				function(cb) {
					cb(null, "one")
				},
				function(cb) {
					return flow.halt("two", cb)
				},
				function(cb) {
					throw new Error("never here")
				}
			], flow.cbLast(cb))
		});
		
		it("should cbLast with halt multi", function(done) {
			var flow = new asyncLib.Flow();
			
			var cb = function(err, data) {
				assert.deepStrictEqual(data, ["two", "three"]);
				return done();
			}
			
			flow.series([
				function(cb) {
					cb(null, "one")
				},
				function(cb) {
					return flow.halt("two", "three", cb)
				},
				function(cb) {
					throw new Error("never here")
				}
			], flow.cbLast(cb))
		});
		
		it("should have timers on array", function(done) {
			var flow = new asyncLib.Flow({ timers : true });
			
			flow.series([
				function(cb) {
					cb(null, "one");
				},
				function(cb) {
					setTimeout(function() {
						cb(null, "two");
					}, 10);
				}
			], function(err, results) {
				assert.ifError(err);
				
				assert.strictEqual(results[0], "one");
				assert.strictEqual(results[1], "two");
				assert.strictEqual(flow.timers.total >= 10, true);
				assert.strictEqual(flow.timers.results[0] < 3, true);
				assert.strictEqual(flow.timers.results[1] >= 10, true);
				
				done();
			});
		});
		
		it("should if", function(done) {
			var flow = new asyncLib.Flow();
			flow.series({
				foo : function(cb) {
					return cb(null, "foo");
				},
				bar : flow.if(function() { return flow.data.foo === "foo" }, function(cb) {
					return cb(null, "bar");
				}),
				baz : flow.if(function() { return flow.data.foo === "notFoo" }, function(cb) {
					throw new Error("FAILURE");
				}),
				qux : function(cb) {
					return cb(null, "qux");
				}
			}, function(err, results) {
				assert.ifError(err);
				
				assert.deepStrictEqual(results, {
					foo : "foo",
					bar : "bar",
					baz : undefined,
					qux : "qux"
				});
				
				return done();
			});
		});
	});
	
	describe("Flow series object", function() {
		it("should do standard array behavior", function(done) {
			var flow = new asyncLib.Flow();
			
			flow.series({
				"one" : function(cb) {
					cb(null, "one");
				},
				"two" : function(cb) {
					cb(null, "two", "three");
				},
				"three" : function(cb) {
					cb(null);
				},
				"four" : function(cb) {
					cb(null, "four");
				}
			}, function(err, results) {
				assert.ifError(err);
				
				assert.deepStrictEqual(results, {
					"one" : "one",
					"two" : ["two", "three"],
					"three" : undefined,
					"four" : "four"
				});
				
				assert.equal(flow.last, "four");
				
				assert.strictEqual(flow.timers, undefined);
				
				done();
			});
		});
		
		it("should have timers on object", function(done) {
			var flow = new asyncLib.Flow({ timers : true });
			
			flow.series({
				"one" : function(cb) {
					cb(null, "one");
				},
				"two" : function(cb) {
					setTimeout(function() {
						cb(null, "two");
					}, 10);
				}
			}, function(err, results) {
				assert.ifError(err);
				
				assert.strictEqual(results.one, "one");
				assert.strictEqual(results.two, "two");
				assert.strictEqual(flow.timers.total >= 10, true);
				assert.strictEqual(flow.timers.results.one < 3, true);
				assert.strictEqual(flow.timers.results.two >= 10, true);
				
				done();
			});
		});
	});
	
	describe("series", function(done) {
		var tests = [
			{
				name : "object- no calls",
				calls : {},
				results : [null, {}]
			},
			{
				name : "object - one call",
				calls : {
					foo : function(cb) {
						cb(null, "data");
					}
				},
				results : [null, { foo : "data" }]
			},
			{
				name : "object - one call multi-return object",
				calls : {
					foo : function(cb) {
						cb(null, "data", "something");
					}
				},
				results : [null, { foo : ["data", "something"] }]
			},
			{
				name : "object - mixing returns",
				calls : {
					foo : function(cb) {
						cb(null, "one");
					},
					bar : function(cb) {
						cb(null, "two", "three");
					},
					qux : function(cb) {
						cb(null, "four", "five");
					}
				},
				results : [null, { 
					foo : "one",
					bar : ["two", "three"],
					qux : ["four", "five"]
				}]
			},
			{
				name : "object - err",
				calls : {
					foo : function(cb) {
						cb(null, "one");
					},
					bar : function(cb) {
						cb(new Error("yes"));
					},
					baz : function(cb) {
						throw new Error("should not get here");
					}
				},
				results : [
					new Error("yes")
				]
			},
			{
				name : "array - no calls",
				calls : [],
				results : [null, []]
			},
			{
				name : "array - one call",
				calls : [
					function(cb) {
						cb(null, "data");
					}
				],
				results : [null, ["data"]]
			},
			{
				name : "array - one call multi-return object",
				calls : [
					function(cb) {
						cb(null, "data", "something");
					}
				],
				results : [null, [["data", "something"]]]
			},
			{
				name : "array - mixing returns",
				calls : [
					function(cb) {
						cb(null, "one");
					},
					function(cb) {
						cb(null, "two", "three");
					},
					function(cb) {
						cb(null, "four", "five");
					}
				],
				results : [null, [
					"one",
					["two", "three"],
					["four", "five"]
				]]
			},
			{
				name : "array - err",
				calls : [
					function(cb) {
						cb(null, "one");
					},
					function(cb) {
						cb(new Error("yes"));
					},
					function(cb) {
						throw new Error("should not get here");
					}
				],
				results : [
					new Error("yes")
				]
			}
		]
		
		tests.forEach(function(test) {
			it(test.name, function(done) {
				asyncLib.series(test.calls, function(...args) {
					assert.deepStrictEqual(args, test.results);
					
					done();
				});
			});
		});
	});
});