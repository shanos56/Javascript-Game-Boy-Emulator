/** cartridges */
/* global window */
/* global cartridgeInfo */
/* global bitwise */
/* exported NoMBC */
/* exported MBC1 */
/* exported MBC2 */
/* exported MBC3 */
/* exported MBC5 */



var NoMBC = function (rom) {
    
    var rom_data = rom;
    
    this.read = function (address) {
        return rom_data[address.value()];
    };
    
    this.write = function (address, byte) {
        window.console.log("unable to write to NoMbc cartridge. There is no memory at '%s' for value '%s'", address.value(), byte.value());
    };
    
    this.getRomSize = function () {
        
        return cartridgeInfo.location.rom_size;
    };
    
    return this;
};


var MBC1 = function (rom, ram, cartridgeInfo) {
    
    
    var ram_enable = false, // whether allow the use of external ram
        rom_bank = 0, // the rom bank currently selecting data from
        rom_ram_mode = 0, // 0 = 16Mb ROM/8KB RAM 1 = 4Mb ROM/32KB RAM.
        ram_bank = 0, // RAM Bank Number or Upper Bits of ROM Bank Number depends upon ram bank mode
        
        rom_data = window.Uint8Array(),
        ram_data = window.Uint8Array();
    
    
    
    /**
    *
    *   @description adjusts rom_bank due to issue with mbc1 card
    *   mbc1 cards when picking data from 0x00 0x20 0x40 0x60 rom bank are mapped to one
    *   bank higher
    *
    *
    
    */
    
    var adjust_rom_bank = function () {
        
        switch (rom_bank) {
        case 0x00:
        case 0x20:
        case 0x40:
        case 0x60:
            rom_bank = rom_bank + 1;
            break;

        default:
            break;
        }
    };
    
    
    this.write = function (address, byte) {
        // enables the use of external ram found in the cartridge
        if (address.in_range(0x0, 0x1FFF) && (byte.value() & 0x0F) === 0x0A) {
            ram_enable = true;
            return;
        }
        
        // sets the value of current rom_bank getting information
        if (address.in_range(0x2000, 0x3FFF)) {
            // in mbc 1 the some of the rom banks are increased by 1, unsure the reason but seems lower 5 bits in byte affect the rom_bank
            
            // this is a 5-bit register but is used as a 7 bit register
            // rom.ram mode makes using this as a 7 bit register easier
            rom_bank = ((rom_bank & 0x60) | (byte & 0x1f));
            
            adjust_rom_bank();
            return;
        }
        
        // 2 bit register that either holds the ram_bank number or top 2 bits of the rom_bank number
        if (address.in_range(0x4000,0x5FFF)) {
            if (rom_ram_mode) {
                ram_bank = byte & 0x03
                return;
            } else {
                // rather than set the ram_bank number to two digits, adjust the the rom_bank number
                // sets the upper two bits for the rom_bank
                rom_bank = (((byte & 0x03) << 5) | (rom_bank & 0x1f));
                adjust_rom_bank();
                //rom_offset = rom_bank * 0x4000; // each rom bank is 16 kilobytes
            }
            return;
        }
        
        /*
        The game is able to switch between the modes on the fly, allowing a game to access extended ROM banks during normal operation and switch to RAM mode temporarily when data needs to be read. Valid values are $00 for ROM mode and $01 for RAM mode. */
        
        if (address.in_range(0x6000,0x7FFF)) {
            rom_ram_mode = byte & 0x1;
            return;
        }
        
        
        if (address.in_range(0xA000,0xBFFF)) {
            if (!ram_enable) {
                window.console.log("Writing to MBC1 ram without ram enabled")
                return;
            }
            
            if (rom_ram_mode === 0 && ram_bank > 0) {
                window.console.log ("Writing to ram bank %s in rom mode", ram_bank);
                return;
            }
            
            var ram_addr = address.value() - 0xA000;
            // 1 = in rom banking mode mbc1 has 4 ram banks
            // 0 = not in rom banking mode, cpu can only access 1 ram bank
            if (rom_ram_mode) {
                ram_addr = ram_addr + (ram_bank * 0x2000);
            }
            
            ram_data[ram_addr] = byte;
            return;
        }
        
        window.console.log("Attempted to write to unmapped MBC1 address 0x%x", address.value());
    }
    
    this.read = function(address) {
        // read rom data from bank 0
       if (address.in_range(0x0, 0x3fff)) {
           return rom_data[address.value()];
       }
        // read rom data from bank 0 or greater
        if (address.in_range(0x4000,0x7fff)){
            var rom_addr = (address.value() - 0x4000);
            if (rom_ram_mode) {
                rom_addr += (rom_bank-1) * 0x4000;
            } else {
                rom_addr += ((rom_bank & 0x1f)-1) * 0x4000;
            }
            
            return rom_data[rom_addr];
        }
        // read ram data from cartridge
        if (address.in_range(0xA000,0xBfff)) {
            if (!ram_enable) {
                window.console.log("Attempted to read MBC1 ram address 0x%x, while ram is disabled.", address.value());
            }
            var ram_addr = (address.value() - 0xA000) + ((ram_bank-1) * 0x2000);
            
            return ram_data[ram_addr];
        }
        
        window.console.log("Attempted to read from unmapped MBC1 address 0x%x", address.value());
    }
    var __constructor = function () {
        rom_data = rom;
        ram_data = ram;
        
    }
    
    __constructor();
    return this;
}


