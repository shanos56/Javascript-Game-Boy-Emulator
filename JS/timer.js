/*jslint browser: true */
/* exported timer */
/* global GBEmu */


GBEmu.timer = function (cpu1) {

    var divider = 0;
    var timer = 0; // memory register 0xff05
    
    var divider_clock = 0; // divider clock updates every 256 cycles (cpu frequency(4194304) / divider frequency(16384)) // memory register 0xff04
    var divider_frequency = 256 // cpu frequency(4194304) / divider frequency(16384)

    var timer_control = 0; // memory register 0xff07
    var timer_modulo = 0; // memory register 0xFF06
    var timer_enabled = false;
    var timer_clock = 0;
    var timer_frequency = 256;
    
    var stop = 0;
    
    var double_speed_mode = 0;
    
    
    var cpu = cpu1;
    
    // this is not actual frequencies of timers
    // its (cpu frequency(hz)) / (timer frequency(hz))
    var frequency = {
        0:1024,
        1:16,
        2:64,
        3:256
    }
    
    this.tick = function(cycles) {
        
        if (!stop) {
            divider_clock += cycles
            if (divider_clock >= divider_frequency) {
                divider_increment();
                divider_clock = divider_clock % divider_frequency;
            }
        }
        
        if (timer_enabled) {
            timer_clock += cycles
            if (timer_clock >= timer_frequency) {
                timer_increment();
                timer_overflow();
                timer_clock = timer_clock % timer_frequency;
            }
        }
    }
    
    var timer_overflow = function() {
        if (timer > 0xff) {
            timer = timer_modulo;
            this.interrupt();
        }
    } 
    
    this.interrupt = function () {
        // set bit 2 of 0xff0f to 1
        cpu.interrupt_flag |= 0x04;
    }
    //
    this.stop = function () {
        stop = 1;
        reset_divider();
    }
    
    this.start = function () {
        stop = 0;
    }
    
    this.write_to_divider = function () {
        reset_divider();
    }
    
    this.set_timer_control = function(byte) {
        timer_control = byte;
        timer_enabled = (timer_control & 0x04) == 0x04 ? true : false;
        timer_frequency = frequency[timer_control & 0x3];
    }
    
    var divider_increment = function() {
        divider++;
    }
    
    var timer_increment = function () {
        timer++;
    }
    
    var reset_divider = function () {
        divider = 0;
        divider_clock = 0;
    }
    
    this.double_speed = function () {
        if (!double_speed_mode) {
            this.divider_frequency = frequency[3] / 2;
            this.timer_frequency = frequency[timer_control & 0x3] / 2;
            double_speed_mode = 1;
        }
    }
    
    this.normal_speed = function () {
        if (double_speed_mode) {
            this.divider_freqency = frequency[3];
            this.timer_frequency = frequency[timer_control & 0x3];
            double_speed_mode = 0;
        }
    }
    
    
    this.set_timer_modulo = function(byte) {
        timer_modulo = byte;
    }
    this.get_divider = function () {
        return divider;
    }
    
    this.get_timer = function () {
        return timer;
    }
    
    this.reset = function () {
        divider = 0;
        divider_clock = 0;
        
    }
    
    return this;
    
}
