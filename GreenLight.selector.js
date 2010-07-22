var GreenLight = GreenLight || {};

GreenLight.selector = GreenLight.selector || {
    querySelectorAll: function (selector, node) {
        if (node.querySelectorAll) return node.querySelectorAll(selector);
        if (jQuery) return jQuery(selector, node);
        if (YAHOO.util.Selector) return YAHOO.util.Selector.query(selector, node);
        if (Element) return Element.getElementsBySelector(selector, node);
        if (Ext.DOMQuery) return Ext.DOMQuery.select(selector, node);

        // Return empty list if there is no implementation we can use.
        return [];
    },

    matchesSelector: function (node, selector) {
        // Check for native implementations.
        var matchesSelector = document.matchesSelector || document.mozMatchesSelector || document.webkitMatchesSelector;

        if (matchesSelector) {
            return matchesSelector.call(node, selector);
        }

        // Check for framework implementations
        if (jQuery) return jQuery(node).is(selector); // jQuery
        if (YAHOO.util.Selector) return YAHOO.util.Selector.test(node, selector); // YAHOO
        if (Element) return Element.match(node, selector); // Prototype
        if (Ext.DOMQuery.is) return Ext.DOMQuery.is(node, selector); // ExtJS

        // Our naive implementation.
        var nodeList = this.querySelectorAll(document, selector);
        for (var element in nodeList) {
            return nodeList[element] === node;
        }

        // If it got here it didn't match the selector.
        return false;
    }
};