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
				this.number = [0];
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
								result = null;
								break;
							}
						}
						if (j === 0 && (part == '/' || part == '*')) {
							this.number = [];
							result = null;
							break;
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
				if (result !== null) {
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
				}

				if (best === null || best.result === null) {
					best = {
						index:i,
						result:result
					}
				} else {
					if (this.compare(best.result, result) === true) {
						var oldI = best.index;
						var newI = i;
						// window.Game.displayMessage(
						// 	this.subjects[oldI].toString() + " = " +
						// 	best.result + " was worse than " +
						// 	this.subjects[i].toString() + " = " +
						// 	result
						// );
						best = {
							index:i,
							result:result
						};
					}
				}
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
			if (result === null) {
				better = false;
			} else if (result === this.target) {
				better = true;
			} else {
				var oldVal = Math.abs(parseFloat(best/this.target) - 1);

				var newVal = Math.abs(parseFloat(result/this.target) - 1);
				var min = Math.min(oldVal, newVal);
				better = min === newVal;
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
					for (var i = 1; i < quantity; i++) {
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
			var generations = 50;
			var quantity = 7;
			var breeder = new Breeder(Blob, generations);
			var game = this;

			Events(breeder);

			// Event triggered when a singular round of testing has occurred.
			breeder.on('bred', function(data) {
				game.prettyDisplay(data.things);
				var tester = new Tester(data.things, target);
				Events(tester);
				tester.on('breed', function(survivor) {
					game.displayMessage(
						"We have a survivor! " + survivor.toString() + " = " + survivor.result
					)

					breeder.breed(quantity, survivor);
				});
				tester.on('alldied', function() {
					game.displayMessage("All died...");
					blobs = breeder.breed(quantity, null);
				});
				tester.test();
			});

			// When we have gone through the number of generations we're looking for.
			breeder.on('breederdead', function() {
				game.displayMessage("Breeder Died");
			});

			// Initial breed which will trigger the 'bred' event above.
			breeder.breed(quantity, null);
		},

		prettyDisplay: function(jsonObject) {
			var message = "";
			$.each(jsonObject, function(key, value) {
				message += "<div class='blob'>" + value + "</div>";
			});
			this.displayMessage(message);
		},

		displayMessage: function(message) {
			$(document.body).append(
				$("<div class='message'>").html(message)
			);
		}
	};
})();
