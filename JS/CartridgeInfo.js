
/* exported CartridgeInfo */
/* global window */



var CartridgeInfo = function () {
    
    
    this.locations = {
        entrypoint:0x100,
        nintendologo:0x104,
        title:0x134,
        manufacturercode:0x13f,
        cgbflag:0x143,
        new_license_code:0x144,
        sgb_flag:0x146,
        cartridge_type:0x147,
        rom_size:0x148,
        ram_size:0x149,
        destination_code:0x14A,
        old_license_code:0x14B,
        version_number:0x14C,
        header_checksum:0x14D,
        global_checksum:0x14E
    }
    
    // sizes in kilobytes
    var rom_size = {
        
        0:32,
        1:64,
        2:128,
        3:256,
        4:512,
        5:1024,
        6:2048,
        7:4096,
        8:8192,
        0x52:1126,
        0x53:1229,
        0x54:1536 
        
    }
    
    // sizes in kilobytes
    var ram_size = {
        0:0,
        1:2,
        2:8,
        3:32,
        4:128,
        5:64
    }
    
    var cartridge_type = {
        0:'NoMBC',
        1:'MBC1',
        2:'MBC2',
        3:'MBC3',
        4:'MBC4',
        5:'MBC5'
    }
    
    this.destination = function (destination) {
        switch (destination) {
            case 0x00:
                return "Japanese";
            case 0x01:
                return "NonJapanese";
            default:
                window.console.log("Unknown destination: %X", destination);
                return "NonJapanese";
        }
    }
    
    this.cartridgeType = function (u8) {
        
        u8 = u8 & 0xff;
        
        switch (u8) {
                case 0x00:
                case 0x08:
                case 0x09:
                    return cartridge_type[0];

                case 0x01:
                case 0x02:
                case 0x03:
                case 0xFF:
                    return cartridge_type[1];

                case 0x05:
                case 0x06:
                    return cartridge_type[2];

                case 0x0F:
                case 0x10:
                case 0x11:
                case 0x12:
                case 0x13:
                    return cartridge_type[3];

                case 0x15:
                case 0x16:
                case 0x17:
                    return cartridge_type[4];

                case 0x19:
                case 0x1A:
                case 0x1B:
                case 0x1C:
                case 0x1D:
                case 0x1E:
                    return cartridge_type[5];

                case 0x0B:
                case 0x0C:
                case 0x0D:
                case 0x20:
                case 0x22:
                case 0xFC:
                case 0xFD:
                case 0xFE:
                    return "unknown";

                default:
                    window.console.log("Unknown cartridge type: %X", u8);
                    return "unknown";
            }
                
    }
    
    this.romSize = function (u8) {
        
        if (rom_size.hasOwnProperty(u8)) {
            return rom_size[u8];
        } else {
            window.console.log ("Unknown rom size: %X", u8)
            return 0
        }
    }
    
    this.ramSize = function (u8) {
        
        if (ram_size.hasOwnProperty(u8)) {
            return ram_size[u8];
        } else {
            window.console.log ("Unknown ram size: %X", u8)
            return 0
        }
    }
    
    this.headerChecksum(u8) {
        
        for (var i = 0,x=0; i < 8;i++ ) {
            x = x-(u8 & (0x1 << 8-1))-1;
        }
        return x == u8;
    }
    
    return this;
}

