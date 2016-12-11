// Arrays as vectors (and arrays of row vectors as matrices)

var V2 = {};
V2.copy = function(r, v) { r[0] = v[0];  r[1] = v[1];  return r; }
V2.add = function(r, a, b) { r[0] = a[0] + b[0];  r[1] = a[1] + b[1];  return r; };
V2.sub = function(r, a, b) { r[0] = a[0] - b[0];  r[1] = a[1] - b[1];  return r; };
V2.x = function(r, a, s) { r[0] = a[0] * s;  r[1] = a[1] * s;  return r; };
V2.lerp = function(r, t, u, v) {
	var s = 1-t;
	r[0] = s*u[0] + t*v[0];
	r[1] = s*u[1] + t*v[1];
	return r;
};

V2.dot = function(a, b) { return a[0] * b[0]  +  a[1] * b[1]; };
V2.length_squared = function(v) { return v[0]*v[0] + v[1]*v[1]; };
V2.length = function(v) { return Math.sqrt(v[0]*v[0] + v[1]*v[1]); };
V2.normalize = function(v) {
	var len = Math.sqrt(v[0]*v[0] + v[1]*v[1]);
	v[0] /= len;  v[1] /= len;
	return v;
};

V2.rotate = function(v, radians) {
	var rx = Math.cos(radians), ry = Math.sin(radians);
	x = v[0];  y = v[1];
	// x coordinate times rotated x vector,
	// plus y coordinate times rotated y vector
	v[0] = x*rx - y*ry;
	v[1] = x*ry + y*rx;
	return v;
}
V2.angle = function(v) { return Math.atan2(v[1], v[0]); }
V2.perp2d = function(v) {
	var x = v[0], y = v[1];
	v[0] = -y;  v[1] = x;
	return v;
}

V2.inc = function(a, b) { a[0] += b[0];  a[1] += b[1];  return a; };
V2.dec = function(a, b) { a[0] -= b[0];  a[1] -= b[1];  return a; };
V2.scale = function(a, s) { a[0] *= s;  a[1] *= s;  return a; };

V2.transform = function(v, m) {
	var x = v[0], y = v[1];
	v[0] = x * m[0] + y * m[2] + m[4];
	v[1] = x * m[1] + y * m[3] + m[5];
}

V2.transformDirection = function(v, m) {
	var x = v[0], y = v[1];
	v[0] = x * m[0] + y * m[2]; // + 0 * m[4];
	v[1] = x * m[1] + y * m[3]; // + 0 * m[5];
}


var M3x2 = {};

M3x2.x = function(m, n) {
	var Xx = m[0], Xy = m[1];  // x vector
	var Yx = m[2], Yy = m[3];  // y vector
	var Ox = m[4], Oy = m[5];  // origin

	// transform x vector
	m[0] = Xx * n[0] + Xy * n[2]; // + 0 * n[4]
	m[1] = Xx * n[1] + Xy * n[3]; // + 0 * n[5]
	// transform y vector
	m[2] = Yx * n[0] + Yy * n[2]; // + 0 * n[4]
	m[3] = Yx * n[1] + Yy * n[3]; // + 0 * n[5]
	// transform origin
	m[4] = Ox * n[0] + Oy * n[2] + n[4];
	m[5] = Ox * n[1] + Oy * n[3] + n[5];

	return m;
};

M3x2.toFloat32 = function(m, transpose) {
	if (!m.Float32) m.Float32 = new Float32Array(9);
	var a = m.Float32;
	if(transpose) {
		var i=0;
		a[i++] = m[0]; a[i++] = m[2]; a[i++] = m[4];
		a[i++] = m[1]; a[i++] = m[3]; a[i++] = m[5];
		a[i++] =  0;   a[i++] =  0;   a[i++] =  1;
	} else {
		var i=0;
		a[i++] = m[0]; a[i++] = m[1]; a[i++] = 0;
		a[i++] = m[2]; a[i++] = m[3]; a[i++] = 0;
		a[i++] = m[4]; a[i++] = m[5]; a[i++] = 1;
	}
	return a;
};

