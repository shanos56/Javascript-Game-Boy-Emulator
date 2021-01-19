/* file reader */
/* global window */

document.querySelector('input').addEventListener('change', function() {

  var reader = new FileReader();
  reader.onload = function() {

    var arrayBuffer = this.result,
      array = new Uint8Array(arrayBuffer);
      // todo make sure file is rom file
      // send array to cartridge ...... todo

  }
  reader.readAsArrayBuffer(this.files[0]);

}, false);