var GreenLight = GreenLight || {};
GreenLight.utils = GreenLight.utils || {};

GreenLight.utils.results = {
    success: function (resultsArray) {
        if (resultsArray === undefined) return true;
        var flag = true;
        for (var i = 0, length = resultsArray.length; i < length; i++) {
            flag = flag && resultsArray[i].success;
        }
        return flag;
    },

    iter: function (results, fn) {
        if (results === undefined) return;
        for (var i = 0, length = results.length; i < length; i++) {
            fn.call(null, result[i]);
        }
    },

    errorList: function (results) {
        var errorList = [];
        this.iter(results, function (result) {
            var errorMessage = result.errorMessage;
            if (errorMessage) {
                errorList.push(result.errorMessage);
            }
        });
        return errorList;
    }
};