/* address */
/* global window */
/* exported Address */


var Address = function (address) {

    var addr = window.UInt16Array(1);
    
    this.low = function () {
        return addr[0] & 0xff;
    }
    
    this.high = function () {
        return addr[0] & 0xff00;
    }
    
    this.increment = function() {
        addr[0]++;
    }
    
    this.inRange = function(low,high) {
        return (addr[0] >= low && addr <= high);
    }
    
    this.add = function (val) {
        addr[0] = addr[0] + val;
    }
    
    this.equals = function (val) {
        return addr[0] == val;
    }
    
    this.equal = function (val) {
        addr[0] = val;
    }
    
    this.value = function () {
        return addr[0];
    }
    
    var __constructor = function () {
        addr[0] = address;
    }
    
    __constructor();
    return this;
    

}