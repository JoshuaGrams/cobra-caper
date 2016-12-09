var GameMode = (function() {
	'use strict';

	// TODO - proper key filtering with defaults

	/*
	 * User-defined methods:
	 * 	draw(state) ->
	 * 	step(state, secondsThisFrame, totalElapsedSeconds) -> state'
	 * 	fixedStep(state, secondsPerFixedFrame) -> state'
	 * 	key(state, keyString) -> state'
	 * 	mouse(state, x, y, type) -> state'
	 * 	stop(state) -> flag  (should we stop?)
	 */


	function GameMode(state, element, fixedStepSeconds) {
		this.state = state;
		this.element = element;
		this.dsFixed = fixedStepSeconds || 1/60;

		this.s0 = null;
		this.tickHandler = GameMode.prototype.step.bind(this);

		this.draw = GameMode.noop;
		this.fixedStep = GameMode.noop;
		this.step = GameMode.noop;
		this.key = GameMode.noop;
		this.mouse = GameMode.noop;
		this.stop = GameMode.noop;
	}
	GameMode.noop = function() {};

	GameMode.prototype.go = function() {
		this.element.focus();
		this.bindListeners();
		if(this.step === GameMode.noop && this.fixedStep === GameMode.noop) {
			this.draw(this.state);
		} else window.requestAnimationFrame(this.tickHandler);
	}

	GameMode.arrowKeys = {
		w: true, a: true, s: true, d: true,
		z: true, q: true,
		',': true,        o: true, e: true,
		ArrowUp: true, ArrowLeft: true, ArrowDown: true, ArrowRight: true
	};
	GameMode.prototype.arrows = function() {
		var keys = this.keyPressed;
		//           QWERTY   ||  AZERTY   ||  DVORAK
		var up    = keys['w'] || keys['z'] || keys[','] || keys['ArrowUp']    || false;
		var left  = keys['a'] || keys['q'] ||    /* a */   keys['ArrowLeft']  || false;
		var down  = keys['s'] ||    /* s */   keys['o'] || keys['ArrowDown']  || false;
		var right = keys['d'] ||    /* d */   keys['e'] || keys['ArrowRight'] || false;
		var v = [right - left, up - down];
		var len = V.length(v);
		return (len > 1) ? V.x(v, 1/len) : v;
	}

	GameMode.prototype.bindListeners = function() {
		this.keyPressed = {};
		if(!this.keyListener) this.keyListener = GameMode.prototype.key.bind(this);
		this.element.addEventListener('keydown', this.keyListener);
		this.element.addEventListener('keyup', this.keyListener);

		this.buttonPressed = {};
		if(!this.mouseListener) this.mouseListener = GameMode.prototype.mouse.bind(this);
		this.element.addEventListener('mousedown', this.mouseListener);
		this.element.addEventListener('mouseup', this.mouseListener);
		this.element.addEventListener('mousemove', this.mouseListener);
		this.element.addEventListener('mouseenter', this.mouseListener);
		this.element.addEventListener('mouseleave', this.mouseListener);
	}

	GameMode.prototype.unbindListeners = function() {
		this.element.removeEventListener('keydown', this.keyListener);
		this.element.removeEventListener('keyup', this.keyListener);
		this.keyPressed = {};

		this.element.removeEventListener('mousedown', this.mouseListener);
		this.element.removeEventListener('mouseup', this.mouseListener);
		this.element.removeEventListener('mousemove', this.mouseListener);
		this.element.removeEventListener('mouseenter', this.mouseListener);
		this.element.removeEventListener('mouseleave', this.mouseListener);
		this.buttonPressed = {};
	}

	// takes current time in milliseconds.
	GameMode.prototype.step = function(ms) {
		var s = ms/1000;
		if(!this.s0) {
			this.s0 = s;
			this.s = 0;  this.unsimulated = 0;
		}
		s -= this.s0;
		var ds = Math.min(s - this.s, 0.1);
	  	this.s = s;

		this.unsimulated += ds;
		while(this.unsimulated >= this.dsFixed) {
			this.unsimulated -= this.dsFixed;
			var state = this.fixedStep(this.state, this.dsFixed);
			if(typeof(state) !== 'undefined') this.state = state;
		}

		var state = this.step(this.state, ds, s);
		if(typeof(state) !== 'undefined') this.state = state;

		if(this.stop(this.state)) this.unbindListeners();
		else {
			this.draw(this.state);
			window.requestAnimationFrame(this.tickHandler);
		}
	}

	GameMode.prototype.key = function(evt) {
		var k = keyboardEventKey(evt);
		// call user function only on key "press",
		// this.keyPressed gives "is down" info.
		if(evt.type === 'keydown') {
			this.keyPressed[k.key] = 1;
			// allow keyboard shortcuts through
			if(!(evt.altKey || evt.ctrlKey || evt.metaKey
						|| k === "Tab" || k === 'F11' || k === 'F12')) {
							var state = this.key(this.state, k);
							if(typeof(state) !== 'undefined') {
								this.state = state;
								evt.preventDefault();
							}
						}
		} else delete(this.keyPressed[k.key]);
	}

	GameMode.prototype.mouse = function(evt) {
		var rect = this.element.getBoundingClientRect()
			var x = evt.clientX - rect.left
			var y = evt.clientY - rect.top
			var b = mouseButton(evt.button)
			var type = 'move', pass = true
			switch(evt.type) {
				case 'mousedown':
					type = 'press ' + b;
					this.buttonPressed[b] = true; break
				case 'mouseup':
						type = 'release ' + b;
						delete(this.buttonPressed[b]);
						break
				case 'mouseenter': type = 'enter'; break
				case 'mouseleave': type = 'leave'; break
			}

		var state = this.mouse(this.state, x, y, type)
			if(typeof(state) !== 'undefined') {
				this.state = state;
				evt.preventDefault();
			}
	}


	// -------------------------------------------------------------------
	// keyboardEvent and mouseEvent conversion

	// for browsers which don't support `key` yet
	var keyCodeKeys = {
		8:'Backspace', 9:'Tab', 12:'5', 13:'Enter', 16:'Shift',
		17:'Control', 18:'Alt', 20:'CapsLock', 27:'Escape', 32:' ',
		33:'PageUp', 34:'PageDown', 35:'End', 36:'Home',
		37:'ArrowLeft', 38:'ArrowUp', 39:'ArrowRight', 40:'ArrowDown',
		44:'PrintScreen', 45:'Insert', 46:'Delete',
		49:['1','!'], 50:['2','@'], 51:['3','#'], 52:['4','$'],
		53:['5','%'], 54:['6','^'], 55:['7','&'], 56:['8','*'],
		57:['9','('], 58:['0',')'], 59:[';',':'], 61:['=','+'],
		65:['a','A'], 66:['b','B'], 67:['c','C'], 68:['d','D'],
		69:['e','E'], 70:['f','F'], 71:['g','G'], 72:['h','H'],
		73:['i','I'], 74:['j','J'], 75:['k','K'], 76:['l','L'],
		77:['m','M'], 78:['n','N'], 79:['o','O'], 80:['p','P'],
		81:['q','Q'], 82:['r','R'], 83:['s','S'], 84:['t','T'],
		85:['u','U'], 86:['v','V'], 87:['w','W'], 88:['x','X'],
		89:['y','Y'], 90:['z','Z'],
		91:'OS', 92:'OS', 93:'ContextMenu',
		96:'0', 97:'1', 98:'2', 99:'3', 100:'4', 101:'5',
		102:'6', 103:'7', 104:'8', 105:'9', 106:'*', 107:'+',
		109:'-', 110:'.', 111:'/',
		112:'F1', 113:'F2', 114:'F3', 115:'F4', 116:'F5', 117:'F6',
		118:'F7', 119:'F8', 120:'F9', 121:'F10', 122:'F11', 123:'F12',
		144:'NumLock', 173:['-','_'],
		186:[';',':'], 187:['=','+'], 188:[',','<'], 189:['-','_'],
		190:['.','>'], 191:['/','?'], 192:['`','~'],
		219:['[','{'], 220:['\\','|'], 221:[']','}'], 222:['\'','"'],
		224:'OS'
	};

	// and of course Microsoft has to be different
	var keyKeys = {
		Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown',
		Win: 'OS', Del: 'Delete', Esc: 'Escape'
	};

	var unshift = {
		'!': '1',  '@': '2',  '#': '3',  '$': '4',  '%': '5',
		'^': '6',  '&': '7',  '*': '8',  '(': '9',  ')': '0',
		':': ';',  '+': '=',  '{': '[',  '}': ']', '|': '\\',
		'"': "'",  '_': '-',  '<': ',',  '?': '/',  '~': '`',
		'A': 'a',  'B': 'b',  'C': 'c',  'D': 'd',  'E': 'e',
		'F': 'f',  'G': 'g',  'H': 'h',  'I': 'i',  'J': 'j',
		'K': 'k',  'L': 'l',  'M': 'm',  'N': 'n',  'O': 'o',
		'P': 'p',  'Q': 'q',  'R': 'r',  'S': 's',  'T': 't',
		'U': 'u',  'V': 'v',  'W': 'w',  'X': 'x',  'Y': 'y',
		'Z': 'z'
	};

	// Take a key event and try to return a String object whose
	// value is the full key press (e.g. "#" or "Ctrl-Shift-3"),
	// with a "key" property which tries to give a unique string
	// for this single key (e.g. "Numpad3" or "LeftControl") to
	// be used for tracking which keys are currently pressed.
	function keyboardEventKey(evt) {
		var canonical;
		var k = 'Unidentified';
		if(evt.key) {
			if(keyKeys.hasOwnProperty(evt.key)) k = keyKeys[evt.key];
			else k = evt.key;
			if(unshift.hasOwnProperty(k)) canonical = unshift[k];
		} else if(keyCodeKeys.hasOwnProperty(evt.keyCode)) {
			k = keyCodeKeys[evt.keyCode];
			if(k instanceof Array) {
				canonical = k[0].toUpperCase();
				k = k[evt.shiftKey+0];
			}
		}
		if(k === 'Unidentified' && console && console.log) {
			console.log('Unidentified keyCode', evt.keyCode);
		}

		var mod = '';
		if(evt.ctrlKey && k !== 'Control') mod += 'Control-';
		if(evt.altKey && k !== 'Alt') mod += 'Alt-';
		if(evt.shiftKey && k !== 'Shift' && (mod || !canonical)) {
			// Only if we have other modifiers or no shifted version.
			mod += 'Shift-';
			k = canonical || k;
		}

		var press = new String(mod+k);
		press.key = canonical || k;
		if(evt.location) switch(evt.location) {  // already know it's not zero
			case 1: press.location = 'Left'; break;
			case 2: press.location = 'Right'; break;
			case 3: press.location = 'Numpad'; break;
			default: press.location = '???'; break;  // shouldn't happen
		}
		if(press.location) press.key = press.location + press.key;
		return press;
	}

	function mouseButton(button) {
		switch(button) {
			case -1: return 'no button';
			case 0: return 'left button';
			case 2: return 'right button';
			case 1: return 'middle button';
			default: return 'button ' + button;
		}
	}


	return GameMode;
})();
