/*jslint browser: true */
/* exported register16 */
/* global ByteRegister */
"use strict"

var WordRegister = function (h,l) {

    var high;
    var low;
    
    
    this.low = function () {
        return low;
    }
    
    this.high = function () {
        return high;
    }
    
    this.set_low = function (l) {
        low.set(l);
    }
    
    this.set_high = function (h) {
        high.set(h);
    }
    this.increment = function() {
        this.set(this.value() + 1);
    }
    
    this.decrement = function () {
        this.set(this.value() - 1);
    }
    
    
    this.inRange = function(low,high) {
        return (this.value() >= low && this.value() <= high);
    }
    
    this.add = function (val) {
        this.set(this.value() + val);
    }
    
    this.equals = function (val) {
        return this.value() == val;
    }
    
    this.set = function (val) {
        high.set((val & 0xff00) >> 8);
        low.set((val & 0xff));
    }
    
    this.value = function () {
        return ((high.value() & 0xff) << 8) | (low.value() & 0xff);
    }
    
    var __constructor = function () {
        high = h;
        low = l;
    }
    
    __constructor();
    return this;
}

WordRegister.getEmpty = function () {
    return new WordRegister(new ByteRegister(0),new ByteRegister(0));
}


WordRegister.from16 = function (u16) {
    return new WordRegister(new ByteRegister((u16 >> 8)),new ByteRegister(u16 & 0xff));
}
