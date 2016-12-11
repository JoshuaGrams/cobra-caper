// ------------------------------------------------------------------
// Compute a view matrix which shows the given `area` of the game
// world centered on `center` using the current aspect ratio.

function Viewport(glContext, center, area, kPos, kArea) {
	this.glContext = glContext;
	this.follow = false;
	this.center = center.slice(); this.oldCenter = center.slice();
	this.area = area;   this.oldArea = area;
	if(typeof(kPos) === 'undefined') this.kPos = 0;
	else this.kPos = kPos;
	if(typeof(kArea) === 'undefined') this.kArea = 0;
	else this.kArea = kArea;
	this.matrix();
}

Viewport.prototype.setLimits = function(xMin, yMin, xMax, yMax) {
	if(typeof xMin === 'undefined') delete this.limits;
	else this.limits = { min: [xMin, yMin], max: [xMax, yMax] };
}

Viewport.prototype.matrix = function() {
	if(this.follow && this.follow.p) this.center = this.follow.p;

	if(resized(this.glContext) || !this.view
		|| this.area !== this.oldArea
			|| this.center[0] !== this.oldCenter[0]
			|| this.center[1] !== this.oldCenter[1]) {
				var w = this.glContext.drawingBufferWidth;
				var h = this.glContext.drawingBufferHeight;
				this.aspect = w/h;

				var area = this.oldArea*this.kArea + this.area*(1-this.kArea);
				this.oldArea = area;
				if(area === 0) {
					this.w = w; this.h = -h;  // pixel scale
				} else {
					this.w = Math.sqrt(area*this.aspect);
					this.h = Math.sqrt(area/this.aspect);
				}

				if(this.limits) {
					var xMin = this.limits.min[0] + this.w/2;
					var xMax = this.limits.max[0] - this.w/2;
					if(xMin > xMax) xMin = xMax = (xMin + xMax) / 2;
					var yMin = this.limits.min[1] + this.h/2;
					var yMax = this.limits.max[1] - this.h/2;
					if(yMin > yMax) yMin = yMax = (yMin + yMax) / 2;
					this.center[0] = Math.max(xMin, Math.min(xMax, this.center[0]));
					this.center[1] = Math.max(yMin, Math.min(yMax, this.center[1]));
				}
				var center = V2.lerp([], this.kPos, this.center, this.oldCenter);
				if(isNaN(center[0])) {  // (0, 0) at top left.
					center[0] = this.w/2; center[1] = Math.abs(this.h/2);
				}
				this.oldCenter = center;

				this.view = [
					2/this.w, 0,
					0, 2/this.h,
					-center[0]*2/this.w, -center[1]*2/this.h
				];
				this.pixelView = [
					2/w, 0,
					0, -2/h,
					-1, 1
				];
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
