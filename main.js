(function() {
	var glCtx = WebGL.getContext('main');
	glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);
	glCtx.enable(glCtx.BLEND);

	var textures = LoadImage('textures.png', function() {

		var textureCoords = {
			inconsolata: { x: 0, y: 0, w: 384, h: 78, img: textures },
			head: { x: 0, y: 78, w: 64, h: 48, img: textures },
			body: { x: 66, y: 78, w: 48, h: 48, img: textures },
			wallGradient: { x: 116, y: 78, w: 48, h: 48, img: textures }
		};

		var ui = new TexturedLayer(glCtx, textures);
		var uiFont = ui.font().addCharacters(32, 127, 32, 3,
			textureCoords.inconsolata);
		var title = new TexturedMesh().text(uiFont, "The Cobra Caper");

		var camera = new TexturedLayer(glCtx, ui.img);
		var head = new TexturedMesh().rectangle(0.24, 0.18, textureCoords.head)
		var body = new TexturedMesh().rectangle(0.18, 0.18, textureCoords.body);

		var innerTopLeft = [-8, 4.5], innerTopRight = [8, 4.5];
		var innerBottomLeft = [-8, -4.5], innerBottomRight = [8, -4.5];
		var outerTopLeft = [-8.5, 5], outerTopRight = [8.5, 5];
		var outerBottomLeft = [-8.5, -5], outerBottomRight = [8.5, 5];

		// View area and margin to show outside arena.
		var viewArea = 16*9, margin = 1.5;
		// Arena width/height, wall width (thickness)
		var aw = 17, ah = 8, ww = 0.5;
		var hWall = new TexturedMesh().quad(
			[-aw/2-ww, ww], [aw/2+ww, ww], [-aw/2, 0], [aw/2, 0],
			textureCoords.wallGradient);
		var vWall = new TexturedMesh().quad(
			[-ah/2-ww, ww], [ah/2+ww, ww], [-ah/2, 0], [ah/2, 0],
			textureCoords.wallGradient);

		// ------------------------------------------------------------

		var initialState = {
			vp: new Viewport(glCtx, [0, 0], viewArea, 0.95),
			ui: ui, uiFont: uiFont,
			title: new MeshInstance(ui, title),
			player: new Player(camera, head, body, 0.09, 7.5, 0.008),
			walls: [
				{ start: [aw/2, -ah/2], end: [aw/2, ah/2],
					sprite: new MeshInstance(camera, vWall, [aw/2, 0], -Math.PI/2) },
				{ start: [-aw/2, -ah/2], end: [-aw/2, ah/2],
					sprite: new MeshInstance(camera, vWall, [-aw/2, 0], Math.PI/2) },
				{ start: [-aw/2, ah/2], end: [aw/2, ah/2],
					sprite: new MeshInstance(camera, hWall, [0, ah/2]) },
				{ start: [-aw/2, -ah/2], end: [aw/2, -ah/2],
					sprite: new MeshInstance(camera, hWall, [0, -ah/2], Math.PI) }
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
			for(var i=0; i<state.walls.length; ++i) {
				if(state.walls[i].sprite) {
					console.log(state.walls[i].sprite);
					state.walls[i].sprite.draw();
				}
			}
			state.player.draw();

			var c = state.vp.center;
			V2.copy(c, state.player.transform.position);
			// margins
			var hm = state.vp.kx / 2 - margin;
			var vm = state.vp.ky / 2 - margin;
			c[0] = Math.max(-aw/2+hm, Math.min(aw/2-hm, c[0]));
			c[1] = Math.max(-ah/2+vm, Math.min(ah/2-vm, c[1]));
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
