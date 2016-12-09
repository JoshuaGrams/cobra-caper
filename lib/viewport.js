// ------------------------------------------------------------------
// Compute a view matrix which shows the given `area` of the game
// world centered on `center` using the current aspect ratio.

function Viewport(glContext, center, area, kPos, kArea) {
	this.glContext = glContext;
	this.follow = false;
	this.center = center; this.oldCenter = [false, false];
	this.area = area;   this.oldArea = false;
	if(typeof(kPos) === 'undefined') this.kPos = 0;
	else this.kPos = kPos;
	if(typeof(kArea) === 'undefined') this.kArea = 0;
	else this.kArea = kArea;
	this.matrix();
}

Viewport.prototype.matrix = function() {
	if(this.follow && this.follow.p) this.center = this.follow.p;

	if(resized(this.glContext)
		|| this.oldArea === false || this.area !== this.oldArea
			|| this.oldCenter[0] === false
			|| this.center[0] !== this.oldCenter[0]
			|| this.center[1] !== this.oldCenter[1]) {
				var w = this.glContext.drawingBufferWidth;
				var h = this.glContext.drawingBufferHeight;

				var area = this.oldArea*this.kArea + this.area*(1-this.kArea);
				var center = V2.lerp([], this.kPos, this.center, this.oldCenter);

				var kx, ky;
				if(area === 0) {
					kx = 2/w, ky = -2/h;  // pixel scale
				} else {
					var aspect = w/h;
					kx = 2 / Math.sqrt(area*aspect);
					ky = 2 / Math.sqrt(area/aspect);
				}
				if(isNaN(center[0])) {  // (0, 0) at top left.
					center[0] = 1/kx; center[1] = Math.abs(1/ky);
				}
				this.view = [
					kx, 0,
					0, ky,
					-center[0]*kx, -center[1]*ky
				];
				this.pixelView = [
					2/w, 0,
					0, -2/h,
					-1, 1
				];
				this.oldArea = area;
				this.oldCenter = center.slice();

			}
	return this.view;
}

Viewport.prototype.pixelMatrix = function() {
	this.matrix();
	return this.pixelView;
}

// If the canvas has been resized, update the drawing resolution,
// the GL viewport, and return true.
function resized(glContext) {
	var canvas = glContext.canvas;
	var w = canvas.clientWidth, h = canvas.clientHeight;
	var changed = (canvas.width != w || canvas.height != h);
	if(changed) {
		canvas.width = w;  canvas.height = h;
		glContext.viewport(0, 0, w, h);
	}
	return changed;
}
