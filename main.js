(function() {
	var glCtx = WebGL.getContext('main');
	glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);
	glCtx.enable(glCtx.BLEND);

	var textures = LoadImage('textures.png', function() {

		var textureCoords = {
			inconsolata: { x: 0, y: 0, w: 384, h: 78, img: textures }
		};

		var ui = new TexturedLayer(glCtx, textures);
		var uiFont = ui.font().addCharacters(32, 127, 32, 3,
			textureCoords.inconsolata);

		var initialState = {
			vp: new Viewport(glCtx, [0, 0], 16*9),
			ui: ui, uiFont: uiFont
		};
		var game = new GameMode(initialState, glCtx.canvas, 1/100);

		game.draw = function(state) {
			WebGL.clear(glCtx, [0.5, 0.5, 0.3, 1]);
			if(!state.title) {
				state.title = state.uiFont.drawText([100, 100], [1, 0],
					"Some Text Here");
			} else {
				for(var i=0; i<state.title.length; ++i) state.title[i].draw();
			}
			ui.draw(state.vp.pixelMatrix());
		}

		game.fixedStep = function(state, ds) { return state; }

		game.go();
	});
})();