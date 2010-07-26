var GreenLight = GreenLight || {};
GreenLight.core = GreenLight.core || {};

/* The constructor for the GreenLight (singleton) instance. */
GreenLight.core.__init__ = function (GreenLight, undefined) {

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
        _addRules([
                ['alpha', /^[a-zA-Z]*$/],
                ['alphanumeric', /^[a-zA-Z0-9_]*$/],
                ['email', /^([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})$/i],
                ['checked', function (e) { return e.checked; } ],
                ['empty', function (e) { return e.value === ""; } ],
                ['required', function (e) { return e.value !== ""; } ]
            ]);

        // Attach an event to the window load event to let us know once the window and its components
        // have loaded.
        GreenLight.utils.events.addEvent(window, "load", function () {
            _WINDOW_LOADED = true;
        });

        // Flush all events on window unload to avoid a memory leak in IE.
        GreenLight.utils.events.addEvent(window, "unload", GreenLight.utils.events.EventCache.flush);
    };

    // Convert regular expression to a function equivalent of calling the test method on an element's value.
    var _regexToFunction = function (regex) {
        var regexp = regex || /^.*$/;
        return function (element) {
            if (element.value === undefined) return function () { };
            return regexp.test(element.value);
        }
    };

    // Convert some arbitrary type to a function we can use, if possible.
    var _getFunc = function (x) {
        if (x instanceof Function) return x;
        if (x instanceof RegExp) return _regexToFunction(x);

        if (typeof x === "string") {
            var rule = _rules[x];
            if (rule === undefined) {
                throw ("Constraint '" + x + "' not found.")
            }
            return rule.constraint;
        }

        throw ("Constraint '" + x + "' type not supported.");
    };

    // Simplifies a sequence of functions into a single functions, from left to right. Joined using AND.
    var _reduce = function (sequence, fn) {
        if (sequence.length === undefined) return;

        var result = sequence.length !== 0 ?
            _toFunc(sequence[0]) :
            function () { return true; };

        for (var i = 0; i < sequence.length - 1; i++) {
            result = _makeFunc(result, _getFunc(sequence[i + 1]), fn);
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

    // Checks if it is not a sequence (arrays or array-like objects). 
    // TODO: Redo to check if it *is* a sequence.
    var _notSequence = function (sequence) {
        return sequence.length === undefined ||
               sequence instanceof RegExp ||
               typeof sequence === "string" ||
               sequence instanceof Function;
    };

    // Works with _reduce to simplify sequences of constraints.
    var _toFunc = function (sequence) {
        if (_notSequence(sequence)) return _getFunc(sequence);

        var newSequence = [];

        for (var i = 0, length = sequence.length; i < length; i++) {
            var result = null, constraint = sequence[i];
            result = _getFunc(constraint);
            result && newSequence.push(result);
        }

        return _and(newSequence);
    };

    // Adds a rule.
    var _addRule = function (name, constraint) {
        _rules[name] = {
            name: name,
            constraint: _toFunc(constraint)
        }
    };

    // Adds multiple rules.
    var _addRules = function (arr) {
        for (var i = 0, length = arr.length; i < length; i++) {
            _addRule(arr[i][0], arr[i][1]);
        }
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

        // We can use this to selectively export modules.
        utils: { results: GreenLight.utils.results },

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
                return this.getForm()[name].value === e.value;
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
                return e.value === value;
            };
        },

        // Less Than: Whether the element value is less than the given value (an integer).
        lessThan: function (value) {
            if (typeof value !== "number") throw ("Argument must be a Number.");
            return function (e) {
                var eVal = parseFloat(e.value, 10);
                return eVal < value;
            };
        },

        // Greater Than: Whether the element value is larger than the given value (an integer).
        greaterThan: function (value) {
            if (typeof value !== "number") throw ("Argument must be a Number.");
            return function (e) {
                var eVal = parseFloat(e.value, 10);
                return eVal > value;
            };
        },

        // Selected: If obj is a string, it will return whether the value of the currently selected 
        // item equals obj. If obj is a Number, it will return whether the index of the currently 
        // selected item equals obj.
        selected: function (obj) {
            if (typeof obj === "string") {
                return function (e) {
                    return e.options[e.selectedIndex].value === obj;
                };
            } else if (typeof obj === "number") {
                return function (e) {
                    return e.selectedIndex === obj;
                }
            }

            throw ("Object type not supported.");
        },

        // Contains: Whether the text is found inside the element's value. Use the boolean caseSensitive
        // flag to specify case sensitivy.
        contains: function (text, caseSensitive) {
            if (text === undefined) throw ("No search text provided.");
            return _regexToFunction(new RegExp(text, caseSensitive ? "" : "i"));
        },

        // Length: Whether or not the element value's length is within the range. From min, up to and 
        // including max. NOTE: The max parameter can be omitted to specify only a minimum length.
        length: function (min, max) {
            if (max === undefined) max = Number.MAX_VALUE;
            return function (e) {
                return min <= e.value.length && e.value.length <= max;
            };
        }
    };
};

