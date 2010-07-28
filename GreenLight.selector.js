var GreenLight = GreenLight || {};

GreenLight.selector = GreenLight.selector || {
    querySelectorAll: function (selector, node) {
        if (node.querySelectorAll) return node.querySelectorAll(selector);
        if (jQuery) return jQuery(selector, node);
        if (YAHOO) return YAHOO.util.Selector.query(selector, node);
        if (Element) return Element.select(node, selector);
        if (Ext) return Ext.DOMQuery.select(selector, node);
        if (dojo) return dojo.query(selector); //dojo doesn't let you specify the root node
        if (Peppy) return Peppy.query(selector, node);
        if (Sizzle) return Sizzle(selector, node);

        // Return empty list if there is no implementation we can use.
        return [];
    },

    matchesSelector: function (node, selector) {
        // Check for native implementations.
        var matchesSelector = node.matchesSelector || node.mozMatchesSelector || node.webkitMatchesSelector;

        if (matchesSelector) {
            return matchesSelector.call(node, selector);
        }

        //Check for framework implementations
        if (jQuery) return jQuery(node).is(selector); // jQuery
        if (YAHOO) return YAHOO.util.Selector.test(node, selector); // YAHOO
        if (Element) return Element.match(node, selector); // Prototype
        if (Ext) return Ext.DOMQuery.is(node, selector); // ExtJS

        // Our naive implementation.
        var nodeList = this.querySelectorAll(node.parentNode, selector);
        for (var element in nodeList) {
            return nodeList[element] === node;
        }

        // If it got here it didn't match the selector.
        return false;
    }
};