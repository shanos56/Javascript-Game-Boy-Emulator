/*jslint browser: true */
/* exported register16 */
/* global GBEmu */
"use strict"

var register16 = function (high, low) {

    var lowMask = 0xff;
    var highMask = 0xff00
    var _high = high & highMask;
    var _low = low & lowMask;
    
    this.getLow = function () {
        return _low;
    }
    
    this.getHigh = function () {
        return _high;
    }
    
    this.value = function () {
        return (_high | _low);
    }
    
    return this;
}
