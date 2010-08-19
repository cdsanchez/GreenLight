var GreenLight = GreenLight || {};

GreenLight.selector = GreenLight.selector || {
    querySelectorAll: function (selector, node) {
        if (node.querySelectorAll) return node.querySelectorAll(selector);
        if (peppy) return peppy.query(selector, node);
        if (Sizzle) return Sizzle(selector, node);
        if (jQuery) return jQuery(selector, node);
        if (YAHOO) return YAHOO.util.Selector.query(selector, node);
        if (Element) return Element.select(node, selector);
        if (Ext) return Ext.DOMQuery.select(selector, node);
        if (dojo) return dojo.query(selector); //dojo doesn't let you specify the root node

        // Return empty list if there is no implementation we can use.
        return [];
    },

    matchesSelector: function (node, selector) {
        // Check for native implementations.
        var matchesSelector = node.matchesSelector || node.mozMatchesSelector || node.webkitMatchesSelector;

        if (matchesSelector) {
            return matchesSelector.call(node, selector);
        }

        // Our implementation.
        var nodeList = this.querySelectorAll(node.parentNode, selector),
            i = nodeList.length;
            
        while (i--) {
            if (nodeList[i] == node) return true;
        }

        return false;
    }
};