/* cpu */
/* global GBEmu */
/* global window */
/* global bitwise */
/* global ByteRegister */
/* global WordRegister */
/* global Address */
/* global conditional */

/* global cycles_cb */
/* global cycles_normal */
/* global cycles_branched */


//
// https://gist.github.com/sifton/4471555


GBEmu.cpu = function() {
    'use strict';
    
    var memory;

    // 8 bit registers
    var a, b, c, d, e, f, h, l;
    
    // 16 bit registers
    var AF;
    var BC;
    var DE;
    var HL;
    var SP;
    var PC;
    // there's no such thing as enums in javascript
    // using 0, 1, 2, 3 as values
    
    // total cpu clock cycles
    this.cycles = 0;
    // halts the loop
    var halted = false;
    
    // determines if a branch is taken
    var branch_taken = 0;
    
    // whether to handle the interrupts
    var interrupt_master_enabled = false;
    
    // interrupt registers
    // determines which interrupt to execute
    this.IF = new ByteRegister(0); 
    this.IE = new ByteRegister(0);
    
    var constructor = function () {
        // some times its necessary to adjust these bytes separately
        // you can't reference these variables inside wordregister unless 
        // they are objects
        a = new ByteRegister(0);
        b = new ByteRegister(0);
        c = new ByteRegister(0);
        d = new ByteRegister(0);
        e = new ByteRegister(0);
        f = new ByteRegister(0);
        h = new ByteRegister(0);
        l = new ByteRegister(0);
        
        
        // referencing the registers a,b,c,d,e,f,h,l makes it easier to make adjustments
        // sometimes its necessary to make adjustment to the registers together hence 
        // hence re
        AF = new WordRegister(a,f);
        BC = new WordRegister(b,c);
        DE = new WordRegister(d,e);
        HL = new WordRegister(h,l);
        
        // this doesn't require the 16 bit to be split into bytes
        SP = new Address(0);
        PC = new Address(0);
        
    }
    
    /**
    *
    * @description interrupts occur stop halting the cpu, also to handle external events, such as lcd, vblank, input from               joypad, etc
    *
    *
    */
    var handle_interrupts = function () {
        
        if (interrupt_master_enabled) {
            
            var interrupts_handled = this.IF.value() & this.IE.value() & 0x1f;
            
            if (!interrupts_handled) {
                return;
            }
            
            opp_func.push(PC);
            halted = false;
            
            switch (true) {
                    
                case bitwise.check_bit(interrupts_handled, 0):
                    execute_interupt(0, interrupts.vBlank);
                    return;
                    
                case bitwise.check_bit(interrupts_handled, 1):
                    execute_interupt(1, interrupts.lcd);
                    return;
                    
                case bitwise.check_bit(interrupts_handled, 2):
                    execute_interupt(2, interrupts.timer);
                    return;
                case bitwise.check_bit(interrupts_handled, 3):
                    execute_interupt(3, interrupts.serial);
                    return;
                
                case bitwise.check_bit(interrupts_handled, 4):
                    execute_interupt(4, interrupts.joypad);
                    return;
                    
                default:
                    return;
            }
            
        }
    }
    /** 
    * 
    * @description executes an interupt 
    *
    * @return amount of cycles elapsed to complete cpu operation
    */
    var execute_interupt = function(bit, address) {
        
        this.IF.set_bit_to(bit,false); // cancels fired interrupt
        PC.set(address); // sets PC to address
        interrupt_master_enabled = false; // cancels interrupts
    }
    
    /** 
    * 
    * @description execute a operation code and return the cycles
    *
    * @return amount of cycles elapsed to complete cpu operation
    */
    this.tick = function () {
        
        handle_interrupts();
        branch_taken = false;
        var ticks = 0;
         if (halted) 
            return 0;
        
        // not needed unless logging
        //var opcode_16 = PC.value();
        var opcode = get_byte_from_pc();
        
        // if opcode is 
        if (opcode == 0xCB) {
           opcode = get_byte_from_pc();
           ticks = execute_cb_opcode(opcode);
        } else {
            ticks = execute_normal_opcode(opcode);
        }
        this.cycles += ticks;
        return ticks;
                   
    }
    
    /**
    * 
    * @description executes an operation code on anothertable, only accessible by the 0xCB opcode
    *
    * @return the amount of cycles required to complete operation
    */
    var execute_cb_opcode = function (opcode) {
        
        this.opcode_cb[opcode].call();
        
        return cycles_cb[opcode];
        
    }
    
    /**
    * 
    * @description executes an operation code, 
        if a conditional was true then the operation takes a different amount of cycles the 
    *
    * @return the amount of cycles required to complete operation
    */
    var execute_normal_opcode = function (opcode) {
        
        this.opcode[opcode].call();
        return !branch_taken ? cycles_normal[opcode]: cycles_branched[opcode];
        
    }
    
    // addresses that rst opcode uses to jump PC to a new location
    var rst = {
        'rst1':0x00,
        'rst2':0x08,
        'rst3':0x10,
        'rst4':0x18,
        'rst5':0x20,
        'rst6':0x28,
        'rst7':0x30,
        'rst8':0x38,
    }
    // address of interrupts
    // the program counter is set to one of these addresses when an interrupt occurs
    var interrupts = {
        vBlank:0x40,
        lcd:0x48,
        timer:0x50,
        serial:0x58,
        joypad:0x60
        
    }
    
    var get_zero_flag = function () {
        return bitwise.check_bit(f.value(),7);
    }
    
    var get_carry_flag = function () {
        return bitwise.check_bit(f.value(),4);
    }
    
    var get_half_carry_flag = function () {
        return bitwise.check_bit(f.value(),5);
    }
    
    var get_subtract_flag = function () {
        return bitwise.check_bit(f.value(),6);
    }
    
    var set_zero_flag = function (val) {
        // zero flag is the seventh bit of the lower end of 16 bit register 1 = on, 0 = off
        f.set(bitwise.set_bit_to(f.value(),7,val));
    }
    
    var set_subtract_flag = function (val) {
        f.set(bitwise.set_bit_to(f.value(),6,val));
    }
    
    var set_half_carry_flag = function (val) {
        f.set(bitwise.set_bit_to(f.value(),5,val));
    }
    
    this.is_conditional = function (cond) {
        var branch = 0;
        
        switch (cond) {
            case GBEmu.conditional.nz:
                branch = !get_zero_flag();
                break;
            case GBEmu.conditional.z:
                branch = get_zero_flag();
                break;
            case GBEmu.conditional.nc:
                branch = !get_carry_flag();
                break;
            case GBEmu.conditional.c:
                branch = get_carry_flag();
                break;
            default:
                branch = 0;
                break;
        }
        branch_taken = branch;
        return branch;
    }
    
    var set_carry_flag = function (val) {
        f.set(bitwise.set_bit_to(f.value(),4,val));
    }
    this.zero_flag = function(bool) {
        bool = bool ? 1: 0;
        set_zero_flag(bool);

    }
    this.subtract_flag = function (bool) {
        bool = bool ? 1: 0;
        set_subtract_flag(bool);
    }
    
    this.half_carry_flag = function (bool) {
        bool = bool ? 1: 0;
        set_half_carry_flag(bool);
    }
    this.carry_flag = function (bool) {
        bool = bool ? 1: 0;
        set_carry_flag(bool);
    }

    
          var get_byte_from_pc = function () {
            var n = new window.Uint8Array(1);
            n[0] = memory.read(PC);
            PC.increment();
            return n[0];
        }
          
        var get_signed_byte_from_pc = function () {
            var n = new window.Int8Array(1);
            n[0] = memory.read(PC);
            PC.increment();
            return n[0];
        }

        var get_word_from_pc = function () {
            var high = this.get_byte_from_pc();
            var low = this.get_byte_from_pc();
            return bitwise.compose_bytes(high,low);
        }
    
    var opp_func = {
        
        
        'add': function(reg, value) {
            var result = reg.value() + value.value();

            a.set(result);

            this.zero_flag(a.value() == 0);
            this.subtract_flag(false);
            this.half_carry_flag((reg.value() & 0xf) + (value.value() & 0xf) > 0xf);
            this.carry_flag((result & 0x100) != 0);
        },
        
        'add_sp': function () {
            
            var reg = SP.value();
            
            var value = get_signed_byte_from_pc();
            
            var result = reg + value;
            
            this.zero_flag(false);
            this.subtract_flag(false);
            this.half_carry_flag(((reg ^ value ^ (result & 0xFFFF)) & 0x10) == 0x10);
            this.carry_flag(((reg ^ value ^ (result & 0xFFFF)) & 0x100) == 0x100);
            
            SP.set(result);
            
        },
        
        'adc': function (reg,value) {
            var result = reg.value() + value.value() + (get_carry_flag() ? 1 : 0);
            
            reg.set(result)
            
            this.zero_flag(a.value() == 0);
            this.subtract_flag(false);
            this.half_carry_flag((reg.value() & 0xf) + (value.value() & 0xf) > 0xf);
            this.carry_flag((result & 0x100) != 0);
            
        },
        
        'add_mem': function (reg,address) {
            this.add(reg,memory.read(address));
            
        },
        
        // half carry on a 16 bit register happens when bit 11 moves onto bit 12
        // a 16 bit carry happens when bit 15 carries onto bit 16 which can't be stored
        'add_word': function (word1,word2) {
            
            word1.set(word1.value() + word2.value())
            var result = word1.value() + word2.value();
            
            this.carry_flag((result & 0x10000) == 0x10000);
            this.subtract_flag(false);
            this.half_carry_flag((word1.value() & 0xfff) + (word2.value()& 0xfff) > 0xfff);
        },
        
        'and': function (value) {
            var result = a.value() & value.value();

            a.set(result);

            this.zero_flag(a.value() == 0);
            this.subtract_flag(false);
            this.half_carry_flag(true);
            this.carry_flag(false);
        },
        
        'bit': function (bit,reg) {
            
            this.zero_flag(bitwise.check_bit(reg.value(),bit) == false);
            this.subtract_flag(false);
            this.half_carry_flag(true);
            
        },
        
        'bit_mem': function (bit,address) {
            
            var reg = new ByteRegister(memory.read(address));
            
            this.bit (bit,reg);
            
        },
        
        
        /* Call functions */
        'call': function () {
            this.pop(new Address(get_word_from_pc()));
        },
        
        'call_conditional': function (condition) {
            if (this.is_conditional(condition)) {
                this.call();
            } else {
                get_word_from_pc();
            }
            
        },
        
        'ccf': function () {
            this.carry_flag(get_carry_flag() == 0)
            this.subtract_flag(0);
            this.half_carry_flag(0);
        },
        
        
        'cpl': function () {
            var val = a.value();
            a.set(~val);
            
            set_subtract_flag(true);
            set_half_carry_flag(true);
        },
        
        'cp': function (value) {
            var reg = a.value();
            var val = value.value();
            
            var res = window.Uint8Array(1);
            
            res[0] = reg - val; 
            
            this.zero_flag(res[0] == 0);
            this.subtract_flag(true);
            this.half_carry_flag((reg & 0xf) - (val & 0xf) < 0);
            this.carry_flag(reg - val < 0);
        },
        
        
        'daa': function () {
            var reg = a.value();

            var correction = get_carry_flag()
                ? 0x60
                : 0x00;

            if (get_half_carry_flag() || (!get_subtract_flag() && ((reg & 0x0F) > 9))) {
                correction |= 0x06;
            }

            if (get_carry_flag() || (!get_subtract_flag() && (reg > 0x99))) {
                correction |= 0x60;
            }

            if (get_subtract_flag()) {
                reg = (reg - correction) & 0xff;
            } else {
                reg = (reg + correction) & 0xff;
            }

            if (((correction << 2) & 0x100) != 0) {
                this.carry_flag(true);
            }

            this.half_carry_flag(false);
            this.zero_flag(reg == 0);

            a.set(reg);

        },
        
        'dec_byte': function (reg) {
            reg.decrement();

            this.carry_flag(reg.value() & 0xff == 0x0);
            this.subtract_flag(true);
            this.half_carry_flag(bitwise.low_nibble(reg.value()) == 0x0);
        },
        
        
        'dec_mem': function (address) { 
        
            
            var addr = new Address(address.value());
            var reg = memory.read(new Address(address.value()));
            
            reg = new ByteRegister(reg +1);
            
            memory.write(addr,new ByteRegister(reg));

            this.carry_flag(reg.value() & 0xff == 0x0);
            this.subtract_flag(true);
            this.half_carry_flag(bitwise.low_nibble(reg.value()) == 0x0);
        
        
        },
        
        'dec_word': function (reg) {
            reg.decrement();

            this.carry_flag(reg.low() & 0xff == 0x0);
            this.subtract_flag(true);
            this.half_carry_flag(reg.low_nibble() == 0x0);
        },
        
        'di': function () {
            interrupt_master_enabled = false;
        },
        
        'ei': function () {
            interrupt_master_enabled = true;
        },

        'halt': function () {
            halted = true;
        },
        'inc_byte': function (reg) {

            reg.increment();

            this.carry_flag(reg.value() == 0x0);
            this.subtract_flag(false);
            this.half_carry_flag(bitwise.low_nibble(reg.value()) == 0x0);
        },
        'inc_mem': function (address) {
            
            var addr = new Address(address.value());
            var val = memory.read(new Address(address.value()));
            
            val += 1;
            
            memory.write(addr,new ByteRegister(val));
            
            this.carry_flag(val == 0x0);
            this.subtract_flag(false);
            this.half_carry_flag(bitwise.low_nibble(val) == 0x0);
            
        },

        
        'inc_word':function (reg) {
            reg.increment();

            this.carry_flag(reg.low() & 0xff == 0x0);
            this.subtract_flag(false);
            this.half_carry_flag(reg.low_nibble() == 0x0);
        },
        
        
        
        'jp': function(address) {
            
            PC.set(address.value());
            
        },
        
        'jp_condition': function (condition) {
            
            if (this.is_conditional(condition)) {
                this.jp(new Address(get_word_from_pc()))
            }else {
                get_word_from_pc();
                // pass the next word
            }
        },
        
        'jr': function (byte) {
            
            PC.add(byte.value());
            
        },
        

        'jr_condition': function (condition) {
            
            if (this.is_conditional(condition)) {
                this.jr(get_signed_byte_from_pc());
            } else {
                // use signed byte from pc
                get_signed_byte_from_pc();
            }
            
            
        },

        
        'ld':function(register,data) {
            register.set(data);
        },
        
        'ld_address_byte_i': function (address,byte) {
            memory.write(new Address(address.value()),byte);
            address.increment();
        },
        'ld_address_byte_d': function (address,byte) {
            memory.write(new Address(address.value()),byte);
            address.decrement();
        },
        
        'ld_byte_byte': function (byte1, byte2) {
            byte1.set(byte2.value())
        },
        'ld_byte_mem':function (byteregister,address) {
            // memory is low endianess, meaning that the lower bits are stored first.
            byteregister.set(memory.read(address));
        },
        'ld_byte_mem_d': function (byte, address) {
            a.set(memory.read(new Address(address.value())));
            
            address.decrement();
        },
        
        'ldh_mem_byte': function (address,byte) {
            
            memory.write( new Address(address.value() + 0xff00), byte);
            
        },
        
        'ldh_byte_mem': function (reg,address) {
            
            reg.set(memory.read(new Address(address.value() + 0xff00)));
            
            
        },
        
        'ld_hl_sp': function () {
            
            var value = get_byte_from_pc();
            var reg = SP.value();
            
            var result = reg + value;
            
            HL.set(result);
            
            this.zero_flag(false);
            this.subtract_flag(false);
            this.half_carry_flag((reg & 0xf) + (value & 0xf) > 0xf);
            this.carry_flag((result & 0x100) != 0);
        },
        
        
        'ld_mem_byte':function (address,byteregister) {
            // memory is low endianess, meaning that the lower bits are stored first.
            memory.write(address,byteregister);
   
        },

        'ld_mem_word':function (address,wordregister) {
            // memory is low endianess, meaning that the lower bits are stored first.
            memory.write(address,wordregister.low());
            memory.write(address.increment(),wordregister.high());
        },
        

        'ld_word_word': function (wordregister1, wordregister2) {
            wordregister1.set(wordregister2.value())
        },

        'or': function (value) {
            
            var res = a.value() | value.value();
            
            a.set(res);
            
            this.carry_flag(false)
            this.zero_flag(res == 0)
            this.half_carry_flag(false);
            this.subtract_flag(false);
            
        },
        
        'pop': function (reg) {
            var bytes = window.Uint8Array(2);
            
            bytes[0] = memory.read(SP);
            SP.increment();
            bytes[1] = memory.read(SP);
            SP.increment();
            
            var res = bitwise.compose_bytes(bytes[1],bytes[0]);
            
            reg.set(res);
            
        },
        
        'push': function (reg) {
            SP.decrement();
            memory.write(SP,reg.high());
            SP.decrement();
            memory.write(SP,reg.low())
        },
        
        'res': function (bit,reg) {
            
            reg.set(bitwise.clear_bit(reg.value(),bit));
            
            return reg;
            
            
        },
        
        'res_mem': function (bit,address) {
            
            var reg = new ByteRegister(memory.read(address));
            
            var result = this.res(bit,reg);
            
            memory.write(address,result);
            
        },
        
        
        'ret': function () {
            this.pop(PC);
        },
        
        'ret_conditional': function (conditional) {
            if (this.is_conditional(conditional)){
                this.ret();
            }
        },
        
        'reti': function () {
            this.ret();
            this.ei();
        },
        

        
        'rl': function (reg) {
            var carry = get_carry_flag() ? 1 : 0;
            this.carry_flag(reg.value() & 0x80 >> 7);
            
            var result = ((reg.value() && 0x7f) << 1) | carry;
            
            this.zero_flag(false)
            this.half_carry_flag(false);
            this.subtract_flag(false);
            reg.set(result);
            return reg;
        },
        

        
        'rla': function () {
            this.rl(a);
            this.zero_flag(false);
        },
        
        'rl_mem': function (address) {
                        
            var res = this.rl(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
        },

        // bit 7 becomes the carry flag
        // then the registers bits are shifted left by 1
        // the carry flag then becomes bit 0 of the register
        'rlc': function (reg) {
            // sets the carry flag equal to bit 7
            var carry_flag = bitwise.check_bit(reg.value(),7);
            // gets the carry flag bit as either 1 or 0
            var truncated_bit = bitwise.check_bit(reg.value(),7) ? 1 : 0;
            
            // shifts the register left by 1 and adds the truncated bit as bit 0
            var result = ((reg.value() << 1) & 0xff) | truncated_bit;

            this.carry_flag(carry_flag);
            this.zero_flag(result == 0);
            this.half_carry_flag(false);
            this.subtract_flag(false);
            reg.set(result);
            return reg;
        },
        
        
        

        // rlc action on register A
        'rlca': function () {
            this.rlc(a);
            this.zero_flag(false);
        },
        
        'rlc_mem': function (address) {
            
            var res = this.rlc(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
        },
        
        // bit 0 becomes the carry flag
        // then the registers bits are shifted right by 1
        // the carry flag then becomes bit 7 of the register
        'rr': function (reg) {
            var carry = get_carry_flag() ? 1 : 0;
            var result = ((reg.value() >> 1) & 0xff) | (carry << 7);
            var will_carry = bitwise.check_bit(reg.value(),0);
          
            this.carry_flag(will_carry);
            this.half_carry_flag(false);
            this.subtract_flag(false);
            this.zero_flag(result == 0);
            reg.set(result);
            return reg;
        },
        
        'rr_mem': function (address) {
                        
            var res = this.rr(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
        },
        
        'rra': function () {
            this.rr(a);
        },
        // bit 0 becomes the carry flag
        // then the registers bits are shifted right by 1
        // the carry flag then becomes bit 7 of the register
        'rrc': function (reg) {
            var carryflag = bitwise.check_bit(reg.value(),0);
            var truncated_bit = bitwise.check_bit(reg.value(),7) ? 1 : 0;
            var result = ((reg.value() >> 1) & 0xff) | (truncated_bit << 7);
            
            this.carry_flag(carryflag);
            this.zero_flag(result == 0);
            this.half_carry_flag(false);
            this.subtract_flag(false);
            reg.set(result)
            return reg;
            
        },
        // rrc action on register A
        'rrca': function () {
            this.rrc(a);
            this.zero_flag(false);
        },
            
        'rrc_mem': function (address) {
                var res = this.rrc(new ByteRegister(memory.read(address)));
                memory.write(address,res);
            },
        
        'rst': function (offset) {
            this.push(PC);
            PC.set(offset);
        },
        
        
        'sbc': function (value) {
            
            var reg = a.value();
            var val = value.value();
            var carry = get_carry_flag() ? 1 : 0;
            
            var res = window.Uint8Array(1);
            
            res[0] = reg - val - carry;
            
            a.set(res[0]);
            
            this.zero_flag(a.value() == 0);
            this.subtract_flag(true);
            this.half_carry_flag((reg.value() & 0xf) - (value.value() & 0xf) - carry < 0);
            this.carry_flag((reg - val - carry) < 0);
        },
        
        'scf': function () {
            this.carry_flag(1);
            this.half_carry_flag(0);
            this.subtract_flag(0);
            
        },
        
        'set': function (bit,reg) {
            
            reg.set(bitwise.set_bit(reg.value(),bit));
            
            return reg;
            
        },
        
        'set_mem': function (bit,address) {
            
            var reg = new ByteRegister(memory.read(address));
            
            var result = this.set(bit,reg);
            
            memory.write(address,result);
            
        },
        

        'sla': function (reg) {
            
            this.carry_flag(reg.value() & 0x80 >> 7);
            
            var result = ((reg.value() && 0x7f) << 1);
            
            this.zero_flag(false)
            this.half_carry_flag(false);
            this.subtract_flag(false);
            reg.set(result);
            return reg;
            
        },
        
        'sla_mem': function (address) {
                                    
            var res = this.sla(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
            
        },
        
                // bit 0 becomes the carry flag
        // then the registers bits are shifted right by 1
        // the carry flag then becomes bit 7 of the register
        'sra': function (reg) {
            var result = ((reg.value() & 0xff >> 1));
            var will_carry = bitwise.check_bit(reg.value(),0);
          
            this.carry_flag(will_carry);
            this.half_carry_flag(false);
            this.subtract_flag(false);
            this.zero_flag(result == 0);
            reg.set(result);
            return reg;
            
        },
        
        'sra_mem': function (address) {
                        
            var res = this.sra(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
        },
        
        'srl': function (reg) {
            
            var result = ((reg.value() && 0x7f) << 1);
            
            this.carry_flag(bitwise.check_bit(reg.value(),7));
            this.zero_flag(false)
            this.half_carry_flag(false);
            this.subtract_flag(false);
            reg.set(result);
            return reg;
        },
        

        'srl_mem': function (address) {
                        
            var res = this.srl(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
        },
        
        'stop': function () {
            halted = true;
        },
        
        'sub': function (value) {
            var reg = a.value();
            var val = value.value();
            
            var res = window.Uint8Array(1);
            
            res[0] = reg - val;
            
            a.set(res[0]);
            
            this.zero_flag(a.value() == 0);
            this.subtract_flag(true);
            this.half_carry_flag((reg.value() & 0xf) - (value.value() & 0xf) < 0);
            this.carry_flag(reg - val < 0);
        },
        
        'swap': function (reg) {
            
            
            var low = bitwise.low_nibble(reg.value());
            var high = bitwise.high_nibble(reg.value()) >> 4;
            
            var res = bitwise.compose_nibbles(low,high);
            
            
            this.zero_flag(res == 0);
            this.subtract_flag(false);
            this.half_carry_flag(false);
            this.carry_flag(false);
            reg.set(res);
            return reg;
        },
        
        'swap_mem': function (address) {
            
            var res = this.swap(new ByteRegister(memory.read(address)));
            
            memory.write(address,res);
            
        },
        

        'xor': function (value) {
            
            var res = a.value() ^ value.value();
            
            a.set(res);
            
            this.carry_flag(false)
            this.zero_flag(res == 0)
            this.half_carry_flag(false);
            this.subtract_flag(false);
            
        }
        
        
        
    }
    this.opcode = {
    
        0x0: function () {
            // do nothing
        },

        // load into register BC, the next word(16 bits) from memory
        0x1: function () {
            opp_func.ld(BC,this.get_word_from_pc());
        },
        // write into memory at address stored in BC the value of register a
        0x2: function () {
            memory.write(Address(BC.value()),a);
        },
        
        // incrememnt the value of register BC by 1
        0x3: function () {
            opp_func.inc_word(BC);
        },
        // increment the value of register b by 1
        0x4:function () {
            opp_func.inc_byte(b);
        },
        
        // decrement the value of register b by 1 ( b = b - 1)
        0x5: function () {
            opp_func.dec_byte(b);
        },
        
        // load into register b the next byte in memory from the Program Counter Address
        0x6:function () {
            opp_func.ld(b,get_byte_from_pc());
        },
        
        0x7: function () {
            opp_func.rlca();
        },
        
        0x8: function () {
            opp_func.ld_mem_word(new Address(get_word_from_pc()),SP);
        },
        0x9: function() {
            opp_func.add_word(HL,BC);
        },
        0xA:function () {
            opp_func.ld_byte_mem(a,new Address(BC.value()));
        },
        0xB: function () {
            opp_func.dec_word(BC);
        },
        0xC: function() {
            opp_func.inc_byte(c);
        },
        0xD: function() {
            opp_func.dec_byte(c);
        },
        0xE: function () {
            opp_func.ld(c,get_byte_from_pc());
        },
        
        0xF: function () {
            opp_func.rrca();
        },
        
        0x10: function () {
            opp_func.stop();
        },
        0x11: function () {
            var word = WordRegister.getEmpty();
            word.set(get_word_from_pc());
            opp_func.ld_word_word(DE,word.set(get_word_from_pc()))
        },
        0x12: function () {
            opp_func.ld_mem_byte(Address(DE.value()),a);
        },
        0x13: function () {
            opp_func.inc_word(DE);
        },
        0x14: function () {
            opp_func.inc_byte(d);
        },
        0x15: function () {
            opp_func.dec_byte(d);
        },
        0x16: function() {
            opp_func.ld_byte_byte(d,new ByteRegister(get_byte_from_pc()))
        },
        0x17: function () {
            opp_func.rla();
        },
        0x18: function () {
            opp_func.jr(new ByteRegister(get_signed_byte_from_pc()));
        },
        0x19: function () {
            opp_func.add_word(HL,DE);
        },
        0x1A: function () {
            opp_func.ld_byte_mem(a,new Address(DE.value()));
        },
        0x1B: function () {
            opp_func.dec_word(DE);
        },
        0x1C: function () {
            opp_func.inc_byte(e);
        },
        0x1D: function () {
            opp_func.dec_byte(e);
        },
        0x1E: function () {
            opp_func.ld_byte_byte(e,new ByteRegister(get_byte_from_pc()));
        },
        0x1F: function () {
            opp_func.rra();
        },
        
        0x20: function () {
            opp_func.jr_condition(GBEmu.conditional.nz)
        },
        0x21: function () {
            opp_func.ld_word_word(HL,WordRegister.from16(get_word_from_pc()));
        },
        
        0x22: function () {
            opp_func.ld_address_byte_i(new Address(HL.value()),a);
        },
        0x23: function () {
            opp_func.inc_word(HL);
        },
        0x24: function () {
            opp_func.inc_byte(h);
        },
        0x25: function () {
            opp_func.dec_byte(h);
        },
        0x26: function () {
            opp_func.ld_byte_byte(h,new ByteRegister(get_byte_from_pc()));
        },
        0x27: function () {
            opp_func.daa();
        },
        0x28: function () {
            opp_func.jr_condition(conditional.z);
        },
        0x29: function () {
            opp_func.add_word(HL,HL);
        },
        0x2A: function () {
            opp_func.ld_byte_mem(a,HL);
            HL.increment();
        },
        0x2B:function () {
            opp_func.dec_word(HL);
        },
        0x2C: function () {
            opp_func.inc_byte(l);
        },
        0x2D: function () {
            opp_func.dec_byte(l);
        },
        0x2E: function () {
            opp_func.ld_byte_byte(l,new ByteRegister(get_byte_from_pc()))
        },
        0x2F: function () {
            opp_func.cpl();
        },
        0x30: function () {
            opp_func.jr_condition(conditional.nc);
        },
        0x31: function () {
            opp_func.ld_word_word(SP,WordRegister.from16(get_word_from_pc()));
        },
        0x32: function () {
            opp_func.ld_address_byte_d(HL,a);
        },
        0x33: function () {
            opp_func.inc_word(SP);
        },
        0x34: function () {
            opp_func.inc_mem(HL);
        },
        0x35: function () {
            opp_func.dec_mem(HL);
        },
        0x36: function  () {
            opp_func.ld_mem_byte(HL,new ByteRegister(get_byte_from_pc()));
        },
        0x37: function () {
            opp_func.scf();
        },
        0x38: function () {
            opp_func.jr(GBEmu.conditional.c);
        },
        0x39: function () {
            opp_func.add_word(HL,SP);
        },
        0x3A: function () {
            opp_func.ld_byte_mem_d(a,HL);
        },
        0x3B: function () {
            opp_func.dec_word(SP);
        },
        0x3C: function () {
            opp_func.inc_byte(a);
        },
        0x3D: function () {
            opp_func.dec_byte(a);
        },
        
        0x3E: function () {
            opp_func.ld_byte_byte(a,new ByteRegister(get_byte_from_pc()));
        },
        0x3F: function () {
            opp_func.ccf();
        },
        0x40: function () {
            opp_func.ld_byte_byte(b,b);
        },
        0x41: function() {
            opp_func.ld_byte_byte(b,c);
        },
        0x42: function () {
            opp_func.ld_byte_byte(b,d);
        },
        0x43: function () {
            opp_func.ld_byte_byte(b,e);
        },
        0x44: function () {
            opp_func.ld_byte_byte(b,h);
        },
        0x45: function () {
            opp_func.ld_byte_byte(b,l);
        },
        
        0x46: function () {
            opp_func.ld_byte_mem(b,HL);
        },
        
        0x47: function() {
            opp_func.ld_byte_byte(b,a);
        },
        0x48: function () {
            opp_func.ld_byte_byte(c,b);
        },
        0x49: function () {
            opp_func.ld_byte_byte(c,c);
        },
        0x4A: function () {
            opp_func.ld_byte_byte(c,d);
        },
        0x4B: function () {
            opp_func.ld_byte_byte(c,e);
        },
        0x4C: function () {
            opp_func.ld_byte_byte(c,h);
        },
        0x4D: function () {
            opp_func.ld_byte_byte(c,l);
        },
        0x4E: function () {
            opp_func.ld_byte_mem(c,HL);
        },
        0x4F: function () {
            opp_func.ld_byte_byte(c,a);
        },
        
        0x50: function () {
            opp_func.ld_byte_byte(d,b);
        },
        
        0x51: function () {
            opp_func.ld_byte_byte(d,c);
        },
        0x52: function () {
            opp_func.ld_byte_byte(d,d);
        },
        0x53: function () {
            opp_func.ld_byte_byte(d,e);
        },
        0x54: function () {
            opp_func.ld_byte_byte(d,h);
        },
                        0x55: function () {
            opp_func.ld_byte_byte(d,l);
        },
                        0x56: function () {
            opp_func.ld_byte_mem(d,HL);
        },
                        0x57: function () {
            opp_func.ld_byte_byte(d,a);
        },
        
                        0x58: function () {
            opp_func.ld_byte_byte(e,b);
        },
                        0x59: function () {
            opp_func.ld_byte_byte(e,c);
        },
                        0x5A: function () {
            opp_func.ld_byte_byte(e,d);
        },
                        0x5B: function () {
            opp_func.ld_byte_byte(e,e);
        },
                        0x5C: function () {
            opp_func.ld_byte_byte(e,h);
        },
        
                                0x5D: function () {
            opp_func.ld_byte_byte(e,l);
        },
                0x5E: function () {
            opp_func.ld_byte_mem(e,HL);
        },
        0x5F: function () {
            opp_func.ld_byte_byte(e,a);
        },
        
        0x60: function () {
            opp_func.ld_byte_byte(h,b);
        },
        
        0x61: function () {
            opp_func.ld_byte_byte(h,c);
        },
        0x62: function () {
            opp_func.ld_byte_byte(h,d);
        },
        0x63: function () {
            opp_func.ld_byte_byte(h,e);
        },
        0x64: function () {
            opp_func.ld_byte_byte(h,h);
        },
                        0x65: function () {
            opp_func.ld_byte_byte(h,l);
        },
                        0x66: function () {
            opp_func.ld_byte_mem(h,HL);
        },
                        0x67: function () {
            opp_func.ld_byte_byte(h,a);
        },
        
                        0x68: function () {
            opp_func.ld_byte_byte(l,b);
        },
                        0x69: function () {
            opp_func.ld_byte_byte(l,c);
        },
                        0x6A: function () {
            opp_func.ld_byte_byte(l,d);
        },
                        0x6B: function () {
            opp_func.ld_byte_byte(l,e);
        },
                        0x6C: function () {
            opp_func.ld_byte_byte(l,h);
        },
        
                                0x6D: function () {
            opp_func.ld_byte_byte(l,l);
        },
                0x6E: function () {
            opp_func.ld_byte_mem(l,HL);
        },
        0x6F: function () {
            opp_func.ld_byte_byte(l,a);
        },
        
        0x70: function  () {
            opp_func.ld_mem_byte(HL,b);
        },
        0x71: function  () {
            opp_func.ld_mem_byte(HL,c);
        },
        
        0x72: function  () {
            opp_func.ld_mem_byte(HL,d);
        },
        0x73: function  () {
            opp_func.ld_mem_byte(HL,e);
        },
        
        0x74: function  () {
            opp_func.ld_mem_byte(HL,h);
        },
        
        0x75: function  () {
            opp_func.ld_mem_byte(HL,l);
        },
        
        0x76: function () {
            opp_func.halt();
        },
        
        0x77: function  () {
            opp_func.ld_mem_byte(HL,a);
        },
        
        0x78: function () {
            opp_func.ld_byte_byte(a,b);
        },
        0x79: function () {
            opp_func.ld_byte_byte(a,c);
        },
        0x7A: function () {
            opp_func.ld_byte_byte(a,d);
        },
        0x7B: function () {
            opp_func.ld_byte_byte(a,e);
        },
        0x7C: function () {
            opp_func.ld_byte_byte(a,h);
        },
        
        0x7D: function () {
            opp_func.ld_byte_byte(a,l);
        },
        0x7E: function () {
            opp_func.ld_byte_mem(a,HL);
        },
        0x7F: function () {
            opp_func.ld_byte_byte(a,a);
        },
        0x80: function () {
            opp_func.add(a,b);
        },
        0x81: function () {
            opp_func.add(a,c)
        },
        
                0x82: function () {
            opp_func.add(a,d);
        },
                0x83: function () {
            opp_func.add(a,e);
        },
                0x84: function () {
            opp_func.add(a,h);
        },
                0x85: function () {
            opp_func.add(a,l);
        },
        
        0x86: function () {
            opp_func.add_mem(a,new Address(HL.value()));
        },
        0x87: function () {
            opp_func.add(a,a);
        },
        0x88: function () {
            opp_func.adc(a,b);
        },
                0x89: function () {
            opp_func.adc(a,c);
        },
                0x8A: function () {
            opp_func.adc(a,d);
        },
                0x8B: function () {
            opp_func.adc(a,e);
        },
        
                0x8C: function () {
            opp_func.adc(a,h);
        },
        
                0x8D: function () {
            opp_func.adc(a,l);
        },
                0x8E: function () {
            opp_func.adc(a,memory.read(new Address(HL.value())));
        },
        
        0x8F: function () {
            opp_func.adc(a,a);
        },
        
        0x90: function () {
            opp_func.sub(b);
        },
        0x91: function () {
            opp_func.sub(c)
        },
                0x92: function () {
            opp_func.sub(d)
        },
                0x93: function () {
            opp_func.sub(e)
        },
                0x94: function () {
            opp_func.sub(h)
        },
                0x95: function () {
            opp_func.sub(l)
        },
        
                0x96: function () {
            opp_func.sub(memory.read(new Address(HL.value())));
        },
                    0x97: function () {
            opp_func.sub(a)
        },
        
      0x98: function () {
            opp_func.sbc(b);
        },
        0x99: function () {
            opp_func.sub(c)
        },
                0x9A: function () {
            opp_func.sbc(d)
        },
                0x9B: function () {
            opp_func.sbc(e)
        },
                0x9C: function () {
            opp_func.sbc(h)
        },
                0x9D: function () {
            opp_func.sbc(l)
        },
        
                0x9E: function () {
            opp_func.sbc(memory.read(new Address(HL.value())));
        },
                        0x9F: function () {
            opp_func.sbc(a)
        },
        
        
        0xA0: function () {
            opp_func.and(b);
        },
        0xA1: function () {
            opp_func.and(c)
        },
                0xA2: function () {
            opp_func.and(d)
        },
                0xA3: function () {
            opp_func.and(e)
        },
                0xA4: function () {
            opp_func.and(h)
        },
                0xA5: function () {
            opp_func.and(l)
        },
        
                0xA6: function () {
            opp_func.and(memory.read(new Address(HL.value())));
        },
                    0xA7: function () {
            opp_func.and(a)
        },
                0xA8: function () {
            opp_func.xor(b);
        },
        0xA9: function () {
            opp_func.xor(c)
        },
                0xAA: function () {
            opp_func.xor(d)
        },
                0xAB: function () {
            opp_func.xor(e)
        },
                0xAC: function () {
            opp_func.xor(h)
        },
                0xAD: function () {
            opp_func.xor(l)
        },
        
                0xAE: function () {
            opp_func.xor(memory.read(new Address(HL.value())));
        },
                    0xAF: function () {
            opp_func.xor(a)
        },
        
        
        0xB0: function () {
            opp_func.or(b);
        },
        0xB1: function () {
            opp_func.or(c)
        },
                0xB2: function () {
            opp_func.or(d)
        },
                0xB3: function () {
            opp_func.or(e)
        },
                0xB4: function () {
            opp_func.or(h)
        },
                0xB5: function () {
            opp_func.or(l)
        },
        
                0xB6: function () {
            opp_func.or(memory.read(new Address(HL.value())));
        },
                    0xB7: function () {
            opp_func.or(a)
        },
                0xB8: function () {
            opp_func.cp(b);
        },
        0xB9: function () {
            opp_func.cp(c)
        },
                0xBA: function () {
            opp_func.cp(d)
        },
                0xBB: function () {
            opp_func.cp(e)
        },
                0xBC: function () {
            opp_func.cp(h)
        },
                0xBD: function () {
            opp_func.cp(l)
        },
        
                0xBE: function () {
            opp_func.cp(memory.read(new Address(HL.value())));
        },
                    0xBF: function () {
            opp_func.cp(a)
        },
        
        0xC0: function () {
            opp_func.ret_conditional(GBEmu.conditional.nz);
        },
        
        0xC1: function () {
            opp_func.pop(BC);
        },
        0xC2: function (){
            opp_func.jp_condition(GBEmu.conditional.nz);
            
        },
        0xC3: function () {
            opp_func.jp(new Address(get_word_from_pc()));
        },
        0xC4: function (){
            opp_func.call_conditional(GBEmu.conditional.nz);
            
        },
        
        0xC5: function () {
            opp_func.push(BC);
        },
        
        0xC6: function () {
            opp_func.add(a,new ByteRegister(get_byte_from_pc()));
        },
        
        0xC7: function () {
            opp_func.rst(rst.rst1);
        },
        
        0xC8: function () {
            opp_func.ret_conditional(GBEmu.conditional.z);
        },
        0xC9: function () {
            opp_func.ret();
        },
        0xCA: function () {
            opp_func.jp_condition(GBEmu.conditional.z)
            
        },
        // 0xCB: function () {
            // this will never run
        // }
        
        0xCC: function () {
            opp_func.call_conditional(GBEmu.conditional.z);
        },
        0xCD: function () {
            opp_func.call();
        },
        0xCE: function () {
            opp_func.adc(a,new ByteRegister(get_byte_from_pc()));
        },
        0xCF: function () {
            opp_func.rst(rst.rst2);
        },
        
        0xD0: function () {
            opp_func.ret_conditional(GBEmu.conditional.nc);
        },
        0xD1: function () {
            opp_func.pop(DE);
        },
        0xD2: function () {
            opp_func.jp_condition(GBEmu.conditional.nc);
        },
        
        //0xD3: function () {
            // an unued process
        //}
        
        0xD4: function () {
            opp_func.call_conditional(GBEmu.conditional.nc);
        },
        
        0xD5: function () {
            opp_func.push(DE);
        },
        
        0xD6: function () {
            opp_func.sub(new ByteRegister(get_byte_from_pc()));
        },
        0xD7: function () {
            opp_func.rst(rst.rst3);
        },
        0xD8: function () {
            opp_func.ret_conditional(GBEmu.conditional.c);
        },
        0xD9: function () {
            opp_func.reti();
        },
        
        0xDA: function () {
            opp_func.jp_condition(GBEmu.conditional.c);
        },
        
        /*
        
        // empty oppcode
        0xDB: function () {
            
        }*/
        
        
        0xDC: function () {
            opp_func.call_conditional(GBEmu.conditional.c);
        },
        /*
        // empty oppcode
        0xDD: function () {
        0xDD: function () {
            
        }
        */
        
        0xDE: function () {
          opp_func.sbc(new ByteRegister(get_byte_from_pc()));
        
        },
        0xDF: function () {
            opp_func.rst(rst.rst4);
        },
        0xE0: function () {
            opp_func.ldh_mem_byte(new Address(get_byte_from_pc()),a);
        },
        
        0xE1: function () {
            opp_func.pop(HL);
        },
        0xE2: function () {
            opp_func.ldh_mem_byte(new Address(c.value()),a);
        },
        
        /*
        // ignored oppcodes
        0xE3: function () {
            
        },
        0xE4: function () {
            
        }
        */
        
        0xE5: function () {
            opp_func.push(HL);
        },
        0xE6: function () {
            opp_func.and(new ByteRegister(get_byte_from_pc()));
        },
        0xE7: function () {
            opp_func.rst(rst.rst5);
        },
        0xE8: function () {
            opp_func.add_sp();
        },
        
        0xE9: function () {
            opp_func.jp(memory.read(new Address(HL.value())));
        },
        0xEA: function () {
            opp_func.ld_mem_byte(new Address(get_word_from_pc()),a);
        },
        0xEB: function () {
         /* undefined */
        },
                0xEC: function () {
         /* undefined */
        },
                0xED: function () {
         /* undefined */
        },
                0xEE: function () {
            opp_func.xor(new ByteRegister(get_byte_from_pc()));
        },
        0xEF: function () {
            opp_func.rst(rst.rst6);
        },
        0xF0: function () {
            
            opp_func.ldh_byte_mem(a,new Address(get_byte_from_pc()));
        },
        
        0xF1: function () {
            opp_func.pop(AF);
        },
        0xF2: function () {
            opp_func.ldh_byte_mem(a,new Address(c.value()));
        },
        0xF3: function () {
            opp_func.di();
        },
        
        0xF4: function () {
            /* undefined */
        },
        0xF5: function () {
            opp_func.push(AF);
        },
        0xF6: function () {
            opp_func.or(new ByteRegister(get_byte_from_pc()));
        },
        0xF7: function () {
            opp_func.rst(rst.rst7);
        },
        0xF8: function () {
            opp_func.ld_hl_sp();
        },
        0xF9:function () {
            opp_func.ld_word_word(SP,HL);
        },
        0xFA: function () {
            opp_func.ld_byte_mem(a,new Address(get_word_from_pc()))
        },
        
        0xFB: function () {
            opp_func.ei();
        },
        
        0xFC: function () {
            /* undefined */
        },
        
        0xFD: function () {
            /* undefined */
        },
        
        0xFE: function () {
            opp_func.cp(new ByteRegister(get_byte_from_pc()));
        },
        0xFF: function () {
            opp_func.rst(rst.rst8);
        }

    }
    
    this.opcode_cb = {
        
        0x00: function () {
            opp_func.rlc(b)
        },
        0x1: function () {
            opp_func.rlc(c)
        },
        0x02: function () {
            opp_func.rlc(d)
        },
        0x03: function () {
            opp_func.rlc(e)
        },
        0x04: function () {
            opp_func.rlc(h)
        },
        
        0x05: function (){
            opp_func.rlc(l);
        },
        
        0x06: function () {
            opp_func.rlc_mem(new Address(HL.value()));
        },
        
        0x07: function (){
            opp_func.rlc(a);
            
        },
        
        0x08: function () {
            opp_func.rrc(b)
        },
        0x9: function () {
            opp_func.rrc(c)
        },
        0xA: function () {
            opp_func.rrc(d)
        },
        0xB: function () {
            opp_func.rrc(e)
        },
        0xC: function () {
            opp_func.rrc(h)
        },
        
        0xD: function (){
            opp_func.rrc(l);
        },
        
        0xE: function () {
            opp_func.rrc_mem(new Address(HL.value()));
        },
        
        0xF: function (){
            opp_func.rrc(a);
        },
        0x10: function () {
            opp_func.rl(b)
        },
        0x11: function () {
            opp_func.rl(c)
        },
        0x12: function () {
            opp_func.rl(d)
        },
        0x13: function () {
            opp_func.rl(e)
        },
        0x14: function () {
            opp_func.rl(h)
        },
        
        0x15: function (){
            opp_func.rl(l);
        },
        
        0x16: function () {
            opp_func.rl_mem(new Address(HL.value()));
        },
        
        0x17: function (){
            opp_func.rl(a);
        },
        
                0x18: function () {
            opp_func.rr(b)
        },
        0x19: function () {
            opp_func.rr(c)
        },
        0x1A: function () {
            opp_func.rr(d)
        },
        0x1B: function () {
            opp_func.rr(e)
        },
        0x1C: function () {
            opp_func.rr(h)
        },
        
        0x1D: function (){
            opp_func.rr(l);
        },
        
        0x1E: function () {
            opp_func.rr_mem(new Address(HL.value()));
        },
        
        0x1F: function (){
            opp_func.rr(a);
        },

        
        0x20: function () {
            opp_func.sla(b)
        },
        0x21: function () {
            opp_func.sla(c)
        },
        0x22: function () {
            opp_func.sla(d)
        },
        0x23: function () {
            opp_func.sla(e)
        },
        0x24: function () {
            opp_func.sla(h)
        },
        
        0x25: function (){
            opp_func.sla(l);
        },
        
        0x26: function () {
            opp_func.sla_mem(new Address(HL.value()));
        },
        
        0x27: function (){
            opp_func.sla(a);
        },
        
        0x28: function () {
            opp_func.sra(b)
        },
        0x29: function () {
            opp_func.sra(c)
        },
        0x2A: function () {
            opp_func.sra(d)
        },
        0x2B: function () {
            opp_func.sra(e)
        },
        0x2C: function () {
            opp_func.sra(h)
        },
        
        0x2D: function (){
            opp_func.sra(l);
        },
        
        0x2E: function () {
            opp_func.sra_mem(new Address(HL.value()));
        },
        
        0x2F: function (){
            opp_func.sra(a);
        },
        
        0x30: function () {
            opp_func.swap(b);
        },
        
        0x31: function () {
            opp_func.swap(c)
        },
        0x32: function () {
            opp_func.swap(d)
        },
        0x33: function () {
            opp_func.swap(e)
        },
        0x34: function () {
            opp_func.swap(h)
        },
        
        0x35: function (){
            opp_func.swap(l);
        },
        
        0x36: function () {
            opp_func.swap_mem(new Address(HL.value()));
        },
        
        0x37: function (){
            opp_func.swap(a);
        },
        
                0x38: function () {
            opp_func.srl(b)
        },
        0x39: function () {
            opp_func.srl(c)
        },
        0x3A: function () {
            opp_func.srl(d)
        },
        0x3B: function () {
            opp_func.srl(e)
        },
        0x3C: function () {
            opp_func.srl(h)
        },
        
        0x3D: function (){
            opp_func.srl(l);
        },
        
        0x3E: function () {
            opp_func.srl_mem(new Address(HL.value()));
        },
        
        0x3F: function (){
            opp_func.srl(a);
        },
        
        0x40: function () {
            opp_func.bit(0,b);
        },
        
        0x41: function () {
            opp_func.bit(0,c);
        },
        
                0x42: function () {
            opp_func.bit(0,d);
        },
        
                0x43: function () {
            opp_func.bit(0,e);
        },
        
                0x44: function () {
            opp_func.bit(0,h);
        },
        
                0x45: function () {
            opp_func.bit(0,l);
        },
        
                0x46: function () {
            opp_func.bit_mem(0,HL);
        },
                0x47: function () {
            opp_func.bit(0,a);
        },
        
        
                
        0x48: function () {
            opp_func.bit(1,b);
        },
        
        0x49: function () {
            opp_func.bit(1,c);
        },
        
                0x4A: function () {
            opp_func.bit(1,d);
        },
        
                0x4B: function () {
            opp_func.bit(1,e);
        },
        
                0x4C: function () {
            opp_func.bit(1,h);
        },
        
                0x4D: function () {
            opp_func.bit(1,l);
        },
        
                0x4E: function () {
            opp_func.bit_mem(1,HL);
        },
                0x4F: function () {
            opp_func.bit(1,a);
        },
        
                
        0x50: function () {
            opp_func.bit(2,b);
        },
        
        0x51: function () {
            opp_func.bit(2,c);
        },
        
                0x52: function () {
            opp_func.bit(2,d);
        },
        
                0x53: function () {
            opp_func.bit(2,e);
        },
        
                0x54: function () {
            opp_func.bit(2,h);
        },
        
                0x55: function () {
            opp_func.bit(2,l);
        },
        
                0x56: function () {
            opp_func.bit_mem(2,HL);
        },
                0x57: function () {
            opp_func.bit(2,a);
        },
        
        
                
        0x58: function () {
            opp_func.bit(3,b);
        },
        
        0x59: function () {
            opp_func.bit(3,c);
        },
        
                0x5A: function () {
            opp_func.bit(3,d);
        },
        
                0x5B: function () {
            opp_func.bit(3,e);
        },
        
                0x5C: function () {
            opp_func.bit(3,h);
        },
        
                0x5D: function () {
            opp_func.bit(3,l);
        },
        
                0x5E: function () {
            opp_func.bit_mem(3,HL);
        },
                0x5F: function () {
            opp_func.bit(3,a);
        },
        
                
        0x60: function () {
            opp_func.bit(4,b);
        },
        
        0x61: function () {
            opp_func.bit(4,c);
        },
        
                0x62: function () {
            opp_func.bit(4,d);
        },
        
                0x63: function () {
            opp_func.bit(4,e);
        },
        
                0x64: function () {
            opp_func.bit(4,h);
        },
        
                0x65: function () {
            opp_func.bit(4,l);
        },
        
                0x66: function () {
            opp_func.bit_mem(4,HL);
        },
                0x67: function () {
            opp_func.bit(4,a);
        },
        
        
                
        0x68: function () {
            opp_func.bit(5,b);
        },
        
        0x69: function () {
            opp_func.bit(5,c);
        },
        
                0x6A: function () {
            opp_func.bit(5,d);
        },
        
                0x6B: function () {
            opp_func.bit(5,e);
        },
        
                0x6C: function () {
            opp_func.bit(5,h);
        },
        
                0x6D: function () {
            opp_func.bit(5,l);
        },
        
                0x6E: function () {
            opp_func.bit_mem(5,HL);
        },
                0x6F: function () {
            opp_func.bit(5,a);
        },
        
        
                
        0x70: function () {
            opp_func.bit(6,b);
        },
        
        0x71: function () {
            opp_func.bit(6,c);
        },
        
                0x72: function () {
            opp_func.bit(6,d);
        },
        
                0x73: function () {
            opp_func.bit(6,e);
        },
        
                0x74: function () {
            opp_func.bit(6,h);
        },
        
                0x75: function () {
            opp_func.bit(6,l);
        },
        
                0x76: function () {
            opp_func.bit_mem(6,HL);
        },
                0x77: function () {
            opp_func.bit(6,a);
        },
        
        
                
        0x78: function () {
            opp_func.bit(7,b);
        },
        
        0x79: function () {
            opp_func.bit(7,c);
        },
        
                0x7A: function () {
            opp_func.bit(7,d);
        },
        
                0x7B: function () {
            opp_func.bit(7,e);
        },
        
                0x7C: function () {
            opp_func.bit(7,h);
        },
        
                0x7D: function () {
            opp_func.bit(7,l);
        },
        
                0x7E: function () {
            opp_func.bit_mem(7,HL);
        },
                0x7F: function () {
            opp_func.bit(7,a);
        },
        
        
                
                
        0x80: function () {
            opp_func.res(0,b);
        },
        
        0x81: function () {
            opp_func.res(0,c);
        },
        
                0x82: function () {
            opp_func.res(0,d);
        },
        
                0x83: function () {
            opp_func.res(0,e);
        },
        
                0x84: function () {
            opp_func.res(0,h);
        },
        
                0x85: function () {
            opp_func.res(0,l);
        },
        
                0x86: function () {
            opp_func.res_mem(0,HL);
        },
                0x87: function () {
            opp_func.res(0,a);
        },
        
        
                
        0x88: function () {
            opp_func.res(1,b);
        },
        
        0x89: function () {
            opp_func.res(1,c);
        },
        
                0x8A: function () {
            opp_func.res(1,d);
        },
        
                0x8B: function () {
            opp_func.res(1,e);
        },
        
                0x8C: function () {
            opp_func.res(1,h);
        },
        
                0x8D: function () {
            opp_func.res(1,l);
        },
        
                0x8E: function () {
            opp_func.res_mem(1,HL);
        },
                0x8F: function () {
            opp_func.res(1,a);
        },
        
                0x90: function () {
            opp_func.res(2,b);
        },
        
        0x91: function () {
            opp_func.res(2,c);
        },
        
                0x92: function () {
            opp_func.res(2,d);
        },
        
                0x93: function () {
            opp_func.res(2,e);
        },
        
                0x94: function () {
            opp_func.res(2,h);
        },
        
                0x95: function () {
            opp_func.res(2,l);
        },
        
                0x96: function () {
            opp_func.res_mem(2,HL);
        },
                0x97: function () {
            opp_func.res(2,a);
        },
        
        
                
        0x98: function () {
            opp_func.res(3,b);
        },
        
        0x99: function () {
            opp_func.res(3,c);
        },
        
                0x9A: function () {
            opp_func.res(3,d);
        },
        
                0x9B: function () {
            opp_func.res(3,e);
        },
        
                0x9C: function () {
            opp_func.res(3,h);
        },
        
                0x9D: function () {
            opp_func.res(3,l);
        },
        
                0x9E: function () {
            opp_func.res_mem(3,HL);
        },
                0x9F: function () {
            opp_func.res(3,a);
        },
        
        
                        0xA0: function () {
            opp_func.res(4,b);
        },
        
        0xA1: function () {
            opp_func.res(4,c);
        },
        
                0xA2: function () {
            opp_func.res(4,d);
        },
        
                0xA3: function () {
            opp_func.res(4,e);
        },
        
                0xA4: function () {
            opp_func.res(4,h);
        },
        
                0xA5: function () {
            opp_func.res(4,l);
        },
        
                0xA6: function () {
            opp_func.res_mem(4,HL);
        },
                0xA7: function () {
            opp_func.res(4,a);
        },
        
        
                
        0xA8: function () {
            opp_func.res(5,b);
        },
        
        0xA9: function () {
            opp_func.res(5,c);
        },
        
                0xAA: function () {
            opp_func.res(5,d);
        },
        
                0xAB: function () {
            opp_func.res(5,e);
        },
        
                0xAC: function () {
            opp_func.res(5,h);
        },
        
                0xAD: function () {
            opp_func.res(5,l);
        },
        
                0xAE: function () {
            opp_func.res_mem(5,HL);
        },
                0xAF: function () {
            opp_func.res(5,a);
        },
        
        
                        0xB0: function () {
            opp_func.res(6,b);
        },
        
        0xB1: function () {
            opp_func.res(6,c);
        },
        
                0xB2: function () {
            opp_func.res(6,d);
        },
        
                0xB3: function () {
            opp_func.res(6,e);
        },
        
                0xB4: function () {
            opp_func.res(6,h);
        },
        
                0xB5: function () {
            opp_func.res(6,l);
        },
        
                0xB6: function () {
            opp_func.res_mem(6,HL);
        },
                0xB7: function () {
            opp_func.res(6,a);
        },
        
        
                
        0xB8: function () {
            opp_func.res(7,b);
        },
        
        0xB9: function () {
            opp_func.res(7,c);
        },
        
                0xBA: function () {
            opp_func.res(7,d);
        },
        
                0xBB: function () {
            opp_func.res(7,e);
        },
        
                0xBC: function () {
            opp_func.res(7,h);
        },
        
                0xBD: function () {
            opp_func.res(7,l);
        },
        
                0xBE: function () {
            opp_func.res_mem(7,HL);
        },
                0xBF: function () {
            opp_func.res(7,a);
        },
        
        
                        
        0xC0: function () {
            opp_func.set(0,b);
        },
        
        0xC1: function () {
            opp_func.set(0,c);
        },
        
                0xC2: function () {
            opp_func.set(0,d);
        },
        
                0xC3: function () {
            opp_func.set(0,e);
        },
        
                0xC4: function () {
            opp_func.set(0,h);
        },
        
                0xC5: function () {
            opp_func.set(0,l);
        },
        
                0xC6: function () {
            opp_func.set_mem(0,HL);
        },
                0xC7: function () {
            opp_func.set(0,a);
        },
        
        
                
        0xC8: function () {
            opp_func.set(1,b);
        },
        
        0xC9: function () {
            opp_func.set(1,c);
        },
        
                0xCA: function () {
            opp_func.set(1,d);
        },
        
                0xCB: function () {
            opp_func.set(1,e);
        },
        
                0xCC: function () {
            opp_func.set(1,h);
        },
        
                0xCD: function () {
            opp_func.set(1,l);
        },
        
                0xCE: function () {
            opp_func.set_mem(1,HL);
        },
                0xCF: function () {
            opp_func.set(1,a);
        },
        
                0xD0: function () {
            opp_func.set(2,b);
        },
        
        0xD1: function () {
            opp_func.set(2,c);
        },
        
                0xD2: function () {
            opp_func.set(2,d);
        },
        
                0xD3: function () {
            opp_func.set(2,e);
        },
        
                0xD4: function () {
            opp_func.set(2,h);
        },
        
                0xD5: function () {
            opp_func.set(2,l);
        },
        
                0xD6: function () {
            opp_func.set_mem(2,HL);
        },
                0xD7: function () {
            opp_func.set(2,a);
        },
        
        
                
        0xD8: function () {
            opp_func.set(3,b);
        },
        
        0xD9: function () {
            opp_func.set(3,c);
        },
        
                0xDA: function () {
            opp_func.set(3,d);
        },
        
                0xDB: function () {
            opp_func.set(3,e);
        },
        
                0xDC: function () {
            opp_func.set(3,h);
        },
        
                0xDD: function () {
            opp_func.set(3,l);
        },
        
                0xDE: function () {
            opp_func.set_mem(3,HL);
        },
                0xDF: function () {
            opp_func.set(3,a);
        },
        
        
                        0xE0: function () {
            opp_func.set(4,b);
        },
        
        0xE1: function () {
            opp_func.set(4,c);
        },
        
                0xE2: function () {
            opp_func.set(4,d);
        },
        
                0xE3: function () {
            opp_func.set(4,e);
        },
        
                0xE4: function () {
            opp_func.set(4,h);
        },
        
                0xE5: function () {
            opp_func.set(4,l);
        },
        
                0xE6: function () {
            opp_func.set_mem(4,HL);
        },
                0xE7: function () {
            opp_func.set(4,a);
        },
        
        
                
        0xE8: function () {
            opp_func.set(5,b);
        },
        
        0xE9: function () {
            opp_func.set(5,c);
        },
        
                0xEA: function () {
            opp_func.set(5,d);
        },
        
                0xEB: function () {
            opp_func.set(5,e);
        },
        
                0xEC: function () {
            opp_func.set(5,h);
        },
        
                0xED: function () {
            opp_func.set(5,l);
        },
        
                0xEE: function () {
            opp_func.set_mem(5,HL);
        },
                0xEF: function () {
            opp_func.set(5,a);
        },
        
        
                        0xF0: function () {
            opp_func.set(6,b);
        },
        
        0xF1: function () {
            opp_func.set(6,c);
        },
        
                0xF2: function () {
            opp_func.set(6,d);
        },
        
                0xF3: function () {
            opp_func.set(6,e);
        },
        
                0xF4: function () {
            opp_func.set(6,h);
        },
        
                0xF5: function () {
            opp_func.set(6,l);
        },
        
                0xF6: function () {
            opp_func.set_mem(6,HL);
        },
                0xF7: function () {
            opp_func.set(6,a);
        },
        
        
                
        0xF8: function () {
            opp_func.set(7,b);
        },
        
        0xF9: function () {
            opp_func.set(7,c);
        },
        
                0xFA: function () {
            opp_func.set(7,d);
        },
        
                0xFB: function () {
            opp_func.set(7,e);
        },
        
                0xFC: function () {
            opp_func.set(7,h);
        },
        
                0xFD: function () {
            opp_func.set(7,l);
        },
        
                0xFE: function () {
            opp_func.set_mem(7,HL);
        },
                0xFF: function () {
            opp_func.set(7,a);
        },
    }
    
    
    
    constructor();
    return this;
}
