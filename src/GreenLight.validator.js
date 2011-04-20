var GreenLight = GreenLight || {};

// Returns the constructor for validator instances. This will be rebound to GreenLight.create during initialization.
GreenLight.validator = function (GreenLight, undefined) {
    return function (formId, initSettings) {
        if (formId === undefined) {
            throw ("No form id provided.");
        }

        // _form: Is (or will be) a reference to the actual DOM node for the from we're working on.
        // i18n: An object that stores translations to add internationalization support.
        // _elements: An object that stores element specific settings. 
        var _form = {}, _elements = {}, _i18n = {}, _settings = {}, _default_locale = "default";
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
                locale: _default_locale,
                onSuccess: function () { return true; },
                onFail: function () { return false; }
            });

            _i18n[_default_locale] = {};
            _i18n[_settings.locale] = {};

            if (GreenLight.instance.isReady()) _getFormNode();
            else GreenLight.utils.events.addEvent(window, "load", _getFormNode);
            if (_settings.attachOnLoad) GreenLight.utils.events.addEvent(window, "load", function () { setTimeout(self.attach, 100); });
        };

        // If option is undefined, return defaultVal, otherwise return option.
        var defaultValue = function (option, defaultVal) {
            return option === undefined ? defaultVal : option;
        };

        // Helper function to merge options with default settings.
        var _merge = function (options, defaults) {
            var newObj = {};
            for (var key in defaults) if (defaults.hasOwnProperty(key)) {
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

                for (var element in _elements) if (_elements.hasOwnProperty(element)) {
                    _addInputEventHandler(element);
                }

                _EVENTS_ATTACHED = true;
            } else {
                GreenLight.utils.events.addEvent(window, "load", function () {
                    setTimeout(self.attach, 100);
                });
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
            var results = self.validate(), callback;
            callback = GreenLight.utils.results.success(results) ? _settings.onSuccess : _settings.onFail;

            var doSubmit = callback.call({ results: results }, event);

            if (!doSubmit) {
                if (event.preventDefault) {
                    event.preventDefault();
                } else {
                    event.returnValue = false;
                }
            }

            return doSubmit;
        };

        // The default event handler for specific elements. It will validate the element according to the specified constraint.
        var _defaultElementHandler = function (element) {
            return function () {
                _elements[element].validateOnEvent && self.validate(element);
            };
        };


        // Adds the event handler for a specific element.
        var _addInputEventHandler = function (element) {
            if (_elements[element].validateOnEvent) {
                var eventTypes = _elements[element].validateOnEventType;
                
                if (typeof eventTypes == "string") eventTypes = [eventTypes]; // if it's a single event put it inside an array
                for (var i = 0; i < eventTypes.length; i++) {
                    GreenLight.utils.events.addEvent(_form[element], eventTypes[i], _defaultElementHandler(element));
                }
            }
        };

        // public methods
        var self = {
            // Attach event handlers
            attach: function () {
                _ATTACH_CALLED = true;
                _attachEventHandlers();
            },

            // Used to register multiple inputs at once to avoid multiple calls to registerInput.
            register: function (inputs) {
                for (var name in inputs) if (inputs.hasOwnProperty(name)) {
                        this.registerInput(name, inputs[name]);
                }
            },

            // Will add a form element to this object's validation list.
            registerInput: function (name, settings) {
                if (name === undefined || typeof name !== "string") return this;

                _elements[name] = _merge(settings, {
                    name: name,
                    getForm: function () { return _form; },
                    constraint: function () { return true; },
                    validateOnEvent: _settings.validateOnEvent,
                    validateOnEventType: _settings.validateOnEventType,
                    onSuccess: undefined,
                    onFail: undefined
                });
                
                _elements[name].filter = GreenLight.filters(settings.filter);
                _elements[name].constraint = GreenLight.instance.toFunction(settings.constraint);
                _i18n[_default_locale][name] = settings.errorMessage;
                
                _attachElementHandler(name);
            },

            // Will set the current locale for messages.
            setLocale: function (locale) {
                _settings.locale = locale;
                _i18n[locale] || (_i18n[locale] = {});
            },

            // Sets the translations map to obj.
            setTranslations: function (translations) {
                var currentLocale, storedLocale;
                
                for (var locale in translations) if (translations.hasOwnProperty(locale)) {
                    currentLocale = translations[locale];
                    storedLocale = _i18n[locale] || (_i18n[locale] = {});
                    
                    for (var name in currentLocale) if (currentLocale.hasOwnProperty(name)) {
                        storedLocale[name] = currentLocale[name];
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
            query: function (selector, constraint) {
                var nameList = [], nodeList, constraintFunc, name;
                constraint && (constraintFunc = GreenLight.instance.toFunction(constraint));

                nodeList = GreenLight.selector.querySelectorAll(selector, _form);

                for (var i = 0; i < nodeList.length; i++) {
                    name = nodeList[i].name;
                    name in _elements &&
                            (constraint ?
                                constraintFunc(_form[name]) &&
                                    nameList.push(name) :
                                nameList.push(name)
                            );
                }

                return nameList;
            },

            // If no arguments are provided, it will validate all elements. Otherwise, this function will
            // validate individual inputs that match the name parameter.
            validate: function (name, execCallback) {
                if (arguments.length == 0) return this.validateMany();
                if (!(name in _elements)) throw ("Form field '" + name + "' not registered.");

                // Update the filtered value
                _elements[name].value = _elements[name].filter(_form[name].value);
                var success = _elements[name].constraint(_form[name]);

                // context will be bound to 'this' in the success/fail callback.
                var context = {
                    name: name,
                    success: success,
                    element: _form[name],
                    errorMessage: _i18n[_settings.locale][name] || _i18n[_default_locale][name]
                };

                if (defaultValue(execCallback, _settings.callbackOnValidate)) {
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
                var doCallback = defaultValue(options.doCallback, _settings.callbackOnMassValidate),
                    nameList, results = [];

                // Add any elements that match the selector to nameList.
                if (options.selector) {
                    nameList = this.query(options.selector, options.constraint);
                } else if (!options.selector && options.constraint) {
                    nameList = this.query("input", options.constraint);
                }
                    
                if (nameList) { // Validate those only in nameList
                    for (var i = 0, length = nameList.length; i < length; i++) {
                        results.push(this.validate(nameList[i], doCallback));
                    } 
                } else { // validate all elements
                    for (var name in _elements) if (_elements.hasOwnProperty(name)) {
                        results.push(this.validate(name, doCallback));
                    }
                };

                return results;
            }
        }

        init();
        return self;
    };
};