var MBC2 = function (rom, ram) {
    
    
    var ram_enable = false; // whether allow the use of external ram
    var rom_bank = 1; // the rom bank currently selecting data from
    // has only 16 rom banks
    var ram_bank = 1;
    var rom_data = window.Uint8Array(0x40000); // used to track data
    var ram_data = window.Uint8Array(0x800); // used to track data
    
    var rom_ram_mode = false;
    
    this.write = function (address, byte) {
        
        // turn ram on or off
        if (address.in_range(0x0, 0x1fff)) {
            // enable or disables ram
           if ((address.high() & 0x1) == 0) {
               ram_enable = !ram_enable;
           }
            
        }
        
        // select rom_bank
        if (address.in_range(0x2000,0x3fff)) {
            // checks for ram mode
            // the 9th bit(least significant bit of high byte) in address is equal to 1 determines if its okay to select rom_bank
            if ((address.high() & 0x1) == 1) {
                rom_bank = byte & 0xf;
            }
            
            return;
        }
        
        // unfinished ram address
        if (address.in_range(0xA000,0xA1ff)) {
             if (!ram_enable) {
                window.console.log("Attempted to write to MBC2 ram address 0x%x, while ram is disabled.", address.value());
            }
            
            var ram_addr = (address.value() & 0x1fff) + ((ram_bank - 1) * 0x200); // insert data into ram_bank
            
            
            
            ram_data[ram_addr] = byte & 0xf;
        }
        
        
    
        window.console.log("Attempted to write to unmapped MBC2 address 0x%x", address.value());
        
    }
    
    
    
        
    this.read = function(address) {
        // read rom data from bank 0
       if (address.in_range(0x0, 0x3fff)) {
           return rom_data[address.value()];
       }
        // read rom data from bank 1 to bank 16
        if (address.in_range(0x4000,0x7fff)){
            var rom_addr = (address.value() - 0x4000);
            if (rom_ram_mode) {
                rom_addr += rom_bank * 0x4000;
            } else {
                rom_addr = (rom_bank & 0x1f) * 0x4000;
            }
            
            return rom_data[rom_addr];
        }
        // read ram data from cartridge
        if (address.in_range(0xA000,0xBfff)) {
            var ram_addr = (0x1fff & address) + ((ram_bank - 1) * 0x200)
            return ram_data[ram_addr];
        }
        
        window.console.log("Attempted to read from unmapped MBC1 address 0x%x", address.value());
        return;
    }
    
    var constructor = function () {
        rom_data = rom;
        ram_data = ram;
        
        
    }
    
    
    constructor();

    return this;
    
}

