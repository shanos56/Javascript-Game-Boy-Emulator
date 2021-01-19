/** cartridges */
/* global window */
/* global cartridgeInfo */
/* external NoMBC */


var NoMBC = function (rom) {
    
    var rom_data = rom;
    
    this.read = function (address) {
        return rom_data[address];
    }
    
    this.write = function (address, byte) {
        window.console.log ("unable to write to NoMbc cartridge.")
    }
    var getRomSize = function () {
        
        return cartridgeInfo.location.rom_size
    }
    
    var __constructor = function () {
        
    }
    
    return this;
}


var MBC1 = function (rom, ram) {
    
    
    var ram_enable = false; // whether allow the use of external ram
    var rom_bank = 0; // the rom bank currently selecting data from
    var rom_ram_mode = 0; // 0 = 16Mb ROM/8KB RAM 1 = 4Mb ROM/32KB RAM.
    var ram_bank = 0; // RAM Bank Number or Upper Bits of ROM Bank Number depends upon ram bank mode
    
    var rom_data;
    var ram_data;
    
    
    
    /**
    *
    *   @description adjusts rom_bank due to slight issue with mbc1 card
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
    }
    
    
    this.write = function (address, byte) {
        // enables the use of external ram found in the cartridge
        if (address.in_range(0x0,0x1FFF) && (byte & 0x0F) == 0x0A) {
            ram_enable = true;
            return;
        } else {
            ram_enable = false;
            return;
        }
        
        // sets the value of current rom_bank getting information
        if (address.in_range(0x2000,0x3FFF)) {
            // in mbc 1 the som of the rom banks are increased by 1, unsure the reason but seems lower 5 bits in byte affect the rom_bank
            
            // this is a 5-bit register but is used as a 7 bit register
            // rom.ram mode makes using this as a 7 bit register easier
            rom_bank = (rom_bank & 0x60) | (byte & 0x1f);
            
            adjust_rom_bank();
            return;
        }
        
        // 2 bit register theat either holds the ram_bank number or top 2 bits of the rom_bank number
        if (address.in_range(0x4000,0x5FFF)) {
            if (rom_ram_mode) {
                ram_bank = byte & 0x03
                return;
            } else {
                // rather than set the ram_bank number to two digits, adjust the the rom_bank number
                // sets the upper two bits for the rom_bank
                rom_bank = ((byte & 0x03) << 5) | (rom_bank & 0x1f)
                adjust_rom_bank();
                rom_offset = rom_bank * 0x4000; // each rom bank is 16 kilobytes
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
            
            if (rom_ram_mode == 0 && ram_bank > 0) {
                window.console.log ("Writing to ram bank %s in rom mode", ram_bank);
                return;
            }
            
            var ram_addr = address.value() - 0xA000;
            // 1 = in rom banking mode mbc1 has 4 ram banks
            // 0 = not in rom banking mode, cpu can only access 1 ram bank
            if (rom_ram_mode) {
                ram_addr = ram_addr + (ram_bank * 0x2000);
            }
            
            ram_data[ram_addr] = byte
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
                rom_addr += rom_bank * 0x4000;
            } else {
                rom_addr += (rom_bank & 0x1f) * 0x4000;
            }
            
            return rom_data[rom_addr];
        }
        // read ram data from cartridge
        if (address.in_range(0xA000,0xBfff)) {
            if (!ram_enable) {
                window.console.log("Attempted to read MBC1 ram address 0x%x, while ram is disabled.", address.value());
            }
            var ram_addr = (address.value() - 0xA000) + (ram_bank * 0x2000);
            
            return ram_data[ram_addr];
        }
        
        window.console.log("Attempted to read from unmapped MBC1 address 0x%x", address.value());
    }
    var __constructor = function () {
        
        
        
    }
    
    __constructor();
    return this;
}


var MBC2 = function (rom, ram) {
    
    
    var ram_enable = false; // whether allow the use of external ram
    var rom_bank = 1; // the rom bank currently selecting data from
    // has only 16 rom banks
    var rom_data = window.Uint8Array(0x3E800); // used to track data
    var ram_data= window.Uint8Array(256); // used to track data
    
    
    
    this.write = function (address, byte) {
        
        if (address.in_range(0x0,0x3fff)) {
            // checks for ram mode
            // the 9th bit(least significant bit of high byte) in address is equal to 1 determines if ram is on or off
            if (address.value() & 0x100 == 0) {
                if (byte && 0x0f == 0x0A) {
                    ram_enable = true;
                }
                
            } else {
                // if 9th bit == 1 then first 4 bits 
                    rom_bank = byte & 0xf;
                    // if rom_bank 0 is chosen, value is mapped to rom_bank 1
                    rom_bank = rom_bank == 0 ? rom_bank++ : rom_bank;
                }
            }
            return;
        }
    
        if (address.in_range(0xA000,0xA1ff)) {
             if (!ram_enable) {
                window.console.log("Attempted to write to MBC2 ram address 0x%x, while ram is disabled.", address.value());
            }
            
            var ram_addr = address.value() & 0x1fff;
            
            return ram_data[ram_addr];
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
                var rom_addr = (rom_bank & 0x1f) * 0x4000;
            }
            
            return rom_data[rom_addr];
        }
        // read ram data from cartridge
        if (address.in_range(0xA000,0xBfff)) {
            var ram_addr = (address.value() - 0xA000) + (ram_bank * 0x2000);
            return ram_data[ram_addr];
        }
        
        window.console.log("Attempted to read from unmapped MBC1 address 0x%x", address.value());
        return;
    }
    
    var __constructor = function () {
        
        
        
    }
    
    
    __constructor();

    return this;
    
}

var MBC3 = function (rom, ram) {
        
    var ram_enable = false; // whether allow the use of external ram
    var rom_bank = 0; // the rom bank currently selecting data from
    var rom_ram_mode = 0; // 0 = 16Mb ROM/8KB RAM 1 = 4Mb ROM/32KB RAM.
    var ram_bank = 0; // RAM Bank Number or Upper Bits of ROM Bank Number depends upon ram bank mode
    
    var rom_data;
    var ram_data;
    var rtc_registers = window.Uint8Array(5);
    var latch_data_reg = 0x0;
    
    var is_ram = function(bank) {
        return bank < 0x08;
    }
    var is_rtc = function(bank) {
        return bank > 0x07 && bank < 0x0D;
    }
    
      this.write = function (address, byte) {
        // enables the use of external ram found in the cartridge
        if (address.in_range(0x0,0x1FFF) && (byte & 0x0F) == 0x0A) {
            ram_enable = true;
            return;
        } else {
            ram_enable = false;
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
                var date = new Date();
                rtc_registers[0] = date.getSeconds();
                rtc_registers[1] = date.getMinutes();
                rtc_registers[2] = date.getHours();
                // todo 
                // rtc_registers[3] is the number of days counted every 511
                // rtc_registers[3]
                latch_data_reg == 1;
                
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
            
            if (is_ram(ram_bank)) {
                var ram_addr = (address.value() & 0x1fff) + (ram_bank * 0x2000);
                ram_data[ram_addr] = byte;
            } else if (is_rtc(ram_bank)) {
                
            }
             // same as (address - 0xA000)
           
        
       
            
            ram_data[ram_addr] = byte
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
                return rtc_registers[(byte & 0xf)-0x08];
            }
            
            
        }
        
        window.console.log("Attempted to read from unmapped MBC1 address 0x%x", address.value());
    }
    

    var __constructor = function () {
        
        
        
    }
    
    __constructor();
    return this;
    
    
}

