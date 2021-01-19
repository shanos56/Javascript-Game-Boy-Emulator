/*jslint browser: true */
/* exported memory */
/* global window */
/* global GBEmu */

GBEmu.memory = function (cartridge, cpu, video, timer, input, serial) {

    var _timer = timer;
    var _cartridge = cartridge;
    var _cpu = cpu;
    var _video = video;
    var _input = input;
    var _serial = serial;
    
    var vram = window.Uint8Array(0x2000);
    var wram = window.Uint8Array(0x2000);
    var oam = window.Uint8Array(0xA0);
    var io = window.Uint8Array(0xff);
    var zram = window.Uint8Array(0x7F);
    
    this.write = function(address, byte) {
        
        // rom bank 00 in cartridge
        if (address.in_range(0x0,0x3fff)) {
            cartridge.write(address,byte)
        }
        // rom bank 01 to nn
        if (address.in_range(0x4000,0x7fff)) {
            cartridge.write(address,byte);
        }
        // add to vram
        if (address.in_range(0x8000,0x9fff)) {
            vram[address.value() & 0x1fff] = byte;
        }
        
        // external ram
        if (address.in_range(0xA000,0xBfff)) {
            cartridge.write(address,byte);
        }
        
        if (address.in_range(0xC000,0xDFFF)) {
            wram[address.value() & 0x1fff] = byte;
        }
        // echo ram
        if (address.in_range(0xE000,0xFDFF)) {
            wram[(address.value() - 0x2000) & 0x1fff] = byte;
        }
        
        /* OAM (Object Attribute Memory for Sprites) */
        if (address.in_range(0xFE00, 0xFE9F)) {
            oam[address.value() & 0xff] = byte;
            // todo: update sprite upon adding
        }

        if (address.in_range(0xFEA0, 0xFEFF)) {
            window.console.log("Attempting to write to unusable memory 0x%x", address.value());
        }

        /* Mapped IO */
        if (address.in_range(0xFF00, 0xFF7F)) {
           write_io(address,byte);
        }

        /* Zero Page ram */
        if (address.in_range(0xFF80, 0xFFFE)) {
            zram[address - 0xff80] = byte;
        }

        /* Interrupt Enable register */
        if (address == 0xFFFF) {
            return cpu.interrupt_enabled.value();
        }
    }
    

    this.read = function (address) {
        
         // rom bank 00 in cartridge
        if (address.in_range(0x0,0x3fff)) {
            return cartridge.read(address)
        }
        // rom bank 01 to nn
        if (address.in_range(0x4000,0x7fff)) {
            return cartridge.read(address);
        }
        // add to vram
        if (address.in_range(0x8000,0x9fff)) {
            return vram[address.value() & 0x1fff];
        }
        
        // external ram
        if (address.in_range(0xA000,0xBfff)) {
            return cartridge.read(address);
        }
        
        if (address.in_range(0xC000,0xDFFF)) {
            return wram[address.value() & 0x1fff];
        }
        // echo ram
        if (address.in_range(0xE000,0xFDFF)) {
            return wram[(address.value() - 0x2000) & 0x1fff];
        }
        
        /* OAM (Object Attribute Memory for Sprites) */
        if (address.in_range(0xFE00, 0xFE9F)) {
            return oam[address.value() & 0xff];
            // todo: update sprite upon adding
        }

        if (address.in_range(0xFEA0, 0xFEFF)) {
            window.console.log("Attempting to write to unusable memory 0x%x", address.value());
        }

        /* Mapped IO */
        if (address.in_range(0xFF00, 0xFF7F)) {
           io[address & 0xff];
        }

        /* Zero Page ram */
        if (address.in_range(0xFF80, 0xFFFE)) {
            return zram[address - 0xff80];
        }

        /* Interrupt Enable register */
        if (address == 0xFFFF) {
            return cpu.interrupt_enabled.value();
        }
    }
    
    
    
    var write_io = function(address, byte) {
    switch (address.value()) {
        case 0xFF00:
            input.write(byte);
            return;

        case 0xFF01:
            /* Serial data transfer (SB) */
            serial.write(byte);
            return;

        case 0xFF02:
            /* Serial data transfer (SB) */
            serial.write_control(byte);
            return;

        case 0xFF04:
            timer.reset_divider();
            return;

        case 0xFF05:
            /* TODO: Time control */
            window.console.log("Wrote to timer counter");
            return;

        case 0xFF06:
            timer.set_timer_modulo(byte);
            return;

        case 0xFF07:
            timer.set_timer_control(byte);
            return;

        case 0xFF0F:
            cpu.interrupt_flag.set(byte);
            return;

        /* TODO: Audio - Channel 1: Tone & Sweep */
        case 0xFF10:
        case 0xFF11:
        case 0xFF12:
        case 0xFF13:
        case 0xFF14:
            return;

        /* TODO: Audio - Channel 2: Tone */
        case 0xFF16:
        case 0xFF17:
        case 0xFF18:
        case 0xFF19:
            return;

        /* TODO: Audio - Channel 3: Wave Output */
        case 0xFF1A:
        case 0xFF1B:
        case 0xFF1C:
        case 0xFF1D:
        case 0xFF1E:
            return;

        /* TODO: Audio - Channel 4: Noise */
        case 0xFF20:
        case 0xFF21:
        case 0xFF22:
        case 0xFF23:
            return;

        /* TODO: Audio - Sound Control Registers */
        case 0xFF24:
            /* TODO */
            /* log_unimplemented("Wrote to channel control address 0x%x - 0x%x", address.value(), byte); */
            return;

        case 0xFF25:
            /* TODO */
            /* log_unimplemented("Wrote to selection of sound output terminal address 0x%x - 0x%x", address.value(), byte); */
            return;

        case 0xFF26:
            /* TODO */
            window.console.log("Wrote to sound on/off address 0x%x - 0x%x", address.value(), byte);
            return;

        /* TODO: Audio - Wave Pattern RAM */
        case 0xFF30:
        case 0xFF31:
        case 0xFF32:
        case 0xFF33:
        case 0xFF34:
        case 0xFF35:
        case 0xFF36:
        case 0xFF37:
        case 0xFF38:
        case 0xFF39:
        case 0xFF3A:
        case 0xFF3B:
        case 0xFF3C:
        case 0xFF3D:
        case 0xFF3E:
        case 0xFF3F:
            io[address & 0xff] = byte;
            return;

        /* Switch on LCD */
        case 0xFF40:
            video.control_byte = byte;
            return;

        case 0xFF41:
            /* TODO */
            video.lcd_status.set(byte);
            return;

        /* Vertical Scroll Register */
        case 0xFF42:
            video.scroll_y.set(byte);
            return;

        /* Horizontal Scroll Register */
        case 0xFF43:
            video.scroll_x.set(byte);
            return;

        /* LY - Line Y coordinate */
        case 0xFF44:
            /* "Writing will reset the counter */
            video.line.set(0x0);
            return;

        case 0xFF45:
            video.ly_compare.set(byte);
            return;

        case 0xFF46:
            dma_transfer(byte);
            return;

        case 0xFF47:
            video.bg_palette.set(byte);
            window.console.log("Set video palette: 0x%x", byte);
            return;

        case 0xFF48:
            video.sprite_palette_0.set(byte);
            window.console.log("Set sprite palette 0: 0x%x", byte);
            return;

        case 0xFF49:
            video.sprite_palette_1.set(byte);
            window.console.log("Set sprite palette 1: 0x%x", byte);
            return;

        case 0xFF4A:
            video.window_y.set(byte);
            return;

        case 0xFF4B:
            video.window_x.set(byte);
            return;

        case 0xFF4D:
            window.console.log("Attempted to write to 'Prepare Speed Switch' register");
            return;

        /* Disable boot rom switch */
        case 0xFF50:
            io[address & 0xff] = byte;
            global_logger.enable_tracing();
            window.console.log("Boot rom was disabled");
            return;

        case 0xFF7F:
            window.console.log("Attempt to write to unused memory 0x%x", address.value());
            return;

        default:
            /* TODO */
            window.console.log("Wrote 0x%x to unknown address 0x%x", byte, address.value());
    }
}


    
}