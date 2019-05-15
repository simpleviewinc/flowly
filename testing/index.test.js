var assert = require("assert");

var asyncLib = require("../src/index.js");

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
				results : [
					null,
					[
						"one",
						["two", "three"],
						["four", "five"]
					]
				]
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
			},
			{
				name : "halt without cb",
				useFlow : true,
				calls : [
					function(cb) {
						cb(null, "one");
					},
					function(cb) {
						currentTest.flow.halt("two");
					},
					function(cb) {
						throw new Error("Should not get here!");
					}
				],
				results : [
					null,
					[
						"one",
						"two"
					]
				],
				last : "two"
			},
			{
				name : "multi-arg halt without cb",
				useFlow : true,
				calls : [
					function(cb) {
						cb(null, "one");
					},
					function(cb) {
						currentTest.flow.halt("two", "three");
					},
					function(cb) {
						throw new Error("Should not get here!");
					}
				],
				results : [
					null,
					[
						"one",
						["two", "three"]
					]
				],
				last : ["two", "three"]
			},
			{
				name : "halt with nothing",
				useFlow : true,
				calls : [
					function(cb) {
						cb(null, "one");
					},
					function(cb) {
						currentTest.flow.halt();
					},
					function(cb) {
						throw new Error("Should not get here!");
					}
				],
				results : [
					null,
					[
						"one",
						undefined
					]
				],
				last : undefined
			},
			{
				name : "async function",
				calls : [
					async function() {
						return true;
					}
				],
				results : [
					null,
					[
						true
					]
				]
			},
			{
				name : "async mixing with callbacks",
				calls : [
					function(cb) {
						return cb(null, "one");
					},
					async function() {
						return "two";
					},
					function(cb) {
						return cb(null, "three");
					}
				],
				results : [
					null,
					[
						"one",
						"two",
						"three"
					]
				]
			},
			{
				name : "async handling errors",
				calls : [
					async function() {
						throw new Error("die!");
					},
					function(cb) {
						throw new Error("should not get here!!!");
					}
				],
				results : [
					new Error("die!")
				]
			},
			{
				name : "async array return should remain array",
				calls : [
					async function() {
						return ["one", "two"]
					}
				],
				results : [
					null,
					[
						["one", "two"]
					]
				]
			},
			{
				name : "async data access intact",
				useFlow : true,
				calls : {
					foo : function(cb) {
						return cb(null, "fooValue");
					},
					bar : async function() {
						return "barValue";
					},
					baz : async function() {
						assert.strictEqual(currentTest.flow.data.foo, "fooValue");
						assert.strictEqual(currentTest.flow.data.bar, "barValue");
					}
				},
				results : [
					null,
					{
						foo : "fooValue",
						bar : "barValue",
						baz : undefined
					}
				]
			},
			{
				name : "async should work with last",
				useFlow : true,
				calls : {
					foo : async function() {
						return "fooValue";
					},
					bar : async function() {
						return "barValue";
					}
				},
				results : [
					null,
					{
						foo : "fooValue",
						bar : "barValue"
					}
				],
				last : "barValue"
			},
			{
				name : "async should be able to have an async function that returns a promise",
				useFlow : true,
				calls : {
					foo : async function() {
						return new Promise(function(resolve) {
							setImmediate(function() {
								resolve(true);
							});
						});
					},
					bar : function(cb) {
						assert.strictEqual(currentTest.flow.data.foo, true);
						return cb(null, "barValue");
					}
				},
				results : [
					null,
					{
						foo : true,
						bar : "barValue"
					}
				]
			}
		]
		
		var currentTest;
		
		tests.forEach(function(test) {
			it(test.name, function(done) {
				currentTest = test;
				
				if (test.useFlow) {
					var flow = test.flow = new asyncLib.Flow();
				}
				
				(test.useFlow ? flow.series.bind(flow) : asyncLib.series)(test.calls, function(...args) {
					assert.deepStrictEqual(args, test.results);
					
					if (test.last !== undefined) {
						assert.deepStrictEqual(test.last, flow.last);
					}
					
					done();
				});
			});
		});
	});
	
	describe("batch", function(done) {
		var called;
		
		beforeEach(function(done) {
			called = 0;
			return done();
		});
		
		var batchFn = function(items, cb) {
			called++
			return cb(null, items.map(val => `${called}_${val}`));
		}
		
		var tests = [
			{
				name : "batch 1",
				args : {
					items : [1,2,3],
					batchSize : 1,
					concat : true,
					fn : batchFn
				},
				result : [
					"1_1",
					"2_2",
					"3_3"
				]
			},
			{
				name : "one",
				args : {
					items : [1],
					batchSize : 10,
					concat : true,
					fn : batchFn
				},
				result : ["1_1"]
			},
			{
				name : "batch multiple",
				args : {
					items : [1,2,3,4,5,6,7,8,9,10],
					batchSize : 3,
					concat : true,
					fn : batchFn
				},
				result : [
					"1_1",
					"1_2",
					"1_3",
					"2_4",
					"2_5",
					"2_6",
					"3_7",
					"3_8",
					"3_9",
					"4_10"
				]
			},
			{
				name : "batch multiple perfect ending",
				args : {
					items : [1,2,3,4,5],
					batchSize : 5,
					concat : true,
					fn : batchFn
				},
				result : [
					"1_1",
					"1_2",
					"1_3",
					"1_4",
					"1_5"
				]
			},
			{
				name : "error mid-way",
				args : {
					items : [1,2,3,4,5],
					batchSize : 2,
					concat : true,
					fn : function(items, cb) {
						called++;
						if (called === 2) { return cb(new Error("error mid-way")); }
						
						return cb(null, ["valid"]);
					}
				},
				error : /error mid-way/
			},
			{
				name : "array of objs",
				args : {
					items : [{ id : 1 }, { id : 2 }, { id : 3 }],
					batchSize : 2,
					concat : true,
					fn : function(items, cb) {
						called++;
						
						return cb(null, items.map(val => `${called}_${val.id}`));
					}
				},
				result : [
					"1_1",
					"1_2",
					"2_3"
				]
			},
			{
				name : "dropped return",
				args : {
					items : [1,2,3,4,5],
					batchSize : 2,
					fn : function(items, cb) {
						return cb(null);
					}
				},
				result : [undefined, undefined, undefined]
			},
			{
				name : "dropped return concat",
				args : {
					items : [1,2,3,4,5],
					batchSize : 2,
					concat : true,
					fn : function(items, cb) {
						return cb(null, []);
					}
				},
				result : []
			},
			{
				name : "non-array return no concat",
				args : {
					items : [1,2,3,4,5],
					batchSize : 2,
					fn : function(items, cb) {
						return cb(null, items.reduce((prev, curr) => {
							prev[curr] = true;
							return prev;
						}, {}));
					}
				},
				result : [
					{ 1 : true, 2 : true },
					{ 3 : true, 4 : true },
					{ 5 : true }
				]
			},
			{
				name : "non-array return merge",
				args : {
					items : [1,2,3,4,5],
					batchSize : 2,
					merge : true,
					fn : function(items, cb) {
						return cb(null, items.reduce((prev, curr) => {
							prev[curr] = true;
							return prev;
						}, {}));
					}
				},
				result : {
					1 : true,
					2 : true,
					3 : true,
					4 : true,
					5 : true
				}
			},
			{
				name : "non-array merge one batch",
				args : {
					items : [1,2],
					batchSize : 10,
					merge : true,
					fn : function(items, cb) {
						return cb(null, items.reduce((prev, curr) => {
							prev[curr] = true;
							return prev;
						}, {}));
					}
				},
				result : {
					1 : true,
					2 : true
				}
			}
		]
		
		tests.forEach(function(test) {
			it(test.name, function(done) {
				asyncLib.batch(test.args, function(err, result) {
					if (test.error) {
						assert.ok(err.message.match(test.error));
						return done();
					}
					
					assert.ifError(err);
					
					assert.deepStrictEqual(result, test.result);
					
					return done();
				});
			});
		});
	});
});