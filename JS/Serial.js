/* serial */

/* passes information from one gameboy to another. */
GBEmu.serial = function () {

    
    var _byte = 0x0;
    var byte_control = 0x0;
    
    this.write_control = function (byte) {
        byte_control = byte;
    }

    this.write = function (byte) {
        _byte = byte;
    }

    return this;
}
