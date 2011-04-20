var GreenLight = GreenLight || {};

(function (GreenLight, undefined) {
    GreenLight.filters = function (filters) {
        if (filters == undefined) return function (value) { return value; }
        if (typeof filters == "string")  filters = filters.split(/[,\s]+/);
        
        return function(value) {
            var result = value, filter, i = filters.length;
            
            while (i--) {
               filter = filters[i];
               if (filter instanceof Function) result = filter(result);
               if (typeof filter == "string") result = GreenLight.filters[filter.toLowerCase()](result);
            }
            
            return result;
        };
    };

    // We can safely assume value is a String.
    GreenLight.filters.lowercase = function (value) { return value.toLowerCase(); };

    GreenLight.filters.uppercase = function (value) { return value.toUpperCase(); };

    GreenLight.filters.trim = function (value) { 
        return (String.prototype.trim || 
            function() { return this.replace(/^\s+|\s+$/g, ''); }).call(value); 
    };

    GreenLight.filters.replace = function (match, replace) {
        return function (value) {
            return value.replace(match, replace);
        };
    };
})(GreenLight);