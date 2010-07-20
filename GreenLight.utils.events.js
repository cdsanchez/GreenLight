var GreenLight = GreenLight || {};
GreenLight.utils = GreenLight.utils || {};

GreenLight.utils.events = {
        addEvent: function addEvent(obj, type, fn) {

            if (obj.addEventListener) {
                obj.addEventListener(type, fn, false);
                this.EventCache.add(obj, type, fn);
            }

            else if (obj.attachEvent) {
                var func = function () {
                    fn.call(window.event.srcElement, window.event);
                };
                obj.attachEvent("on" + type, func);
                this.EventCache.add(obj, type, func);
            }

            else if (typeof obj['on' + type] != 'function') {
                obj['on' + type] = fn;
            }
            else {
                var oldonload = obj['on' + type];
                obj['on' + type] = function () {
                    oldonload();
                    fn();
                }
            }
        },

        removeEvent: function removeEvent(obj, type, fn) {
            this.EventCache.remove(obj, type, fn);
        },

        EventCache: (function () {

            var listEvents = [];
            return {
                listEvents: listEvents,

                add: function (node, sEventName, fHandler) {
                    listEvents.push(arguments);
                },

                remove: function (node, sEventName, fHandler) {
                    var i, item;
                    for (i = listEvents.length - 1; i >= 0; i = i - 1) {
                        if (node == listEvents[i][0] && sEventName == listEvents[i][1] && fHandler == listEvents[i][2]) {
                            item = listEvents[i];
                            if (item[0].removeEventListener) {
                                item[0].removeEventListener(item[1], item[2], item[3]);
                            }
                            if (item[1].substring(0, 2) != "on") {
                                item[1] = "on" + item[1];
                            }
                            if (item[0].detachEvent) {
                                item[0].detachEvent(item[1], item[0][sEventName + fHandler]);
                            }
                            item[0][item[1]] = null;
                        }
                    }
                },

                flush: function () {
                    var i, item;
                    for (i = listEvents.length - 1; i >= 0; i = i - 1) {
                        item = listEvents[i];
                        if (item[0].removeEventListener) {
                            item[0].removeEventListener(item[1], item[2], item[3]);
                        };
                        if (item[1].substring(0, 2) != "on") {
                            item[1] = "on" + item[1];
                        };
                        if (item[0].detachEvent) {
                            item[0].detachEvent(item[1], item[2]);
                        };
                        item[0][item[1]] = null;
                    };
                }
            };
        })()
};