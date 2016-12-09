(function() {
	var glCtx = WebGL.getContext('main');

	var initialState = {};
	var game = new GameMode(initialState, glCtx.canvas, 1/100);

	game.draw = function(state) {
		WebGL.clear(glCtx, [0.03, 0.03, 0.1, 1]);
	}

	game.go();
})();