M3x2.scale = function(sx, sy) {
	if(!sy) sy = sx;
	return [sx, 0,  sy, 0,  0, 0];
}

M3x2.rotation = function(radians) {
	var rx = Math.cos(radians), ry = Math.sin(radians);
	return [rx, ry,  -ry, rx,  0, 0];
}

M3x2.translation = function(x, y) {
	return [1, 0,  0, 1,  x, y];
}

M3x2.transform = function(position, rotation, scale) {
	if(!scale) scale = [1, 1];
	else if(!scale[0]) scale = [scale, scale];

	rotation = rotation || 0;
	var rx = Math.cos(rotation), ry = Math.sin(rotation);

	return [
		rx*scale[0], ry*scale[0],
		-ry*scale[1], rx*scale[1],
		position[0], position[1]
	];
}

M3x2.parameters = function(m) {
	var radians;
	if(Math.abs(m[0]*m[1] + m[2]*m[3]) > 0.0001) radians = false;
	else radians = Math.atan2(m[1], m[3]);

	var sx = Math.sign(m[0]) * Math.sqrt(m[0]*m[0] + m[2]*m[2]);
	var sy = Math.sign(m[1]) * Math.sqrt(m[1]*m[1] + m[3]*m[3]);

	return {
		position: [m[4], m[5]],
		rotation: radians,
		scale: [sx, sy]
	};
}



function Transform2D(position, rotation, scale) {
	this.position = position || [0, 0];
	this.rotation = rotation || 0;
	this.scale = scale || 1;
	this.m = false;
}

Transform2D.prototype.set = function(position, rotation, scale) {
	if(typeof position !== "undefined") {
		this.position = position;
		this.m = false;
	}
	if(typeof rotation !== "undefined") {
		this.rotation = rotation || 0;
		this.m = false;
	}
	if(typeof scale !== "undefined") {
		this.scale = scale || 1;
		this.m = false;
	}
}

Transform2D.prototype.setPosition = function(position) {
	this.position = position;
	this.m = false;
}

Transform2D.prototype.setRotation = function(radians) {
	this.rotation = radians || 0;
	this.m = false;
}

Transform2D.prototype.setScale = function(sx, sy) {
	sx = sx || 1;
	this.scale = sy ?  [sx, sy] : sx;
	this.m = false;
}

Transform2D.prototype.move = function(dp) {
	V2.add(this.position, this.position, dp);
	this.m = false;
}

Transform2D.prototype.matrix = function() {
	if(this.m === false) {
		this.m = M3x2.transform(this.position, this.rotation, this.scale);
	}
	return this.m;
}



// distance from `x` to the line segment from `p` to `q`.
function pointToSegmentDistance(x, p, q) {
	var tmp = pointToSegmentDistance.tmp;
	var v = V2.sub(pointToSegmentDistance.v, q, p);
	var offset = V2.sub(tmp, x, p);
	// fraction along line segment
	var t = Math.max(0, Math.min(1, V2.dot(offset, v) / V2.dot(v, v)));
	// nearest point on line segment
	var r = V2.add(tmp, p, V2.x(tmp, v, t));
	// distance from r to x
	return V2.length(V2.sub(r, r, x));
}
pointToSegmentDistance.tmp = [];  // temporary vectors
pointToSegmentDistance.v = [];

// bounce velocity `v` off the line segment from `p` to `q`.
// Note: modifies `v`.
function bounceFromSegment(v, p, q) {
	var n = V2.normalize(V2.perp2d(V2.sub(bounceFromSegment.n, q, p)));
	var approachSpeed = V2.dot(n, v);
	return V2.sub(v, v, V2.x(n, n, 2 * approachSpeed));
}
bounceFromSegment.n = [];  // temporary vector



if(typeof exports !== 'undefined') {
	exports.V2 = V2;
    exports.M3x2 = M3x2;
	exports.Transform2D = Transform2D;
}
