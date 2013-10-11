(function() {
	function Tester(subjects, target) {
		this.subjects = subjects;
		this.number = [0];
		this.target = target;
	};

	Tester.prototype = {
		test:function() {
			var best = null;
			for(var i = 0, length = this.subjects.length; i < length; i++) {
				var operator = undefined;
				var result = undefined;
				var parts = this.subjects[i].getPartsCount();
				var previousWasOperator = false;
				for (var j = 0; j < parts; j++) {
					var part = this.subjects[i].getPart(j).toString();
					if (part.match(/[0-9]/) !== null) {
						// It's a number
						this.number.push(part);
						previousWasOperator = false;
					} else {
						// Two operators together is a mistake - kill them off.
						// Unless it's +- => -
						//             ++ => +
						//             -+ => -
						//             -- => +
						if (previousWasOperator === true) {
							if (operator == '+' && part == '-') {
								operator = '-';
							} else if (operator == '+' && part == '+') {
								operator = '+';
							} else if (operator == '-' && part == '+') {
								operator = '-';
							} else if (operator == '-' && part == '-') {
								operator = '+';
							} else {
								this.number = [];
								result = 0;
								break;
							}
						}
						// It's an operator
						previousWasOperator = true;

						// If we have previous numbers, they need to be
						// put together.
						if (this.number.length > 0) {
							// If we haven't had a result so far, then
							// the result *is* the culmination of the numbers.
							// Otherwise find out what the operator is and
							// use that.
							if (result === undefined) {
								result = this._computeResult();
							} else {
								// Work out what the result should be, with
								// the last known operator.
								if (operator == '+') {
									result += this._computeResult();
								} else if (operator == '-') {
									result -= this._computeResult();
								} else if (operator == '/') {
									result = parseFloat(
										result / this._computeResult()
									);
								} else if (operator == '*') {
									result = result * this._computeResult();
								}
							}
						}
						operator = part;
					}
				}
				// If the last value was a number then it won't have been taken
				// into account, so we need to do a final check
				if (this.number.length > 0) {
					if (operator == '+') {
						result += this._computeResult();
					} else if (operator == '-') {
						result -= this._computeResult();
					} else if (operator == '/') {
						result = parseFloat(result / this._computeResult());
					} else if (operator == '*') {
						result = result * this._computeResult();
					}
				}
				if (best === null) {
					best = {
						index:i,
						result:result
					}
				} else {
					if (this.compare(best.result, result) === true) {
						best = {
							index:i,
							result:result
						};
					}
				}
				console.log(this.subjects[i].toString() + " gave a result of: " + result);
			}
			if (best !== null) {
				this.subjects[best.index].result = best.result;
				this.emit('breed', this.subjects[best.index]);
			} else {
				this.emit('alldied', {});
			}
		},
		compare:function(best, result) {
			var better = true;
			if (result == 0) {
				better = false;
			} else if ((this.target - result) != 0) {
				console.log(
					(this.target - Math.abs(best)) + " vs. " + (this.target - Math.abs(result))
				);
				better = (this.target - Math.abs(best) > this.target - Math.abs(result));
			}

			return better;
		},
		_computeResult:function() {
			var multiplier = 10
			result = parseInt(this.number.pop(), 10);
			while (this.number.length > 0) {
				result += (this.number.pop() * multiplier);
				multiplier *= 10;
			}

			return result;
		}
	};

	function Blob() {
		this.values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '+', '-', '/', '*'];
		this.parts = [];
	};

	Blob.prototype = {
		init:function() {
			for (var i = 0; i < 14; i++) {
				var random = parseInt(Math.random() * 13 + 1, 10);
				this.parts.push(
					this.values[random]
				);
			}
		},
		toString:function() {
			return this.parts.join(" ");
		},
		getPartsCount:function() {
			return this.parts.length;
		},
		getPart:function(index) {
			return this.parts[index];
		},
		mutate:function(mutatePartIndex) {
			var random = parseInt(Math.random() * 13 + 1, 10);
			var newValue = this.values[random];
			var oldValue = this.values[mutatePartIndex];
			while (newValue == oldValue) {
				random = parseInt(Math.random() * 13 + 1, 10);
				newValue = this.values[random];
			}
			this.parts[mutatePartIndex] = newValue;
		},
		clone:function() {
			var blob = new Blob();
			// JSON.parse JSON.stringify is a dirty way to clone an object.
			blob.parts = JSON.parse(JSON.stringify(this.parts));

			return blob;
		},
		hash:function() {
			return this.parts.join("");
		}
	};

	function Breeder(type, generations) {
		this.type = type;
		this.generations = generations;
		this.currentGeneration = 0;
		this.mutateChance = 0.05;
	};

	Breeder.prototype = {
		breed:function(quantity, survivor) {
			var things = [];
			if (this.currentGeneration == this.generations) {
				this.emit('breederdead');
			} else {
				if (survivor) {
					things.push(survivor.clone());
					var survivorHash = survivor.hash();
					for (var i = 0; i < quantity; i++) {
						var thing = survivor.clone();
						this.mutate(thing);
						while (thing.hash() == survivorHash) {
							this.mutate(thing);
						}
						things.push(thing);
					}
				} else {
					for (var i = 0; i < quantity; i++) {
						var thing = new this.type();
						thing.init();
						things.push(thing);
					}
				}

				this.currentGeneration++;
				this.emit('bred', {things:things});
			}
		},
		mutate:function(thing) {
			var partsLength = thing.getPartsCount();
			for (var i = 0; i < partsLength; i++) {
				if (Math.random() < this.mutateChance) {
					thing.mutate(i);
				}
			}
		}
	};

	window.Game = {
		run:function() {
			var target = 42;
			var generations = 5;
			var quantity = 10;
			var breeder = new Breeder(Blob, generations);
			Events(breeder);

			breeder.on('bred', function(data) {
				var tester = new Tester(data.things, target);
				Events(tester);
				tester.on('breed', function(survivor) {
					console.log(
						"We have a survivor! " + survivor.toString() + " with result: " + survivor.result
					);
					breeder.breed(quantity, survivor);
				});
				tester.on('alldied', function() {
					console.log("All died...");
					blobs = breeder.breed(quantity, null);
				});
				tester.test();
			});
			breeder.on('breederdead', function() {
				console.log("Breeder Died");
			});
			breeder.breed(quantity, null);
		}
	};
})();