var MBC3 = function (rom, ram) {
        
    var ram_enable = false; // whether allow the use of external ram
    var rom_bank = 0; // the rom bank currently selecting data from
    var ram_bank = 0; // RAM Bank Number or Upper Bits of ROM Bank Number depends upon ram bank mode
    
    var rom_data = rom;
    var ram_data = ram;
    var rtc = {
        seconds:0,
        minutes:0,
        hours:0,
        days:0,
        control:0
    }
    
    var rtc_latched = {
        seconds:0,
        minutes:0,
        hours:0,
        days:0,
        control:0
    }
    
    var latch_data_reg = 0x0;
    var rtc_current = 0;
    var rtc_last = 0;
    
    
    var is_ram = function(bank) {
        return bank < 0x08;
    }
    var is_rtc = function(bank) {
        return bank > 0x07 && bank < 0x0D;
    }
    
      this.write = function (address, byte) {
        // enables the use of external ram found in the cartridge
        if (address.in_range(0x0,0x1FFF) && (byte & 0x0F) == 0x0A) {
            ram_enable = !ram_enable;
            return;
        }
        
        // sets the value of current rom_bank getting information
        if (address.in_range(0x2000,0x3FFF)) {
            // in mbc 1 the som of the rom banks are increased by 1, unsure the reason but seems lower 5 bits in byte affect the rom_bank
            
            // this is a 7-bit register but is used as a 7 bit register
            rom_bank = byte & 0x6f;
            return;
        }
        
        // 4 bit register
        // sets the ram_bank to read from 
        // if in range from 0x00 to 0x03 it will read from ram_data
        // if in range from 0x08 to 0x0C it will read from rtc registers
        if (address.in_range(0x4000,0x5FFF)) {
                ram_bank = byte & 0x0f
                return;
        }
        
        /* latch data register */
          
        if (address.in_range(0x6000,0x7FFF)) {
            if (latch_data_reg == 0 && (byte && 0x1) == 1) {
                updateRtc();
                set_latched();
                latch_data_reg = 1;
            } else {
                latch_data_reg = 0;
            }
            return;
        }
        
        // writes to ram in cartridge
        if (address.in_range(0xA000,0xBFFF)) {
            if (!ram_enable) {
                window.console.log("Writing to MBC3 ram without ram enabled")
                return;
            }
            // if ram bank is enabled
            if (is_ram(ram_bank)) {
                var ram_addr = (address.value() & 0x1fff) + (ram_bank * 0x2000);
                ram_data[ram_addr] = byte;
            } else if (is_rtc(ram_bank)) {
                switch ((ram_bank & 0xf) - 0x08) {
                        
                    case 0x0:
                        rtc.seconds = byte;
                        break;
                    case 0x1:
                        rtc.minutes = byte;
                        break;
                    case 0x02:
                        rtc.hours = byte;
                        break;   
                    case 0x03:
                        rtc.days = byte;
                        break;
                    
                    default:
                        break;   
                        
                }
            }
             // same as (address - 0xA000)
            
            ram_data[ram_addr] = byte
            return;
        }
        
        window.console.log("Attempted to write to unmapped MBC1 address 0x%x", address.value());
    }
      
    var set_latched = function () {
        rtc_latched.seconds = rtc.seconds;
        rtc_latched.minutes = rtc.minutes;
        rtc_latched.hours = rtc.hours;
        rtc_latched.days = rtc.days;
        rtc_latched.control = rtc.control;
    }
    /**
    *
    * @description updates current time
    *
    */
    this.update_rtc_current = function () {
        var d = new Date();
        rtc_current = d.getTime();
    }
      
    // updates the rtc registers to current time
    var updateRtc = function () {
          
        if (!bitwise.check_bit(rtc.control,6) && rtc_last != rtc_current ){
            var time_diff = rtc_current - rtc_last;
            rtc_last = rtc_current;
            
            rtc.seconds += time_diff % 60;

            if (rtc.seconds > 59) {
                rtc.seconds -= 60;
                rtc.minutes++;
            }

            time_diff /= 60;
            rtc.minutes += (time_diff % 60);

            if (rtc.minutes > 59) {
                rtc.minutes -= 60;
                rtc.hours += 1;
            }

            time_diff /= 60;
            rtc.hours += time_diff % 24;
            if (rtc.hours > 23) {
                rtc.hours -= 24;
                rtc.days += 1;
            }

            time_diff /= 24;
            rtc.days = time_diff & 0xffffffff;

            if (rtc.days > 0xff) {

                rtc.control = (rtc.control & 0xC1) | 0x01; // sets the upper 1 bit of day counter

                if (rtc.days > 511){
                    rtc.days = rtc.days % 512; // fetches the amount of days past 511
                    rtc.control |= 0x80; // tells the control register has overflowed. greater than 1
                    rtc.control &= 0xC0; // whether to stop timer or is active
                }
            }
        }

    }
    
    
    
    this.read = function(address) {
        // read rom data from bank 0
       if (address.in_range(0x0, 0x3fff)) {
           return rom_data[address.value()];
       }
        // read rom data from bank 0 or greater
        if (address.in_range(0x4000,0x7fff)){
            var rom_addr = (address.value() - 0x4000) + (rom_bank & 0x1f) * 0x4000;
            return rom_data[rom_addr];
        }
        // read ram data from cartridge
        if (address.in_range(0xA000,0xBfff)) {
            if (!ram_enable) {
                window.console.log("Attempted to read MBC3 ram address 0x%x, while ram is disabled.", address.value());
            }
            if (is_ram(ram_bank)){
                var ram_addr = (address.value() - 0xA000) + (ram_bank * 0x2000);
                return ram_data[ram_addr];
            } else if (is_rtc(ram_bank)) {
                switch ((ram_bank & 0xf) - 0x08) {
                        
                    case 0x0:
                        return rtc_latched.seconds;
                    case 0x1:
                        return rtc_latched.minutes;
                    case 0x02:
                        return rtc_latched.hours;
                    case 0x03:
                        return rtc_latched.days;
                 
                    
                    default:
                        break;   
                        
                }
            }
            
        }
        
        window.console.log("Attempted to read from unmapped MBC1 address 0x%x", address.value());
    }
    

    var __constructor = function () {
        
        
        
    }
    
    __constructor();
    return this;
}


