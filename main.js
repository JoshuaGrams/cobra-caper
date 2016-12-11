(function() {
	var glCtx = WebGL.getContext('main');
	glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);
	glCtx.enable(glCtx.BLEND);

	var textures = LoadImage('textures.png', function() {

		var textureCoords = {
			inconsolata: { x: 0, y: 0, w: 384, h: 78, img: textures },
			head: { x: 0, y: 78, w: 64, h: 48, img: textures },
			body: { x: 66, y: 78, w: 48, h: 48, img: textures }
		};

		var ui = new TexturedLayer(glCtx, textures);
		var uiFont = ui.font().addCharacters(32, 127, 32, 3,
			textureCoords.inconsolata);
		var title = new TexturedMesh().text(uiFont, "The Cobra Caper");

		var camera = new TexturedLayer(glCtx, ui.img);
		var head = new TexturedMesh().rectangle(0.24, 0.18, textureCoords.head)
		var body = new TexturedMesh().rectangle(0.18, 0.18, textureCoords.head);

		// ------------------------------------------------------------

		var initialState = {
			vp: new Viewport(glCtx, [0, 0], 16*9),
			ui: ui, uiFont: uiFont,
			title: new MeshInstance(ui, title),
			player: new Player(camera, head, body, 0.09, 7.5, 0.008),
			walls: [
				{ start: [8, -4.5], end: [8, 4.5] },
				{ start: [-8, -4.5], end: [-8, 4.5] },
				{ start: [-8, 4.5], end: [8, 4.5] },
				{ start: [-8, -4.5], end: [8, -4.5] }
			]
		};

		var game = new GameMode(initialState, glCtx.canvas, 1/100);

		game.draw = function(state) {
			WebGL.clear(glCtx, [0.5, 0.5, 0.3, 1]);
			if(!state.title) {
				state.titleMesh = new TexturedMesh().text(uiFont, "The Cobra Caper");
				state.title = new MeshInstance(ui, state.titleMesh);
			}
			if(!state.player) state.player = new MeshInstance(ui, state.headMesh);
			state.title.draw([100, 100]);
			state.player.draw();
			camera.draw(state.vp.matrix());
			ui.draw(state.vp.pixelMatrix());
		}

		var tmp = [];
		game.fixedStep = function(state, ds) {
			var player = state.player;
			V2.x(player.a, this.arrows(), player.accel);
			player.step(ds, state.walls);
			return state;
		}

		game.key = function(state, key) {
			if(GameMode.arrowKeys[key]) return state;  // eat arrow key events
		}

		game.go();
	});
})();
