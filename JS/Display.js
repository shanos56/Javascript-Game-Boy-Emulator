/* global GBEmu */
/* global bitwise */
/* global Color */
/* global ByteRegister */
/* global Address */
/* global window */


GBEmu.display = function (cpu, memory, framebuffer) {


    var scx = new ByteRegister(0),
        scy = new ByteRegister(0),
        lcd_status = new ByteRegister(0),
        lcd_control = new ByteRegister(0),
        ly_compare = new ByteRegister(0),
        window_x = new ByteRegister(0),
        window_y = new ByteRegister(0),
        lcd = new ByteRegister(0);
        
    
    var cycles = 0;

    
    var oam_addr = 0xFE00;
    
    /* todo calculate cycles for different modes */
    var OAM_CYCLES = 0;
    var VRAM_CYCLES = 0;
    var HBLANK_CYCLES = 0;
    var VBLANK_CYCLES = 0;
    
    var line = new ByteRegister(0);
    
    // pallete information
    var BGP = new ByteRegister(0);
    var OBP0 = new ByteRegister(0);
    var OBP1 = new ByteRegister(0);
    
    
    var modes = {
        
        OAM:0,
        VRAM:1,
        HBLANK:2,
        VBLANK:3,
    }
    
    
    var current_mode = modes.OAM;
    

    this.tick = function (ticks) {
        
        cycles += ticks;
        
        switch(current_mode) {
            case modes.OAM:
                if (cycles >= OAM_CYCLES) {
                    cycles = cycles % OAM_CYCLES;
                    current_mode = modes.VRAM;
                    lcd.set_bit_to(1, 1);
                    lcd.set_bit_to(0, 1);
                }
                break;
            case modes.VRAM:
                if (cycles >= VRAM_CYCLES) {
                    cycles = cycles % VRAM_CYCLES;
                    current_mode = modes.HBLANK;
                    
                    var hblank_interrupt = bitwise.check_bit(lcd.value(), 3);
                    
                    if (hblank_interrupt) {
                        lcd_interrupt();
                    }
                    
                    var ly_coincidence_interrupt = bitwise.check_bit(lcd_status.value(), 6);
                    var ly_coincidence = ly_compare.value() == line.value();
                    
                    if (ly_coincidence_interrupt && ly_coincidence) {
                        cpu.IF.set_bit_to(1, true);
                    }
                    lcd.set_bit_to(2, ly_coincidence);
                    
                    lcd.set_bit_to(1,0);
                    lcd.set_bit_to(0,0);
                }
                break;
            case modes.HBLANK:
                if (cycles >= HBLANK_CYCLES) {
                    
                    cycles = cycles % HBLANK_CYCLES;
                    write_scanline(line);
                    line.increment();
                    
                    
                    if (line.value() == 144) {
                        current_mode = modes.VBLANK;
                        lcd_status.set_bit_to(1, 0);
                        lcd_status.set_bit_to(0, 1);
                        vblank_interrupt();
                    } else {
                        current_mode = modes.OAM;
                        lcd_status.set_bit_to(1, 1);
                        lcd_status.set_bit_to(0, 0);
                    }
                    
                    
                }
                break;
                
            case modes.VBLANK:
                if (cycles > VBLANK_CYCLES) {
                    line.increment();
                    cycles = cycles % VBLANK_CYCLES;
                    current_mode = modes.OAM;
                    
                    
                    if (line.value() == 154) {
                        line.set(0); // reset line

                        write_sprites();

                        lcd_status.set_bit_to(1, 1);
                        lcd_status.set_bit_to(0, 0);
                        
                        framebuffer.set_to_screen();

                        framebuffer.reset();
                    }
                }
                
                
        }
        
        
        
    }
    
    
    var write_scanline = function (line) {
        
        if (lcd_display_enable()) {
            if (window_display_priority()) {
                render_background_scanline(line);
            }
            
            if (window_display_enable()) {
                render_window_scanline(line);
            }
        }
        
    }
    
    var render_window_scanline = function (line) {
        
        
        var bg_code_area = window_tile_map();
        
        var tile_map_location = bg_code_area ? 0x9C00 : 0x9800;
        
        var display_x = window_x.value();
        var display_y = window_y.value();
        
        var y = line;
        
        var palette = BGP.value();
        
        for (var x = 0; x < 160; x++) {
            
            
            var map_x = display_x + x - 7;
            var map_y = y;
            
            
            // 2. Get the tile ID where that pixel is located
            var tile_col = Math.floor(map_x / 8);
            var tile_row = Math.floor(map_y / 8);
            var tile_map_id = (tile_row * 32) + tile_col;
            var loc = new Address(tile_map_location + tile_map_id);
            var tile_id = memory.read(loc);
            
            var tile_x_pixel = map_x % 8;
            var tile_y_pixel = map_y % 8;
            
            
            // Invert x pixels because they are stored backwards
            tile_x_pixel = Math.abs(tile_x_pixel - 7);
            
            
            
            if (line < display_y) {
        framebuffer.set_pixel(tile_x_pixel,tile_y_pixel,color_pallete.transparent);
            } else {
                
                update_window_tile_pixel (palette, map_x, map_y, tile_x_pixel, tile_y_pixel, tile_id);
                
            }
        }
        
        
        
    }
    
    var update_window_tile_pixel = function (palette, display_x, display_y, tile_x, tile_y, tile_id) {
        
            if (display_x >= 160 || display_x < 0)
            return;
        if (display_y >= 144 || display_y < 0)
            return;

	var bg_char_selection = window_tile_data();


	// Figure out where the current background character data is being stored
	// if selection=0 bg area is 0x8800-0x97FF and tile ID is determined by SIGNED -128 to 127
	// 0x9000 represents the zero ID address in that range
	var bg_data_location = (bg_char_selection) ? 0x8000 : 0x9000;
	var offset;

	// 0x8000 - 0x8FFF unsigned 
	if (bg_char_selection)
	{
		offset = (tile_id * 16) + bg_data_location;
	}
	// 0x8800 - 0x97FF signed
	else
	{
        var signed = window.Int8Array(1);
        signed[0]= tile_id;
		var direction = signed[0];
		var temp_offset = (bg_data_location) + (direction * 16);
		offset = temp_offset;
	}

	var
		high = memory.read(new Address(offset + (tile_y * 2) + 1)),
		low  = memory.read(new Address(offset + (tile_y * 2)));


	var color = get_pixel_color(palette, low, high, tile_x, false);

	framebuffer.set_pixel(display_x, display_y, color);
    }
    
    this.set_ly_compare = function (byte) {
        
        ly_compare.set(byte);
        
        if (ly_compare.value() == line.value()) {
            lcd_status.set_bit_to(2,1);
        }
        lcd_status.set_bit_to(2,0);
    }
    
    var render_background_scanline = function (line) {
        
        var bg_code_area = bg_tile_map();
        
        var tile_map_location = bg_code_area ? 0x9C00 : 0x9800;
        
        var scroll_x = scx.value();
        var scroll_y = scy.value();
        
        var y = line;
        
        var palette = BGP.value();
        
        
        for (var x = 0; x < 160; x++) {
            
            
            var map_x = scroll_x + x;
            var map_y = scroll_y + y;
            
            
            map_x = (map_x > 256) ? map_x - 256 : map_x;
            map_y = (map_y > 256) ? map_y - 256 : map_y;
            
            // 2. Get the tile ID where that pixel is located
            var tile_col = Math.floor(map_x / 8);
            var tile_row = Math.floor(map_y / 8);
            var tile_map_id = (tile_row * 32) + tile_col;
            var loc = new Address(tile_map_location + tile_map_id);
            var tile_id = memory.read(loc);
            
            var tile_x_pixel = map_x % 8;
            var tile_y_pixel = map_y % 8;
            
            
            // Invert x pixels because they are stored backwards
            tile_x_pixel = Math.abs(tile_x_pixel - 7);
            
            render_bg_tile_pixel(palette, x, y, tile_x_pixel, tile_y_pixel, tile_id);
            
        }
        
        
    }
    
    
    var render_bg_tile_pixel = function (palette, display_x, display_y, tile_x, tile_y, tile_id) {
        
        var bg_char_selection = window_tile_data();

	
        // Figure out where the current background character data is being stored
        // if selection=0 bg area is 0x8800-0x97FF and tile ID is determined by SIGNED -128 to 127
        // 0x9000 represents the zero ID address in that range
        var bg_data_location = new Address((bg_char_selection) ? 0x8000 : 0x9000);
        var offset = 0;
        
        var signed = new window.Int8Array(1);

        // 0x8000 - 0x8FFF unsigned 
        if (bg_char_selection)
        {
            offset = (tile_id * 16) + bg_data_location;
        }
        // 0x8800 - 0x97FF signed
        else
        {
            signed[0] = tile_id;
            var temp_offset = (bg_data_location) + (signed[0] * 16);
            offset = temp_offset;
        }

        var
            high = memory.read(new Address(offset + (tile_y * 2) + 1)),
            low  = memory.read(new Address(offset + (tile_y * 2)));

        var color = get_pixel_color(palette, low, high, tile_x, false);
        framebuffer.setPixel(display_x, display_y, color);

    }
    
    
    var lcd_interrupt = function () {
        cpu.IF.set_bit_to(1,1);
    }
    
    var vblank_interrupt = function () {
        cpu.IF.set_bit_to(0,1);
    }
    
    
    // check if the lcd display is enabled
    var lcd_display_enable = function () {
        return bitwise.check_bit(lcd_control.value(),7);
    }
    // fetches which address to use for window tile map
    // (0=9800-9BFF, 1=9C00-9FFF)
    var window_tile_map = function () {
        return bitwise.check_bit(lcd_control.value(),6);
    }
    
    // check if window display is enabled
    var window_display_enable = function () {
        return bitwise.check_bit(lcd_control.value(),5);
    }
    // determines the address of the tile data
    // for bg and window
    // (0=8800-97FF, 1=8000-8FFF)
    var window_tile_data = function () {
        return bitwise.check_bit(lcd_control.value(), 4);
    }
    // fetches the tile map to use for background
    // (0=9800-9BFF, 1=9C00-9FFF)
    var bg_tile_map = function () {
        return bitwise.check_bit(lcd_control.value(), 3);
    }
    
    // sprite tile size
    // (0=8x8, 1=8x16)
    var obj_size = function () {
        return bitwise.check_bit(lcd_control.value(), 2);
    }
    
    var obj_display_enable = function () {
        return bitwise.check_bit(lcd_control.value(), 1);
    }
    
    var window_display_priority = function () {
        return bitwise.check_bit(lcd_control.value(), 0);
    }
   
    
    var write_sprites = function () {
        
        if (obj_display_enable()) {
            for(var i = 0; i < 40; i++) {
                render_sprite(i);
            }
        }
        
    }
    
    // fetches sprite data from oam memory
    var render_sprite = function (sprite_n) {
        
        var offset = oam_addr + 4 * sprite_n;
        
        var use_8x16 = obj_size();
                
        var xPosition = memory.read(offset++);
        var yPosition = memory.read(offset++);
            
        // sprite is outside of view range
        if (xPosition == 0 || xPosition >= 168) {
            return;
        }
        if (yPosition == 0 || yPosition >= 160) {
            return;
        }
        
        var tile_id = memory.read(offset++);
        
        var flags = memory.read(offset++);
        
        var pallete =  bitwise.check_bit(flags,4) ? OBP1 : OBP0;
        
        if (use_8x16) {
            
            tile_id = tile_id & 0xFE;
            var bottom_tile_id = tile_id | 0x1;
            render_sprite_tile (pallete,xPosition,yPosition,tile_id,flags);
            
            render_sprite_tile (pallete,xPosition,yPosition + 8,bottom_tile_id,flags);
            
        } else {
            
            render_sprite_tile (pallete,xPosition,yPosition,tile_id,flags);
        }
        
        
        
        
    }
    
    var render_sprite_tile = function (pallete,start_x,start_y,tile_id,flags) {
        
        var TILE_ZERO_ADDRESS = 0x8000;
            
        var offset = tile_id * 16 + TILE_ZERO_ADDRESS;
        
        var flip_x = bitwise.check_bit(flags,5),
            flip_y = bitwise.check_bit(flags,6),
            priority = bitwise.check_bit(flags,7);
        
        start_x -= 8;
        start_y -= 16;
        
        
        for (var y = 0; y < 8; y++) {
            
            // get the high byte, every odd address is the high byte
            var high = memory.read(offset + (y*2) +1),
                low = memory.read(offset + (y*2));
            
            for (var x = 0; x < 8; x++) {
                
                var x_loc = flip_x ? start_x + x: start_x + 7 - x;
                var y_loc = flip_y ? start_y + 7 - y: start_y - y;
                
                // sprite is outside of view range
                if (x_loc == 0 || x_loc >= 160) {
                    continue;
                }
                if (y_loc == 0 || y_loc >= 144) {
                    continue;
                }
                
                var color = get_pixel_color(pallete,low,high,x,true);
                
                
                
                if (priority) {
                    // if sprite is behind the existing window or background 
                    // and the color of background is not white
                    // then skip adding pixel to show it is no longer seen
                    if (framebuffer.get_pixel(x_loc,y_loc).value() != 0x0) {
                        continue;
                    }
                    
                    
                    
                }
                if (color.transparent()) {
                    // no point in setting new pixel if it is see through, hence background is shown anyway,
                    continue;
                }
               
                framebuffer.set_pixel(x_loc,y_loc,color)
            }
            
            
            
            
        }
        
        
        
    }
    
    var get_pixel_color = function (pallete,low,high,bit,is_sprite) {
        
        var shade_3 = (pallete.value() >> 6),
            shade_2 = (pallete.value() >> 4) & 0x03,
            shade_1 = (pallete.value() >> 2) & 0x03,
            shade_0 = (pallete.value() & 0x03);
        
        
        var color = bitwise.check_bit(high,bit) << 1 | bitwise.check_bit(low,bit);
        
        
        switch (color) {
                
            case 0x0:
                return is_sprite? color_pallete.transparent: shades_of_grey[shade_0]
            case 0x1:
                return  shades_of_grey[shade_1];
            case 0x2:
                return  shades_of_grey[shade_2];
            case 0x3:
                return  shades_of_grey[shade_3];
            default:
                return color_pallete.transparent;
                
        }
    }
    
    
    
    
    var shades_of_grey = new Array(4);
    
    shades_of_grey[0x0] = color_pallete.white;
    shades_of_grey[0x1] = color_pallete.lighGrey;
    shades_of_grey[0x2] = color_pallete.darkGrey;
    shades_of_grey[0x3] = color_pallete.black;
    
    var color_pallete = {
        
        transparent:new Color(-1),
        white:new Color(0x0),
        lighGrey:new Color(0xd3d3d3),
        darkGrey:new Color(0xcccccc),
        black:new Color(0x000000)
        
    }
    
    
    
    this.BGP = function (byte) {
        BGP = new ByteRegister(byte);
    }
    
    this.OBP0 = function (byte) {
        
        OBP0 = new ByteRegister(byte);

    }
    
    this.OBP1 = function (byte) {
        
        OBP1 = new ByteRegister(byte);
    }
    
    this.set_window_x = function (byte) {
        window_x.set(byte);
    }
    
    this.set_window_y = function (byte) {
        window_y.set(byte);
    }


}
