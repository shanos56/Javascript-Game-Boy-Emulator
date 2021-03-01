/* exported ByteRegister */
/* global window */
/* global bitwise */

var ByteRegister = function (v) {
    var val = new window.Uint8Array(1);
      val[0] = v;

      this.increment = function () {
        val[0]++;
      }
      this.decrement = function () {
        val[0]--;
      }
      this.value = function () {
        return val[0];
      }
      this.set = function (value) {
        val[0] = value;
      }
      
      this.set_bit_to = function (bit, value) {
          val[0] = bitwise.set_bit_to(val[0],bit,value)
      }
      
      this.check_bit = function (bit) {
          return bitwise.check_bit(val[0], bit);
      }

     return this;
}

