if (!Math.log2) {
    Math.log2 = function log2(val) {
        Math.log(val) / Math.log(2);
    };
}
