(function() {
	function Tester(subjects, target) {
		this.subjects = subjects;
		this.number = [];
		this.target = target;
	};

	Tester.prototype = {
		test:function() {
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
						if (previousWasOperator === true) {
							this.number = [];
							result = 0;
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
									result = parseInt(
										result / this._computeResult(),
										10
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
						result = parseInt(result / this._computeResult(), 10);
					} else if (operator == '*') {
						result = result * this._computeResult();
					}
				}
				// if (result - this.target === 0) {
				// 	// perfect
				// 	result = 999999999;
				// } else {
				// 	result = 1 / (Math.abs(result) - this.target));
				// }
				console.log(this.subjects[i].toString() + " gave a result of: " + result);
			}
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
		}
	};

	function Breeder(type) {
		this.type = type;
	};

	Breeder.prototype = {
		breed:function(quantity, survivor) {
			var things = [];
			for (var i = 0; i < quantity; i++) {
				var thing = new this.type();
				thing.init();
				things.push(thing);
			}

			return things;
		}
	};

	window.Game = {
		run:function() {
			var target = 42;
			var breeder = new Breeder(Blob);
			var blobs = breeder.breed(10, null);

			var tester = new Tester(blobs, target);
			tester.test();
		}
	};
})();