// Returns the constructor for validator instances. This will be rebound to GreenLight.create during initialization.
// As I have said, and will say, this method of creating the constructor needs to be redone.
GreenLight.core.validator = function (GreenLight, undefined) {
    // We expect the form id rather than the element.
    return function (formId, initSettings) {
        if (formId === undefined) {
            throw ("No form id provided.");
        }

        // _form: Is (or will be) a reference to the actual DOM node for the from we're working on.
        // i18n: An object that stores translations to add internationalization support.
        // _elements: An object that stores element specific settings. 
        var _form = {}, _elements = {}, _i18n = {}, _settings = {};
        var _EVENTS_ATTACHED = false, _ATTACH_CALLED = false, init;

        init = function () {
            _settings = _merge(initSettings || {}, {
                attachOnLoad: true,
                callbackOnMassValidate: true,
                callbackOnValidate: true,
                validateOnEvent: true,
                validateOnEventType: "change",
                defaultSuccess: undefined,
                defaultFail: undefined,
                locale: "default",
                onSuccess: function () { return true; },
                onFail: function (event) {
                    if (event.stopPropagation) {
                        event.stopPropagation();
                        event.preventDefault();
                    } else {
                        event.returnValue = false;
                        event.cancelBubble = true;
                    }

                    return false;
                }
            });

            if (GreenLight.instance.isReady()) _getFormNode();
            else GreenLight.utils.events.addEvent(window, "load", _getFormNode);
            if (_settings.attachOnLoad) GreenLight.utils.events.addEvent(window, "load", function () { setTimeout(my.attach, 100); });
        };

        // If option is undefined, return defaultVal, otherwise return option.
        var defaultValue = function (option, defaultVal) {
            return option === undefined ? defaultVal : option;
        };

        // Helper function to merge options with default settings.
        var _merge = function (options, defaults) {
            var newObj = {};
            for (var key in defaults) {
                newObj[key] = defaultValue(options[key], defaults[key]);
            }
            return newObj;
        };

        // We will use this later to get the form DOM node. 
        var _getFormNode = function () {
            _form = document.getElementById(formId);
        };

        // This will attempt to add our handler to the submit function. If we can't, we wait until the window is loaded.
        var _attachEventHandlers = function () {
            if (GreenLight.instance.isReady() && !_EVENTS_ATTACHED) {
                GreenLight.utils.events.addEvent(_form, "submit", _defaultSubmitHandler);

                for (var element in _elements) {
                    _addInputEventHandler(element);
                }

                _EVENTS_ATTACHED = true;
            } else {
                var attachFunc = function () {
                    setTimeout(my.attach, 100);
                };

                GreenLight.utils.events.addEvent(window, "load", attachFunc);
            }
        };

        // This will attempt to add a single element handler if the page has been loaded and we have already called 
        // the attach function.
        var _attachElementHandler = function (name) {
            var READY = GreenLight.instance.isReady();
            _ATTACH_CALLED && READY && _addInputEventHandler(name);
        };

        // The default form submit handler. It will call the element's onSuccess callback if it passed, and onFail otherwise.
        // An array of results will be provided through this.results inside the callbacks.
        var _defaultSubmitHandler = function (event) {
            var massVal = my.validate(), fn;
            fn = GreenLight.utils.results.success(massVal) ? _settings.onSuccess : _settings.onFail;

            return fn.call({ results: massVal }, event);
        };

        // The default event handler for specific elements. It will validate the element according to the specified constraint.
        var _defaultElementHandler = function (element) {
            return function () {
                if (defaultValue(_elements[element].validateOnEvent, _settings.validateOnEvent)) {
                    my.validate(element);
                }
            }
        };


        // Adds the event handler for a specific element.
        var _addInputEventHandler = function (element) {
            if (defaultValue(_elements[element].validateOnEvent, _settings.validateOnEvent)) {
                // If the element specific event type isn't defined, we use the event type found in the global settings.
                var eventType = defaultValue(_elements[element].validateOnEventType, _settings.validateOnEventType);
                GreenLight.utils.events.addEvent(_form[element], eventType, _defaultElementHandler(element));
            }
        };

        // public methods
        var my = {
            // Attach event handlers
            attach: function () {
                _ATTACH_CALLED = true;
                _attachEventHandlers();
            },

            // Used to register multiple inputs at once to avoid multiple calls to registerInput.
            register: function (inputs) {
                for (var name in inputs) this.registerInput(name, inputs[name])
            },

            // Will add a form element to this object's validation list.
            registerInput: function (name, settings) {
                if (name === undefined || typeof name !== "string") return this;

                _elements[name] = _merge(settings, {
                    name: name,
                    getForm: function () { return _form; },
                    constraint: function () { return true; },
                    validateOnEvent: undefined,
                    validateOnEventType: "change",
                    onSuccess: undefined,
                    onFail: undefined
                });

                // If there isn't an object for the current local in the i18n table, create one.
                if (!_i18n[_settings.locale]) _i18n[_settings.locale] = {};
                _i18n[_settings.locale][name] = settings.errorMessage;

                _elements[name].constraint = GreenLight.instance.toFunction(settings.constraint);

                _attachElementHandler(name);
                return this;
            },

            // Will set the current locale for messages.
            setLocale: function (locale) {
                _settings.locale = locale;
            },

            // Sets the translations map to obj.
            setTranslations: function (obj) {
                for (var locale in obj) {
                    if (!(locale in _i18n)) _i18n[locale] = {};
                    for (var name in obj[locale]) {
                        _i18n[locale][name] = obj[locale][name];
                    }
                }
            },

            // Sets the default callbacks for elements.
            setDefaultCallbacks: function (obj) {
                _settings.defaultSuccess = obj.success;
                _settings.defaultFail = obj.fail;
            },

            // Will return a list of names that match the selector and (optionally) that pass the given constraint.
            // It will only return the names of elements that have been registered in the form validator.
            querySelector: function (selector, constraint) {
                var nameList = [], nodeList, constraintFunc;
                constraint && (constraintFunc = GreenLight.instance.toFunction(constraint));

                nodeList = GreenLight.selector.querySelectorAll(selector, _form);

                for (var i = 0; i < nodeList.length; i++) {
                    var name = nodeList[i].name;
                    name in _elements &&
                            (constraint ?
                                constraintFunc(_form[name]) && nameList.push(name) :
                                nameList.push(name)
                            );
                }

                return nameList;
            },

            // If no arguments are provided, it will validate all elements. Otherwise, this function will
            // validate individual inputs that match the name parameter.
            validate: function (name, execCallback) {
                if (arguments.length === 0) return this.validateMany();
                if (!(name in _elements)) throw ("Form field '" + name + "' not registered.");
                if (execCallback === undefined) execCallback = _settings.callbackOnValidate;

                var success = _elements[name].constraint(_form[name]);

                // context will be bound to 'this' in the success/fail callback.
                var context = {
                    name: name,
                    success: success,
                    element: _form[name],
                    errorMessage: _i18n[_settings.locale][name]
                }

                if (execCallback) {
                    var callback;
                    if (success) {
                        callback = _elements[name].onSuccess || _settings.defaultSuccess;
                        callback && callback.call(context, _form[name]);
                    } else {
                        callback = _elements[name].onFail || _settings.defaultFail;
                        callback && callback.call(context, _form[name]);
                    }
                }

                return context;
            },

            // Will validate all of the registered elements. Use the boolean flag to execute callbacks.
            // Provide the nameList option if you only wish to validate a subset of (registered) form elements.
            // TODO: This is getting kind of big, consider splitting it up into multiple functions.
            validateMany: function (options) {
                options = options || {};
                var doCallback = defaultValue(options.doCallback, _settings.callbackOnMassValidate);
                var nameList = options.nameList, massVal = [];

                // Add any elements that match the selector to nameList.
                if (options.selector) {
                    nameList = nameList || [];
                    nameList = nameList.concat(this.querySelector(options.selector));
                }

                var pushResult = function (name) {
                    if (options.onlyNonEmpty) {
                        if (_form[name].value !== "") massVal.push(this.validate(name, doCallback));
                    } else {
                        massVal.push(this.validate(name, doCallback));
                    }
                };

                // Validate those only in nameList
                if (nameList) {
                    for (var i = 0, length = nameList.length; i < length; i++) {
                        pushResult.call(this, nameList[i]);
                    }
                    // validate all elements
                } else {
                    for (var name in _elements) {
                        pushResult.call(this, name);
                    }
                };

                return massVal;
            }
        }

        init();
        return my;
    };
};

GreenLight.instance = GreenLight.core.__init__(GreenLight);
GreenLight.instance.create = GreenLight.core.validator(GreenLight);
// Replace the GreenLight object with the instance.
GreenLight = GreenLight.instance;