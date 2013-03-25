(function () {
    var logNat2;
    if (!Math.log2) {
        logNat2 = Math.log(2);
        Math.log2 = function log2(val) {
            return Math.log(val) / logNat2;
        };
    }
})();
