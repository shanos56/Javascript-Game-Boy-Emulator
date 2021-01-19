/* global window */
/* global GBEmu */

GBEmu.input = function () {

    var A = false;
    var B = false;

    var select = false;
    var start = false;
    
    var up = false;
    var down = false;
    var right = false;
    var left = false;
    
    var direction_switch = false;
    var buttion_switch = false;
    
    
    this.write = function(byte) {
        
        direction_switch = !bitwise.check_bit(4,byte);
        button_switch = !bitwise.check_bit(5,byte);
    }

    this.button_pressed = function(button) {
        set_button(button, true);
 
    }
    
    this.get_input = function() {
        
        var set_bit_to = bitwise.set_bit_to;
        
        // when a bit is set to 0 it means the button is pressed
        var buttons = 0b111111;
        
        if (direction_switch) {
            buttons = set_bit_to(buttons, 0, !right);
            buttons = set_bit_to(buttons, 1, !left);
            buttons = set_bit_to(buttons, 2, !up);
            buttons = set_bit_to(buttons, 3, !down);
        } else if (button_switch) {
            buttons = set_bit_to(buttons, 0, !A);
            buttons = set_bit_to(buttons, 1, !B);
            buttons = set_bit_to(buttons, 2, !select);
            buttons = set_bit_to(buttons, 3, !start);
        }
        
        buttons = set_bit_to(buttons, 4, !direction_switch);
        buttons = set_bit_to(buttons, 5, !button_switch);
        
        return buttons;
        
    }
    this.button_released = function (button) {
        set_button(button, false);
    }
    
    
    var set_button = function(button,value) {
        
        switch(button) {
            case 0:
                up = value;
                break;
            case 1:
                down = value;
                break;
            case 2:
                right = value;
                break;
            case 3:
                left = value;
                break;
            case 4:
                A = value;
                break;
            case 5:
                B = value;
                break;
            case 6:
                select = value;
                break;
            case 7:
                start = value;
                break;
                
            default:
                window.console.log("Unknown button '%s' pressed.", button);
                break;
                
        }
    }



}