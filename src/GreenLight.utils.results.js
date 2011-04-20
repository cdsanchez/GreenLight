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

    errorList: function (results) {
        var errorList = [];
        for (var i = 0, length = results.length; i < length; i++) {
            if (!results[i].success) {
                errorList.push(results[i].errorMessage);
            }
        }
        return errorList;
    }
};