var GreenLight = GreenLight || {};

/* The constructor for the GreenLight (singleton) instance. */
GreenLight.__init__ = function (GreenLight, undefined) {

    /* _rules: _rules contains pairs of names and "constraints," which consist of functions, regular expressions, 
    ** and other rules. Constraints are simplified down to a single function which returns the equivalent 
    ** of the expression formed by calling the functions it is composed of.
    **
    ** _WINDOW_LOADED: We need it to keep track of the window state. Defaults to false until I can find out how to tell
    ** if the window (or the DOM) is currently loaded. TODO: Rename since it isn't a constant.
    */
    var _rules = {}, _WINDOW_LOADED = false;

    // I try to keep anything that is not a declaration in here. The place to add more default rules.
    var _init = function () {
    
        /* Built-in rules that accept or deny based on value should accept epsilon or lambda, i.e. the empty string
          unless it is an explicit requirement, e.g., for the "required" rule. TODO: Add more rules. */
        _addRules([
                ['alpha', /^[a-zA-Z]*$/],
                ['alphanumeric', /^[a-zA-Z0-9_]*$/],
                ['email', /^(([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})){0,1}$/i],
                ['checked', function (e) { return e.checked; } ],
                ['empty', function (e) { return this.value === ""; } ],
                ['required', function (e) { return this.value !== "" || e.checked == true; } ],
                ['enabled', function (e) { return e.disabled !== false && e.type != "hidden"; } ]
        ]);

        // Attach an event to the window load event to let us know once the window and its components
        // have loaded.
        GreenLight.utils.events.addEvent(window, "load", function () {
            _WINDOW_LOADED = true;
        });
    };

    // Convert regular expression to a function equivalent of calling the test method on an element's value.
    var _regexToFunction = function (regex) {
        return function (element) {
            return regex.test(this.value);
        }
    };

    // Convert some arbitrary type to a function we can use, if possible.
    var _getFunc = function (x) {
        if (x instanceof Function) return x; // Already a function
        if (x instanceof RegExp) return _regexToFunction(x);
        if (x instanceof Array) return _toFunc(x);
        
        if (typeof x == "string") {
            var rule = _rules[x];
            if (!rule) {
                throw "Constraint '" + x + "' not found.";
            }
            return rule.constraint;
        }
        
        return;
    };

    // Simplifies a sequence of functions into a single functions, from left to right. 
    var _reduce = function (sequence, fn) {
        var result = _toFunc(sequence[0]);

        for (var i = 0, length = sequence.length - 1; i < length; i++) {
            result = _makeFunc(result, _toFunc(sequence[i + 1]), fn);
        }

        return result;
    };

    // A function factory that "merges" two functions with the specified binary operator.
    var _makeFunc = function (x, y, operator) {
        return function (e) {
            return operator(x.call(this, e), y.call(this, e));
        };
    };

    var _and = function (sequence) {
        return _reduce(sequence, function (x, y) {
            return x && y;
        });
    }

    // Checks if it is not a list (arrays or array-like objects). 
    var _notList = function (sequence) {
        return sequence.length == undefined || 
               typeof sequence == "string" || 
               typeof sequence == "function"; // String and Functions both have length properties
    };

    // Works with _reduce to simplify lists of constraints.
    var _toFunc = function (list, name) {
        if (_notList(list)) return _getFunc(list);
        
        var newList = [], result;
        for (var i = 0, length = list.length; i < length; i++) {
            result = _getFunc(list[i]);
            result && newList.push(result);
        }

        return _and(newList);
    };

    // Adds a rule.
    var _addRule = function (name, constraint) {
        _rules[name] = {
            name: name,
            constraint: _toFunc(constraint)
        }
    };

    // Adds multiple rules.
    var _addRules = function (rules) {
        for (var i = 0, length = rules.length; i < length; i++) {
            _addRule(rules[i][0], rules[i][1]);
        }
    };
    
    var _join = function (list, str) {
        return Array.prototype.join.call(list, str);
    };

    _init();

    return {

        // Adds one rule.
        addRule: _addRule,

        // Adds multiple rules.
        addRules: _addRules,

        // Whether or not we can safely operate on the DOM.
        isReady: function () { return _WINDOW_LOADED; },

        // Converts a rule to a function.
        toFunction: _toFunc,

        // EXPOSE MODULES UNDER 'MODULE' NAMESPACE:
        modules: GreenLight,

        /* The following functions serve as predicates that can be used when building rules or constraints.
        ** All of the "logical" (and, or, xor, implies) predicates are variadic, with the exception of not.
        ** Assume the operands will be evaluated from left to right. Also assume the regular rules of logic
        ** will apply. The other predicates are more specific in that they will access specific element 
        ** properties.
        */
        // And: All constraints must pass.
        and: function () {
            return _and.call(null, arguments);
        },

        // Or: At least one of the constraints pass..
        or: function () {
            return _reduce(arguments, function (x, y) {
                return x || y;
            });
        },

        // Exclusive or: Only one of the constraints must pass.
        xor: function () {
            return _reduce(arguments, function (x, y) {
                return !x != !y;
            });
        },

        // Not: The negation of a constraint.
        not: function (constraint) {
            var fn = _getFunc(constraint);
            return function (e) {
                return !fn.call(null, e);
            };
        },

        // Accept: Whether the value ends with the given extensions.
        accept: function () {
            return _regexToFunction(new RegExp(".+\\.("+_join(arguments, "|")+")$", "i"));
        },
        
        // Starts With: Whether the argument starts with the argument(s)
        endsWith: function () {
            return _regexToFunction(new RegExp("("+_join(arguments, "|")+")$", "i"));
        },
        
        // Starts With: Whether the argument starts with the argument(s)
        startsWith: function () {
            return _regexToFunction(new RegExp("^("+_join(arguments, "|")+")", "i"));
        },
        
        // Implication: Equivalent to logical implication: p -> q, or "if p then q" or likewise 
        // "if not p or q"
        implies: function () {
            return _reduce(arguments, function (x, y) {
                return !x || y;
            });
        },

        // Matches: Whether the element's value will match the value of another element of the same 
        // form with the name "name."
        matches: function (name) {
            return function (e) {
                return this.getForm()[name].value === this.value;
            };
        },

        // Matches Selector: Whether the element matches the provided CSS selector.
        matchesSelector: function (selector) {
            return function (e) {
                return GreenLight.selector.matchesSelector(e, selector);
            };
        },

        // Equals: Whether the element value equals the specified value. Try to use strings.
        equals: function (value) {
            return function (e) {
                return this.value === value;
            };
        },

        // Less Than: Whether the element value is less than the given value (an integer).
        lessThan: function (value) {
            if (typeof value !== "number") throw ("Argument must be a Number.");
            return function (e) {
                var eVal = parseFloat(this.value, 10);
                return eVal < value;
            };
        },

        // Greater Than: Whether the element value is larger than the given value (an integer).
        greaterThan: function (value) {
            if (typeof value !== "number") throw ("Argument must be a Number.");
            return function (e) {
                var eVal = parseFloat(this.value, 10);
                return eVal > value;
            };
        },

        // Selected: If obj is a string, it will return whether the value of the currently selected 
        // item equals obj. If obj is a Number, it will return whether the index of the currently 
        // selected item equals obj.
        selected: function (obj) {
            if (typeof obj == "string") {
                return function (e) {
                    return e.options[e.selectedIndex].value === obj;
                };
            } else if (typeof obj === "number") {
                return function (e) {
                    return e.selectedIndex === obj;
                }
            }
        },

        // Require: If the element with the given name passed the given constraint (defaults to "required" if constraint not given).
        require: function (elementName, constraint) {
            constraint = _toFunc(constraint || "required");
            return function (e) {
                return constraint(this.getForm()[elementName]);
            };
        },

        // Property equals: Whether the property of the DOMElement equals the given value.
        propertyEquals: function (property, value) {
            return function (e) {
                return value === e[property];
            };
        },

        // Contains: Whether the text is found inside the element's value. Use the boolean caseSensitive
        // flag to specify case sensitivy.
        contains: function (text, caseSensitive) {
            return _regexToFunction(new RegExp(text, caseSensitive ? "" : "i"));
        },

        // Length: Whether or not the element value's length is within the range. From min, up to and 
        // including max. NOTE: The max parameter can be omitted to specify only a minimum length.
        length: function (min, max) {
            if (max === undefined) max = Number.MAX_VALUE;
            return function (e) {
                return min <= this.value.length && this.value.length <= max;
            };
        }
    };
};

GreenLight.instance = GreenLight.__init__(GreenLight);
GreenLight.instance.create = GreenLight.validator(GreenLight);
// Replace the GreenLight object with the instance.
GreenLight = GreenLight.instance;