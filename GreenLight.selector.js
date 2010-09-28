var GreenLight = GreenLight || {};

GreenLight.selector = GreenLight.selector || {
    querySelectorAll: (function () {
        if (document.querySelectorAll) {
            return function (selector, node) { 
                return node.querySelectorAll(selector); 
            };
        }
        if (peppy) return peppy.query;
        if (Sizzle) return Sizzle;
        if (jQuery) return jQuery;
        if (YAHOO) return YAHOO.util.Selector.query;
        if (Ext) return Ext.DOMQuery.select;
        if (dojo) return dojo.query;
    })(),

    matchesSelector: (function () {
        // Check for native implementations.
        var matchesSelector = document.matchesSelector || document.mozMatchesSelector || document.webkitMatchesSelector;

        if (matchesSelector) {
            return function (node, selector) { 
                matchesSelector.call(node, selector); 
            }
        }

        // Our implementation.
        return function (node, selector) {
            var nodeList = this.querySelectorAll(node.parentNode, selector),
                i = nodeList.length;
            
            while (i--) {
                if (nodeList[i] == node) return true;
            }

            return false;
        };
    })()
};