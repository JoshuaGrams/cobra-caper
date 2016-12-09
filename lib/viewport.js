// ------------------------------------------------------------------
// Compute a view matrix which shows `scale` squared area of the
// game world centered on `center` using the current aspect ratio.

function Viewport(gl, center, scale, kPos, kScale) {
	this.glContext = gl;
	this.follow = false;
	this.center = center; this.oldCenter = [false, false];
	this.scale = scale;   this.oldScale = false;
	if(typeof(kPos) === 'undefined') this.kPos = 0;
	else this.kPos = kPos;
	if(typeof(kScale) === 'undefined') this.kScale = 0;
	else this.kScale = kScale;
	this.matrix();
}

Viewport.prototype.matrix = function() {
	if(this.follow && this.follow.p) this.center = this.follow.p;

	if(resized(this.glContext)
		|| this.oldScale === false || this.scale !== this.oldScale
			|| this.oldCenter[0] === false
			|| this.center[0] !== this.oldCenter[0]
			|| this.center[1] !== this.oldCenter[1]) {
				var w = this.glContext.drawingBufferWidth;
				var h = this.glContext.drawingBufferHeight;

				var scale = this.oldScale*this.kScale + this.scale*(1-this.kScale);
				var center = V2.lerp([], this.kPos, this.center, this.oldCenter);

				var kx, ky;
				if(scale === 0) {
					kx = 2/w, ky = -2/h;  // pixel scale
				} else {
					var k = Math.sqrt(w/h);
					kx = 2/(k*scale), ky = 2*k/scale;
				}
				if(isNaN(center[0])) {  // (0, 0) at top left.
					center[0] = 1/kx; center[1] = Math.abs(1/ky);
				}
				this.view = [
					kx, 0,
					0, ky,
					-center[0]*kx, -center[1]*ky
				];
				this.pixelMatrix = [
					2/w, 0,
					0, -2/h,
					-1, 1
				];
				this.oldScale = scale;
				this.oldCenter = center.slice();

			}
	return this.view;
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
