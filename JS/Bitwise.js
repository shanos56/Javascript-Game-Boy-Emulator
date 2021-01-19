/* Bitewise */


var bitwise = function() {

    
}
/* get low nibble */
Object.defineProperty(bitwise,'low_nibble',{value:function(byte) {

    return byte & 0xf;


}})

/* get high nibble */
Object.defineProperty(bitwise,'high_nibble',{value:function(byte) {

    return byte & 0xf0;


}})

/* check bit */
Object.defineProperty(bitwise,'check_bit',{value:function(byte, bit) {

    return (byte & (1 << (bit-1))) != 0 ;

}})

/* set bit */
Object.defineProperty(bitwise,'set_bit',{value:function(byte, bit) {

    return byte | (1 << (bit-1));

}})

/* clear bit */
Object.defineProperty(bitwise,'clear_bit',{value:function(byte, bit) {

    return byte & ~(1 << (bit-1));

}})


/* set bit to */
Object.defineProperty(bitwise,'set_bit_to',{value:function(byte, bit, bit_on) {

    return bit_on ? bitwise.set_bit(byte,bit) : bitwise.clear_bit(byte,bit);

}})