var MBC5 = function (rom, ram) {
    
    var ram_enabled = false;
    var ram_bank = 0;
    var rom_bank = 0;
    
    var rom_data = rom;
    var ram_data = ram;
    
    this.read = function (address) {
        // read rom data from bank 0
       if (address.in_range(0x0, 0x3fff)) {
           return rom_data[address.value()];
       }
        
        // read rom data from bank 0 or greater
        if (address.in_range(0x4000,0x7fff)){
            var rom_addr = (address.value() - 0x4000);
            rom_addr += rom_bank * 0x4000;
            return rom_data[rom_addr];
        }
        
        if (address.in_range(0xA000,0xBFFF)) {
            if (!ram_enabled) {
                window.console.log("Writing to MBC1 ram without ram enabled");
                return;
            }
            
            var ram_addr = address.value() - 0xA000;
                ram_addr = ram_addr + (ram_bank * 0x2000);
            
            return ram_data[ram_addr];
        }
        
        window.console.log("Reading from unknown memory '%d' in MBC5 chip",address.value());
        return;
    }
    
    this.write = function (address,byte) {
        if (address.in_range(0x0,0x1FFF)) {
            ram_enabled = ((byte & 0x0F) == 0x0A);
            return;
        }
        
        if (address.in_range(0x2000,0x2FFF)) {
            rom_bank = (rom_bank & 0x100) | (byte & 0xFF);
            return;
        }
        
        if (address.in_range(0x3000,0x3FFF)) {
            rom_bank = ((byte & 0x1) << 8 ) | (rom_bank & 0xff);
        }
        
        if (address.in_range(0x4000,0x5FFF)) {
            rom_bank = ((byte & 0x1) << 8 ) | (rom_bank & 0xff);
        }
        
        if (address.in_range(0xA000,0xBFFF)) {
            var ram_addr = (address.value() - 0xA000) + (ram_bank * 0x2000);
            ram_data[ram_addr] = byte;
        }
        
        
    }
    
    var constructor = function () {
        
    }
    
    constructor();
    
    return this;
    
}

