(function () {
    var log2;
    if (!Math.log2) {
        log2 = Math.log(2);
        Math.log2 = function log2(val) {
            return Math.log(val) / log2;
        };
    }
})();
